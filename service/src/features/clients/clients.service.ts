import { AppError } from '@/lib/http-error';
import { ensureWithinLimit } from '@/features/subscription/subscription.guards';

import { clientsModel } from './clients.model';
import type { ClientQuery, CreateClientInput, UpdateClientInput } from './clients.dto';

export const clientsService = {
  async list(companyId: string, q: ClientQuery) {
    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await clientsModel.list(companyId, q.q, skip, q.pageSize);
    return {
      items,
      total,
      page: q.page,
      pageSize: q.pageSize,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    };
  },

  async get(companyId: string, id: string) {
    const client = await clientsModel.findById(companyId, id);
    if (!client) throw AppError.notFound('Client not found');
    return client;
  },

  async create(companyId: string, input: CreateClientInput) {
    await ensureWithinLimit(companyId, 'clients');
    return clientsModel.create(companyId, {
      company: { connect: { id: companyId } },
      name: input.name,
      note: input.note ?? null,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      marketingOptIn: input.marketingOptIn,
      phones: {
        create: input.phones.map((p) => ({
          label: p.label,
          phone: p.phone,
          isWhatsapp: p.isWhatsapp,
        })),
      },
    });
  },

  async update(companyId: string, id: string, input: UpdateClientInput) {
    const existing = await clientsModel.findById(companyId, id);
    if (!existing) throw AppError.notFound('Client not found');

    if (input.phones) {
      const waCount = input.phones.filter((p) => p.isWhatsapp).length;
      if (waCount !== 1) {
        throw AppError.badRequest('Exactly one phone must be marked as WhatsApp');
      }
      await clientsModel.replacePhones(
        id,
        input.phones.map((p) => ({
          clientId: id,
          label: p.label,
          phone: p.phone,
          isWhatsapp: p.isWhatsapp,
        })),
      );
    }

    const { phones: _phones, ...rest } = input;
    return clientsModel.update(companyId, id, rest);
  },

  async delete(companyId: string, id: string) {
    const existing = await clientsModel.findById(companyId, id);
    if (!existing) throw AppError.notFound('Client not found');
    await clientsModel.delete(id);
  },
};
