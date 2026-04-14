/**
 * Meta Cloud API webhook endpoints.
 *
 * Mounted in app.ts at `/webhooks/whatsapp` BEFORE the auth-required /api router
 * because Meta sends these unauthenticated.
 *
 * - GET  /webhooks/whatsapp → verification handshake (one-time when saving URL)
 * - POST /webhooks/whatsapp → incoming events (delivery / read / inbound msg)
 */

import { Router, type Request, type Response } from 'express';

import { prisma } from '@/config/prisma';
import { whatsappCloud, type StatusUpdate } from '@/lib/whatsapp-cloud';
import { asyncHandler } from '@/utils/asyncHandler';

const STATUS_TO_ENUM: Record<StatusUpdate['status'], 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> = {
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
};

export const whatsappWebhookRouter = Router();

whatsappWebhookRouter.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;
  const result = whatsappCloud.verifyWebhook(mode, token, challenge);
  if (result === null) {
    res.status(403).end('Forbidden');
    return;
  }
  res.status(200).type('text/plain').send(result);
});

whatsappWebhookRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    // Acknowledge fast — Meta retries aggressively if we take >5s.
    res.status(200).end();

    try {
      const { messages, statuses } = whatsappCloud.parseWebhookBody(req.body);

      for (const status of statuses) {
        await prisma.whatsappMessage
          .updateMany({
            where: { externalId: status.externalId },
            data: {
              status: STATUS_TO_ENUM[status.status],
              ...(status.status === 'delivered' ? { deliveredAt: status.timestamp } : {}),
              ...(status.status === 'read' ? { readAt: status.timestamp } : {}),
              ...(status.error ? { error: status.error } : {}),
            },
          })
          .catch(() => undefined);
      }

      for (const message of messages) {
        // Inbound message arrived → log it for opt-out / customer-service handling.
        console.info(`[whatsapp:inbound] ${message.from}: ${message.text.slice(0, 120)}`);

        // Opt-out keyword handling.
        const text = message.text.trim().toUpperCase();
        if (text === 'STOP' || text === 'الغاء' || text === 'إلغاء') {
          await prisma.client.updateMany({
            where: { phones: { some: { phone: { contains: message.from } } } },
            data: { marketingOptIn: false },
          });
        }

        // Mark as read so the user sees blue ticks.
        await whatsappCloud.markRead(message.messageId).catch(() => undefined);
      }
    } catch (err) {
      console.error('[whatsapp:webhook] processing error:', err);
    }
  }),
);
