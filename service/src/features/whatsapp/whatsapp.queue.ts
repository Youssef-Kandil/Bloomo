/**
 * WhatsApp outbound queue with provider switching.
 *
 * Provider modes:
 *   - "cloud" → Meta WhatsApp Business Cloud API (recommended, official)
 *   - "stub"  → no real send; messages are immediately marked SENT (dev)
 *   - "web"   → whatsapp-web.js (legacy, broken with current WhatsApp)
 *
 * The queue still applies anti-flood throttling for any provider.
 */

import { env } from '@/config/env';
import { prisma } from '@/config/prisma';
import { type WaClient } from '@/lib/whatsapp-client';
import { whatsappCloud } from '@/lib/whatsapp-cloud';

import { whatsappModel } from './whatsapp.model';
import { isMarketing, renderTemplate, type WaTemplateKey } from './whatsapp.templates';

interface EnqueuePayload {
  [key: string]: unknown;
}

interface ClientLookup {
  companyId: string;
  toPhone: string;
  locale: 'ar' | 'en';
  clientId: string | null;
  name: string | null;
  marketingOptIn: boolean;
}

const activeWebClients = new Map<string, WaClient>();
const workingCompanies = new Set<string>();

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}
function jitter(): number {
  return rand(env.WHATSAPP_MIN_DELAY_MS, env.WHATSAPP_MAX_DELAY_MS);
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function resolveClient(clientId: string): Promise<ClientLookup | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { phones: true },
  });
  if (!client) return null;
  const wa = client.phones.find((p) => p.isWhatsapp);
  if (!wa) return null;
  return {
    companyId: client.companyId,
    toPhone: wa.phone,
    locale: 'ar',
    clientId: client.id,
    name: client.name,
    marketingOptIn: client.marketingOptIn,
  };
}

async function resolveEmployee(employeeId: string): Promise<{ companyId: string; toPhone: string; name: string } | null> {
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: { include: { company: true } } },
  });
  if (!emp || !emp.user.whatsappPhone || !emp.user.companyId) return null;
  return { companyId: emp.user.companyId, toPhone: emp.user.whatsappPhone, name: emp.user.name };
}

export const whatsappQueue = {
  enqueueForClient(clientId: string, template: WaTemplateKey, payload: EnqueuePayload = {}): void {
    void (async () => {
      const c = await resolveClient(clientId);
      if (!c) return;
      if (isMarketing(template) && !c.marketingOptIn) return;
      const body = renderTemplate(template, { locale: c.locale, clientName: c.name ?? '', ...payload });
      await whatsappModel.enqueueMessage({
        companyId: c.companyId,
        clientId: c.clientId,
        requestId: typeof payload.requestId === 'string' ? payload.requestId : null,
        toPhone: c.toPhone,
        body,
        template,
      });
      workCompany(c.companyId);
    })();
  },

  enqueueForEmployee(employeeId: string, template: WaTemplateKey, payload: EnqueuePayload = {}): void {
    void (async () => {
      const e = await resolveEmployee(employeeId);
      if (!e) return;
      const body = renderTemplate(template, {
        locale: 'ar',
        employeeName: e.name,
        ...payload,
      });
      await whatsappModel.enqueueMessage({
        companyId: e.companyId,
        clientId: null,
        requestId: typeof payload.requestId === 'string' ? payload.requestId : null,
        toPhone: e.toPhone,
        body,
        template,
      });
      workCompany(e.companyId);
    })();
  },

  async enqueueOtp(
    companyId: string,
    toPhone: string,
    template: Extract<WaTemplateKey, 'OTP_VERIFY' | 'EMP_OTP_VERIFY'>,
    code: string,
  ): Promise<void> {
    const body = renderTemplate(template, { locale: 'ar', code });
    await whatsappModel.enqueueMessage({
      companyId,
      clientId: null,
      requestId: null,
      toPhone,
      body,
      template,
    });
    workCompany(companyId);
  },

  async enqueueBroadcast(
    companyId: string,
    recipients: Array<{ clientId: string; toPhone: string; name: string }>,
    text: string,
    senderUserId: string,
  ): Promise<number> {
    const messages = recipients.map((r) => ({
      companyId,
      clientId: r.clientId,
      requestId: null,
      toPhone: r.toPhone,
      body: renderTemplate('BROADCAST', { locale: 'ar', broadcastText: `${r.name}،\n${text}` }),
      template: 'BROADCAST' as const,
      sentByUserId: senderUserId,
    }));
    for (const m of messages) {
      await whatsappModel.enqueueMessage(m);
    }
    workCompany(companyId);
    return messages.length;
  },

  /** Manual trigger — used by Cloud mode init and "Send test" UI button. */
  drainNow(companyId: string): void {
    workCompany(companyId);
  },

  // ---- Legacy web-mode adapter (kept for compatibility) ----
  async registerClient(companyId: string, client: WaClient): Promise<void> {
    activeWebClients.set(companyId, client);
    workCompany(companyId);
  },

  unregisterClient(companyId: string): void {
    const client = activeWebClients.get(companyId);
    activeWebClients.delete(companyId);
    void client?.destroy().catch(() => undefined);
  },

  getClient(companyId: string): WaClient | undefined {
    return activeWebClients.get(companyId);
  },
};

