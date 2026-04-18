import { z } from 'zod';

export const listSupplyOperationsDto = z.object({
  employeeId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  status: z.enum(['paid', 'unpaid', 'deferred', 'noInvoice']).optional(),
});

export type ListSupplyOperationsQuery = z.infer<typeof listSupplyOperationsDto>;

export const createSupplyOperationDto = z.object({
  employeeId: z.string().min(1),
  clientId: z.string().min(1),
  items: z
    .array(
      z.object({
        inventoryItemId: z.string().min(1),
        qty: z.number().int().min(1),
        unitPrice: z.number().min(0).optional(),
      }),
    )
    .min(1),
  needsInstall: z.boolean().default(false),
  invoiceAmount: z.number().min(0).optional(),
  isDeferred: z.boolean().default(false),
  note: z.string().trim().max(2000).optional(),
});

export type CreateSupplyOperationInput = z.infer<typeof createSupplyOperationDto>;
