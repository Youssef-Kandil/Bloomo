import { z } from 'zod';

export const updateCompanyDto = z.object({
  name: z.string().trim().min(2).max(120).optional(),
});

export const createBranchDto = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(255).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  phones: z.array(z.string().trim().min(5).max(20)).min(1).max(3),
});

export const updateBranchDto = createBranchDto.partial();

export type UpdateCompanyInput = z.infer<typeof updateCompanyDto>;
export type CreateBranchInput = z.infer<typeof createBranchDto>;
export type UpdateBranchInput = z.infer<typeof updateBranchDto>;
