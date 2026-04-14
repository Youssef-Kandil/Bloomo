import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';

import { ratingsModel } from './ratings.model';
import type { CreateRatingInput } from './ratings.dto';

export const ratingsService = {
  async recordByClient(clientUserId: string, input: CreateRatingInput) {
    const client = await prisma.client.findUnique({ where: { accountUserId: clientUserId } });
    if (!client) throw AppError.forbidden('No client profile');
    const request = await prisma.request.findFirst({
      where: { id: input.requestId, clientId: client.id },
    });
    if (!request) throw AppError.notFound('Request not found');
    return ratingsModel.create({
      requestId: input.requestId,
      clientId: client.id,
      stars: input.stars,
      note: input.note ?? null,
    });
  },

  async recordByStaff(companyId: string, staffUserId: string, input: CreateRatingInput) {
    const request = await prisma.request.findFirst({
      where: { id: input.requestId, companyId },
    });
    if (!request) throw AppError.notFound('Request not found');
    return ratingsModel.create({
      requestId: input.requestId,
      clientId: request.clientId,
      stars: input.stars,
      note: input.note ?? null,
      recordedByUserId: staffUserId,
    });
  },

  forRequest(requestId: string) {
    return ratingsModel.listForRequest(requestId);
  },
};
