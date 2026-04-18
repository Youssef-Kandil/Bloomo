import { z } from 'zod';

export const createToolDto = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(60),
  qty: z.number().int().min(0).default(0),
});

export const updateToolDto = createToolDto.partial();

export const assignCustodyDto = z.object({
  toolId: z.string().min(1),
  employeeId: z.string().min(1),
  qty: z.number().int().min(1),
  note: z.string().trim().max(500).optional(),
});

export type CreateToolInput = z.infer<typeof createToolDto>;
export type UpdateToolInput = z.infer<typeof updateToolDto>;
export type AssignCustodyInput = z.infer<typeof assignCustodyDto>;
