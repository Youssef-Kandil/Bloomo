import crypto from 'node:crypto';

import { env } from '@/config/env';
import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';
import { createWaClient } from '@/lib/whatsapp-client';
import { whatsappCloud } from '@/lib/whatsapp-cloud';

import { whatsappModel } from './whatsapp.model';
import { whatsappQueue } from './whatsapp.queue';

interface SessionEventBus {
  emitQr(companyId: string, qr: string): void;
  emitStatus(companyId: string, status: string): void;
}

let bus: SessionEventBus = {
  emitQr: () => undefined,
  emitStatus: () => undefined,
};

export function setWhatsappEventBus(newBus: SessionEventBus): void {
  bus = newBus;
}

export const whatsappService = {
  async status(companyId: string) {
    const session = await whatsappModel.getSession(companyId);
    return {
      session,
      provider: env.WHATSAPP_PROVIDER,
      cloudConfigured: whatsappCloud.isConfigured(),
    };
  },

  async pair(companyId: string) {
    if (env.WHATSAPP_PROVIDER === 'cloud') {
      if (!whatsappCloud.isConfigured()) {
        throw AppError.badRequest(
          'Cloud API not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in service/.env',
        );
      }
      await whatsappModel.upsertSession(companyId, {
        status: 'CONNECTED',
        connectedAt: new Date(),
        lastSeenAt: new Date(),
        healthState: 'HEALTHY',
        throttledUntil: null,
        lastQrCode: null,
        phoneNumber: env.WHATSAPP_PHONE_NUMBER_ID ?? null,
      });
      whatsappQueue.drainNow(companyId);
      return { status: 'CONNECTED', provider: 'cloud' };
    }

    if (env.WHATSAPP_PROVIDER === 'stub') {
      await whatsappModel.upsertSession(companyId, {
        status: 'CONNECTED',
        connectedAt: new Date(),
        healthState: 'HEALTHY',
        phoneNumber: 'STUB',
      });
      whatsappQueue.drainNow(companyId);
      return { status: 'CONNECTED', provider: 'stub' };
    }

    // legacy 'web' provider
    const existing = whatsappQueue.getClient(companyId);
    if (existing) {
      whatsappQueue.unregisterClient(companyId);
    }
    await whatsappModel.setStatus(companyId, 'PAIRING', { lastQrAt: new Date() });

    const client = await createWaClient(companyId, {
      qr: (cid, qr) => {
        console.info(`[whatsapp] QR generated for company ${cid}`);
        bus.emitQr(cid, qr);
        void whatsappModel.upsertSession(cid, {
          lastQrAt: new Date(),
          lastQrCode: qr,
          status: 'PAIRING',
        });
      },
      ready: (cid, phone) => {
        console.info(`[whatsapp] session READY for company ${cid} (phone=${phone})`);
        bus.emitStatus(cid, 'CONNECTED');
        void whatsappModel.upsertSession(cid, {
          status: 'CONNECTED',
          phoneNumber: phone,
          connectedAt: new Date(),
          lastSeenAt: new Date(),
          healthState: 'HEALTHY',
          throttledUntil: null,
          lastQrCode: null,
        });
      },
      disconnected: (cid) => {
        bus.emitStatus(cid, 'DISCONNECTED');
        void whatsappModel.upsertSession(cid, { status: 'DISCONNECTED' });
        whatsappQueue.unregisterClient(cid);
      },
      authFailure: (cid, message) => {
        bus.emitStatus(cid, 'BANNED_SUSPECTED');
        void whatsappModel.upsertSession(cid, {
          status: 'DISCONNECTED',
          healthState: 'BANNED_SUSPECTED',
        });
        void prisma.auditLog.create({
          data: { userId: null, action: 'whatsapp.auth_failure', target: cid, meta: { message } },
        });
      },
      messageStatus: (cid, externalId, statusMapped) => {
        void prisma.whatsappMessage
          .updateMany({
            where: { companyId: cid, externalId },
            data: {
              status: statusMapped,
              ...(statusMapped === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
              ...(statusMapped === 'READ' ? { readAt: new Date() } : {}),
            },
          })
          .catch(() => undefined);
      },
    });
    // Register the client immediately so requestPairingCode can find it during init.
    // The queue's drain() guards on isReady() so no messages will be sent prematurely.
    await whatsappQueue.registerClient(companyId, client);

    // Don't block the HTTP response — init can take 10–30s (puppeteer launch + WA Web load).
    // The qr event fires during init and is persisted so the frontend status poll can render it.
    client.init().catch((err) => {
      console.error(`[whatsapp] init failed for company ${companyId}:`, err);
      void whatsappModel.upsertSession(companyId, { status: 'DISCONNECTED' });
    });
    return { status: 'PAIRING' };
  },

  async requestPairingCode(companyId: string, phoneNumber: string): Promise<{ code: string }> {
    if (env.WHATSAPP_PROVIDER !== 'web') {
      throw AppError.badRequest('Pairing code is only available with WHATSAPP_PROVIDER=web (legacy).');
    }
    const client = whatsappQueue.getClient(companyId);
    if (!client) {
      throw AppError.badRequest('No active WhatsApp session — click Pair first, then wait ~10 seconds.');
    }
    const code = await client.requestPairingCode(phoneNumber);
    return { code };
  },

  async sendTest(companyId: string, toPhone: string, body: string): Promise<{ externalId: string | null }> {
    if (env.WHATSAPP_PROVIDER === 'cloud') {
      if (!whatsappCloud.isConfigured()) {
        throw AppError.badRequest('Cloud API not configured.');
      }
      const result = await whatsappCloud.sendText(toPhone, body);
      await prisma.whatsappMessage.create({
        data: {
          companyId,
          toPhone,
          body,
          template: 'CUSTOM',
          status: 'SENT',
          externalId: result.externalId,
          sentAt: new Date(),
        },
      });
      return { externalId: result.externalId };
    }
    if (env.WHATSAPP_PROVIDER === 'stub') {
      console.info(`[whatsapp:stub] test send to ${toPhone}: ${body}`);
      await prisma.whatsappMessage.create({
        data: {
          companyId,
          toPhone,
          body,
          template: 'CUSTOM',
          status: 'SENT',
          sentAt: new Date(),
        },
      });
      return { externalId: null };
    }
    // web / Baileys — enqueue directly through the queue so throttling applies
    const client = whatsappQueue.getClient(companyId);
    if (!client || !client.isReady()) {
      throw AppError.badRequest('Not paired. Scan the QR / enter pairing code first.');
    }
    const msg = await prisma.whatsappMessage.create({
      data: { companyId, toPhone, body, template: 'CUSTOM' },
    });
    whatsappQueue.drainNow(companyId);
    return { externalId: msg.id };
  },

  async disconnect(companyId: string) {
    whatsappQueue.unregisterClient(companyId);
    await whatsappModel.setStatus(companyId, 'DISCONNECTED');
    return { ok: true };
  },

  async resetSession(companyId: string) {
    whatsappQueue.unregisterClient(companyId);
    // Delete persisted auth files so next pair() starts fresh.
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const dir = path.resolve(env.WHATSAPP_SESSION_DIR, companyId);
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    await whatsappModel.upsertSession(companyId, {
      status: 'DISCONNECTED',
      phoneNumber: null,
      connectedAt: null,
      lastQrCode: null,
      healthState: 'HEALTHY',
      throttledUntil: null,
    });
    return { ok: true };
  },

  async listMessages(companyId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await whatsappModel.listMessages(companyId, {}, skip, pageSize);
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  async broadcast(companyId: string, filter: { allOptedIn: boolean }, text: string, senderUserId: string) {
    if (!text.includes('\n') && text.length < 10) {
      throw AppError.badRequest('Broadcast message is too short');
    }
    const clients = await prisma.client.findMany({
      where: {
        companyId,
        ...(filter.allOptedIn ? { marketingOptIn: true } : {}),
        phones: { some: { isWhatsapp: true, whatsappVerifiedAt: { not: null } } },
      },
      select: { id: true, name: true, phones: { where: { isWhatsapp: true } } },
    });
    const recipients = clients
      .map((c) => ({ clientId: c.id, toPhone: c.phones[0]?.phone ?? '', name: c.name }))
      .filter((r) => r.toPhone);
    const count = await whatsappQueue.enqueueBroadcast(companyId, recipients, text, senderUserId);
    return { enqueued: count };
  },
};

// --------- OTP (sub-feature lives here to keep the folder cohesive) ---------

const OTP_TTL_MS = 5 * 60_000;

function generateOtpCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export const otpService = {
  async send(opts: {
    phone: string;
    purpose: 'CLIENT_PHONE_VERIFY' | 'EMPLOYEE_PHONE_VERIFY';
    companyId: string;
    relatedId: string;
  }) {
    const recentCount = await prisma.otpCode.count({
      where: {
        targetPhone: opts.phone,
        purpose: opts.purpose,
        createdAt: { gte: new Date(Date.now() - 10 * 60_000) },
      },
    });
    if (recentCount >= 3) throw AppError.tooMany('Too many OTP requests');

    const code = generateOtpCode();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    await prisma.otpCode.create({
      data: {
        channel: 'WHATSAPP',
        purpose: opts.purpose,
        targetPhone: opts.phone,
        codeHash,
        relatedId: opts.relatedId,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });
    const template = opts.purpose === 'CLIENT_PHONE_VERIFY' ? 'OTP_VERIFY' : 'EMP_OTP_VERIFY';
    await whatsappQueue.enqueueOtp(opts.companyId, opts.phone, template, code);
    return { ok: true };
  },

  async verify(opts: {
    phone: string;
    purpose: 'CLIENT_PHONE_VERIFY' | 'EMPLOYEE_PHONE_VERIFY';
    code: string;
  }) {
    const codeHash = crypto.createHash('sha256').update(opts.code).digest('hex');
    const row = await prisma.otpCode.findFirst({
      where: {
        targetPhone: opts.phone,
        purpose: opts.purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) throw AppError.badRequest('Invalid or expired code');
    if (row.attempts >= 5) throw AppError.tooMany('Too many attempts');
    if (row.codeHash !== codeHash) {
      await prisma.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
      throw AppError.badRequest('Invalid code');
    }
    await prisma.otpCode.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });

    if (opts.purpose === 'CLIENT_PHONE_VERIFY' && row.relatedId) {
      await prisma.clientPhone.update({
        where: { id: row.relatedId },
        data: { whatsappVerifiedAt: new Date() },
      });
    }
    if (opts.purpose === 'EMPLOYEE_PHONE_VERIFY' && row.relatedId) {
      await prisma.user.update({
        where: { id: row.relatedId },
        data: { whatsappPhone: opts.phone, whatsappVerifiedAt: new Date() },
      });
    }
    return { ok: true };
  },
};
