/**
 * Per-company WhatsApp adapter using Baileys.
 *
 * Each company pairs its own number via QR scan or pairing code, and the
 * session is persisted in `service/.wa-sessions/<companyId>/` so restarts
 * don't require re-pairing.
 *
 * Kept behind a small `WaClient` interface so the rest of the codebase
 * (queue, service, webhook) never touches Baileys internals directly.
 */

import path from 'node:path';

import { env } from '@/config/env';

export type WaClientEvents = {
  qr: (companyId: string, qr: string) => void;
  ready: (companyId: string, phoneNumber: string) => void;
  disconnected: (companyId: string, reason: string) => void;
  authFailure: (companyId: string, message: string) => void;
  messageStatus: (companyId: string, externalId: string, status: 'DELIVERED' | 'READ' | 'FAILED') => void;
};

export interface WaSendResult {
  externalId: string;
}

export interface WaClient {
  init(): Promise<void>;
  destroy(): Promise<void>;
  isReady(): boolean;
  requestPairingCode(phoneNumber: string): Promise<string>;
  sendText(phone: string, body: string): Promise<WaSendResult>;
  sendTyping(phone: string, ms: number): Promise<void>;
}

type Factory = (companyId: string, listeners: WaClientEvents) => WaClient;

let cachedFactory: Factory | null = null;

function sessionDir(companyId: string): string {
  return path.resolve(env.WHATSAPP_SESSION_DIR, companyId);
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

function jidFor(phone: string): string {
  return `${digitsOnly(phone)}@s.whatsapp.net`;
}

async function loadRealFactory(): Promise<Factory> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const baileys = require('@whiskeysockets/baileys') as typeof import('@whiskeysockets/baileys');
  const makeWASocket = baileys.default;
  const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = baileys;

  return (companyId, listeners) => {
    type Sock = ReturnType<typeof makeWASocket>;
    let sock: Sock | null = null;
    let ready = false;
    let initPromise: Promise<void> | null = null;

    async function start(): Promise<void> {
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir(companyId));
      const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

      sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Bloomo'),
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          listeners.qr(companyId, qr);
        }

        if (connection === 'open') {
          ready = true;
          const me = sock?.user;
          const phone = me?.id?.split(':')[0]?.split('@')[0] ?? '';
          listeners.ready(companyId, phone);
        }

        if (connection === 'close') {
          ready = false;
          const code = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output
            ?.statusCode;
          const shouldReconnect = code !== DisconnectReason.loggedOut;
          const reason = lastDisconnect?.error?.message ?? `code=${code}`;

          if (code === DisconnectReason.loggedOut) {
            listeners.authFailure(companyId, 'Logged out from phone');
          } else {
            listeners.disconnected(companyId, reason);
          }

          if (shouldReconnect) {
            // reconnect in the background; errors are non-fatal
            void start().catch((err) => {
              console.error(`[baileys:${companyId}] reconnect failed:`, err);
            });
          }
        }
      });

      sock.ev.on('messages.update', (updates) => {
        for (const u of updates) {
          const id = u.key.id;
          if (!id) continue;
          const statusNum = u.update.status;
          const map: Record<number, 'DELIVERED' | 'READ' | 'FAILED'> = {
            3: 'DELIVERED',
            4: 'READ',
            5: 'READ',
            0: 'FAILED',
          };
          const mapped =
            statusNum !== undefined && statusNum !== null ? map[statusNum as number] : undefined;
          if (mapped) listeners.messageStatus(companyId, id, mapped);
        }
      });
    }

    return {
      init() {
        if (!initPromise) initPromise = start();
        return initPromise;
      },
      async destroy() {
        try {
          sock?.end(undefined);
        } catch {
          /* swallow — destroy must not throw */
        }
        sock = null;
        ready = false;
        initPromise = null;
      },
      isReady() {
        return ready;
      },
      async requestPairingCode(phoneNumber: string) {
        if (!sock) throw new Error('Socket not initialized — call init() first');
        const digits = digitsOnly(phoneNumber);
        if (digits.length < 8) throw new Error('Invalid phone number');
        if (sock.authState.creds.registered) {
          throw new Error('Already paired');
        }
        const code = await sock.requestPairingCode(digits);
        return code;
      },
      async sendText(phone, body) {
        if (!sock || !ready) throw new Error('Socket not ready');
        const result = await sock.sendMessage(jidFor(phone), { text: body });
        return { externalId: result?.key?.id ?? '' };
      },
      async sendTyping(phone, ms) {
        if (!sock || !ready) return;
        const jid = jidFor(phone);
        try {
          await sock.sendPresenceUpdate('composing', jid);
          await new Promise((r) => setTimeout(r, ms));
          await sock.sendPresenceUpdate('paused', jid);
        } catch {
          /* best-effort — never fail the send because of typing UX */
        }
      },
    };
  };
}

/** Set a factory during tests / DI. */
export function setWaClientFactory(factory: Factory): void {
  cachedFactory = factory;
}

export async function createWaClient(
  companyId: string,
  listeners: WaClientEvents,
): Promise<WaClient> {
  const factory = cachedFactory ?? (await loadRealFactory());
  return factory(companyId, listeners);
}
