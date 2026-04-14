import { Router } from 'express';

import { requirePermission, requireRole } from '@/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';

import { whatsappController } from './whatsapp.controller';

export const whatsappRouter = Router();

whatsappRouter.get(
  '/status',
  requirePermission('whatsapp', 'view'),
  asyncHandler(whatsappController.status),
);

whatsappRouter.post(
  '/pair',
  requireRole('ADMIN', 'MANAGER'),
  requirePermission('whatsapp', 'edit'),
  asyncHandler(whatsappController.pair),
);

whatsappRouter.post(
  '/pairing-code',
  requireRole('ADMIN', 'MANAGER'),
  requirePermission('whatsapp', 'edit'),
  asyncHandler(whatsappController.pairingCode),
);

whatsappRouter.post(
  '/send-test',
  requireRole('ADMIN', 'MANAGER'),
  requirePermission('whatsapp', 'edit'),
  asyncHandler(whatsappController.sendTest),
);

whatsappRouter.post(
  '/reset',
  requireRole('ADMIN', 'MANAGER'),
  requirePermission('whatsapp', 'edit'),
  asyncHandler(whatsappController.reset),
);

whatsappRouter.post(
  '/disconnect',
  requireRole('ADMIN', 'MANAGER'),
  requirePermission('whatsapp', 'edit'),
  asyncHandler(whatsappController.disconnect),
);

whatsappRouter.get(
  '/messages',
  requirePermission('whatsapp', 'view'),
  asyncHandler(whatsappController.messages),
);

whatsappRouter.post(
  '/broadcast',
  requireRole('ADMIN', 'MANAGER'),
  requirePermission('whatsapp', 'edit'),
  asyncHandler(whatsappController.broadcast),
);

whatsappRouter.post('/otp/send', asyncHandler(whatsappController.otpSend));
whatsappRouter.post('/otp/verify', asyncHandler(whatsappController.otpVerify));
