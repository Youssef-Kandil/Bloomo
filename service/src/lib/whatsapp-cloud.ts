/**
 * WhatsApp Business Cloud API adapter (Meta official).
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Limits to be aware of:
 * - Free tier covers ~1000 conversations/month per business.
 * - Free-form text messages can ONLY be sent inside a 24h customer-service
 *   window opened by an inbound message from the recipient.
 * - Outside the window you must use a pre-approved template (HSM).
 * - Authentication / OTP messages have a special pre-approved template type.
 */

import { env } from '@/config/env';
import { AppError } from '@/lib/http-error';

export interface CloudSendResult {
  externalId: string;
  status: 'accepted';
}

export interface IncomingMessage {
  from: string;
  text: string;
  messageId: string;
  timestamp: Date;
}

export interface StatusUpdate {
  externalId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  recipientPhone: string;
  timestamp: Date;
  error?: string;
}

interface MetaErrorBody {
  error?: { message?: string; code?: number; type?: string; error_subcode?: number };
}

function endpoint(): string {
  if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
    throw AppError.badRequest(
      'WhatsApp Cloud API is not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.',
    );
  }
  return `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

function authHeader(): Record<string, string> {
  return {
    Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function normalizePhone(phone: string): string {
  // Meta wants E.164 *without* the leading "+" and only digits.
  return phone.replace(/[^\d]/g, '');
}

async function postMessages(body: Record<string, unknown>): Promise<CloudSendResult> {
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { messages?: Array<{ id: string }> } & MetaErrorBody;
  if (!res.ok || !json.messages?.[0]?.id) {
    const reason = json.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`WhatsApp Cloud API error: ${reason}`);
  }
  return { externalId: json.messages[0].id, status: 'accepted' };
}

export const whatsappCloud = {
  /** Send a free-form text message. Only works inside the 24h customer service window. */
  async sendText(phone: string, body: string): Promise<CloudSendResult> {
    return postMessages({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizePhone(phone),
      type: 'text',
      text: { preview_url: false, body },
    });
  },

  /**
   * Send a pre-approved template message.
   *
   * @param phone        Recipient in E.164 (with or without +).
   * @param templateName Exact name of the approved template in Meta dashboard.
   * @param language     BCP-47 code, e.g. "ar" or "en".
   * @param bodyParams   Ordered list of `{{1}}, {{2}}, ...` substitutions.
   */
  async sendTemplate(
    phone: string,
    templateName: string,
    language: 'ar' | 'en',
    bodyParams: string[] = [],
  ): Promise<CloudSendResult> {
    const components =
      bodyParams.length > 0
        ? [
            {
              type: 'body',
              parameters: bodyParams.map((text) => ({ type: 'text', text })),
            },
          ]
        : [];

    return postMessages({
      messaging_product: 'whatsapp',
      to: normalizePhone(phone),
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        ...(components.length ? { components } : {}),
      },
    });
  },

  /** Mark an inbound message as read so the user sees the blue check. */
  async markRead(messageId: string): Promise<void> {
    await fetch(endpoint(), {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
  },

  /** Webhook GET handshake (Meta calls this once when you save the URL). */
  verifyWebhook(mode: string | undefined, token: string | undefined, challenge: string | undefined): string | null {
    if (
      mode === 'subscribe' &&
      env.WHATSAPP_VERIFY_TOKEN &&
      token === env.WHATSAPP_VERIFY_TOKEN
    ) {
      return challenge ?? '';
    }
    return null;
  },

  /** Parse a webhook POST body into our domain events. */
  parseWebhookBody(body: unknown): { messages: IncomingMessage[]; statuses: StatusUpdate[] } {
    const messages: IncomingMessage[] = [];
    const statuses: StatusUpdate[] = [];
    const entries = (body as { entry?: Array<{ changes?: Array<{ value?: unknown }> }> }).entry ?? [];

    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const value = change.value as
          | {
              messages?: Array<{ from: string; id: string; timestamp: string; text?: { body: string } }>;
              statuses?: Array<{ id: string; recipient_id: string; status: string; timestamp: string; errors?: Array<{ title?: string }> }>;
            }
          | undefined;

        for (const m of value?.messages ?? []) {
          messages.push({
            from: m.from,
            text: m.text?.body ?? '',
            messageId: m.id,
            timestamp: new Date(Number(m.timestamp) * 1000),
          });
        }
        for (const s of value?.statuses ?? []) {
          const status = s.status as StatusUpdate['status'];
          if (['sent', 'delivered', 'read', 'failed'].includes(status)) {
            statuses.push({
              externalId: s.id,
              recipientPhone: s.recipient_id,
              status,
              timestamp: new Date(Number(s.timestamp) * 1000),
              ...(s.errors?.[0]?.title ? { error: s.errors[0].title } : {}),
            });
          }
        }
      }
    }
    return { messages, statuses };
  },

  /** True iff env credentials are set so we can attempt a send. */
  isConfigured(): boolean {
    return Boolean(env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN);
  },
};
