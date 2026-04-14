import { z } from 'zod';

const latLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const phoneSchema = z.object({
  label: z.string().trim().min(1).max(50),
  phone: z.string().trim().min(5).max(20),
  isWhatsapp: z.boolean().default(false),
});

export const createClientDto = z
  .object({
    name: z.string().trim().min(2).max(120),
    note: z.string().trim().max(1000).optional(),
    address: z.string().trim().min(3).max(255),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    marketingOptIn: z.boolean().default(false),
    phones: z.array(phoneSchema).min(1).max(3),
  })
  .refine((d) => d.phones.filter((p) => p.isWhatsapp).length === 1, {
    message: 'Exactly one phone must be marked as WhatsApp',
    path: ['phones'],
  });

export const updateClientDto = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    note: z.string().trim().max(1000).optional(),
    address: z.string().trim().min(3).max(255).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    marketingOptIn: z.boolean().optional(),
    phones: z.array(phoneSchema).min(1).max(3).optional(),
  });

export const clientQueryDto = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateClientInput = z.infer<typeof createClientDto>;
export type UpdateClientInput = z.infer<typeof updateClientDto>;
export type ClientQuery = z.infer<typeof clientQueryDto>;
export { latLngSchema };