function workCompany(companyId: string): void {
  if (workingCompanies.has(companyId)) return;
  workingCompanies.add(companyId);
  void drain(companyId).finally(() => workingCompanies.delete(companyId));
}

function warmupDailyCap(connectedAt: Date | null): number {
  if (env.WHATSAPP_PROVIDER === 'cloud') return env.WHATSAPP_DAILY_CAP_DEFAULT; // Meta enforces its own quotas
  if (!connectedAt) return env.WHATSAPP_DAILY_CAP_DEFAULT;
  const ageDays = (Date.now() - connectedAt.getTime()) / (24 * 60 * 60 * 1000);
  if (ageDays < 3) return 20;
  if (ageDays < 7) return 100;
  return env.WHATSAPP_DAILY_CAP_DEFAULT;
}

async function dispatchOne(
  companyId: string,
  queued: { id: string; toPhone: string; body: string },
): Promise<void> {
  if (env.WHATSAPP_PROVIDER === 'stub') {
    console.info(`[whatsapp:stub] would send to ${queued.toPhone}: ${queued.body.slice(0, 80)}…`);
    await whatsappModel.updateStatus(queued.id, 'SENT');
    return;
  }

  if (env.WHATSAPP_PROVIDER === 'cloud') {
    if (!whatsappCloud.isConfigured()) {
      throw new Error('Cloud API not configured (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN missing).');
    }
    const result = await whatsappCloud.sendText(queued.toPhone, queued.body);
    await prisma.whatsappMessage.update({
      where: { id: queued.id },
      data: { status: 'SENT', externalId: result.externalId, sentAt: new Date(), error: null },
    });
    return;
  }

  // 'web' provider (Baileys)
  const client = activeWebClients.get(companyId);
  if (!client || !client.isReady()) {
    throw new Error('WhatsApp session not ready — pair your phone first.');
  }
  await client.sendTyping(queued.toPhone, rand(1000, 3000));
  const result = await client.sendText(queued.toPhone, queued.body);
  await prisma.whatsappMessage.update({
    where: { id: queued.id },
    data: {
      status: 'SENT',
      externalId: result.externalId || null,
      sentAt: new Date(),
      error: null,
    },
  });
}

async function drain(companyId: string): Promise<void> {
  // For web mode require an active client. For cloud/stub we proceed unconditionally.
  if (env.WHATSAPP_PROVIDER === 'web') {
    const client = activeWebClients.get(companyId);
    if (!client || !client.isReady()) return;
  }

  let sentInBatch = 0;
  let sentInBigBatch = 0;

  while (true) {
    const session = await whatsappModel.getSession(companyId);
    if (env.WHATSAPP_PROVIDER === 'web' && session?.status !== 'CONNECTED') return;
    if (session?.healthState === 'BANNED_SUSPECTED') return;
    if (session?.throttledUntil && session.throttledUntil.getTime() > Date.now()) return;

    const dailyCap = warmupDailyCap(session?.connectedAt ?? null);
    const windowStart =
      session?.dailyWindowStart && Date.now() - session.dailyWindowStart.getTime() < 24 * 60 * 60 * 1000
        ? session.dailyWindowStart
        : new Date();
    const dailyCount = await whatsappModel.countDaily(companyId, windowStart);
    if (dailyCount >= dailyCap) return;

    const queued = await whatsappModel.pickNextQueued(companyId);
    if (!queued) return;

    try {
      await dispatchOne(companyId, queued);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      console.error(`[whatsapp] send failed (msg=${queued.id}):`, message);
      await whatsappModel.updateStatus(queued.id, 'FAILED', message);
      const fails = await whatsappModel.recentFailCount(companyId, 2 * 60_000);
      if (fails >= 5) {
        await whatsappModel.setHealth(companyId, 'THROTTLED', new Date(Date.now() + 30 * 60_000));
        return;
      }
    }

    sentInBatch += 1;
    sentInBigBatch += 1;
    await sleep(jitter());
    if (env.WHATSAPP_PROVIDER === 'web') {
      if (sentInBatch >= 10) {
        sentInBatch = 0;
        await sleep(rand(30_000, 90_000));
      }
      if (sentInBigBatch >= 50) {
        sentInBigBatch = 0;
        await sleep(rand(5 * 60_000, 15 * 60_000));
      }
    }
  }
}
