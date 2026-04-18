import type { Request, Response } from 'express';
import { z } from 'zod';

import { AppError } from '@/lib/http-error';

import { otpService, whatsappService } from './whatsapp.service';

function companyId(req: Request): string {
  const id = req.user?.companyId;
  if (!id) throw AppError.forbidden('No company context');
  return id;
}

const broadcastBodySchema = z.object({
  text: z.string().trim().min(10).max(1500),
  audience: z.enum(['all_opted_in']).default('all_opted_in'),
});

const otpSendSchema = z.object({
  phone: z.string().trim().min(5).max(20),
  purpose: z.enum(['CLIENT_PHONE_VERIFY', 'EMPLOYEE_PHONE_VERIFY']),
  relatedId: z.string().min(1),
});

const otpVerifySchema = z.object({
  phone: z.string().trim().min(5).max(20),
  purpose: z.enum(['CLIENT_PHONE_VERIFY', 'EMPLOYEE_PHONE_VERIFY']),
  code: z.string().length(6),
});

export const whatsappController = {
  async status(req: Request, res: Response): Promise<void> {
    res.json(await whatsappService.status(companyId(req)));
  },

  async pair(req: Request, res: Response): Promise<void> {
    const result = await whatsappService.pair(companyId(req));
    res.json(result);
  },

  async pairingCode(req: Request, res: Response): Promise<void> {
    const body = z.object({ phone: z.string().trim().min(8).max(20) }).parse(req.body);
    res.json(await whatsappService.requestPairingCode(companyId(req), body.phone));
  },

  async sendTest(req: Request, res: Response): Promise<void> {
    const body = z
      .object({
        toPhone: z.string().trim().min(8).max(20),
        body: z.string().trim().min(1).max(1500),
      })
      .parse(req.body);
    res.json(await whatsappService.sendTest(companyId(req), body.toPhone, body.body));
  },

  async disconnect(req: Request, res: Response): Promise<void> {
    const result = await whatsappService.disconnect(companyId(req));
    res.json(result);
  },

  async reset(req: Request, res: Response): Promise<void> {
    const result = await whatsappService.resetSession(companyId(req));
    res.json(result);
  },

  async messages(req: Request, res: Response): Promise<void> {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    res.json(await whatsappService.listMessages(companyId(req), page, pageSize));
  },

  async broadcast(req: Request, res: Response): Promise<void> {
    const body = broadcastBodySchema.parse(req.body);
    const result = await whatsappService.broadcast(
      companyId(req),
      { allOptedIn: true },
      body.text,
      req.user!.id,
    );
    res.status(201).json(result);
  },

  async otpSend(req: Request, res: Response): Promise<void> {
    const body = otpSendSchema.parse(req.body);
    res.json(await otpService.send({ ...body, companyId: companyId(req) }));
  },

  async otpVerify(req: Request, res: Response): Promise<void> {
    const body = otpVerifySchema.parse(req.body);
    res.json(await otpService.verify(body));
  },
};
