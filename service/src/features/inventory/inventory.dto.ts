import { z } from 'zod';

export const createItemDto = z.object({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(60),
  type: z.string().trim().max(60).optional(),
  icon: z.string().trim().max(40).optional(),
  qty: z.number().int().min(0).default(0),
  unitPrice: z.number().min(0).default(0),
});

export const updateItemDto = createItemDto.partial();

export const requestCustodyDto = z.object({
  requestId: z.string().min(1),
  items: z
    .array(
      z.object({
        inventoryItemId: z.string().min(1),
        qty: z.number().int().min(1),
        unitPrice: z.number().min(0),
      }),
    )
    .min(1),
});

export type CreateItemInput = z.infer<typeof createItemDto>;
export type UpdateItemInput = z.infer<typeof updateItemDto>;
export type RequestCustodyInput = z.infer<typeof requestCustodyDto>;
