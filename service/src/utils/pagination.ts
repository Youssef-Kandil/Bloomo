import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationQuerySchema>;

export function paginate(pagination: Pagination): { skip: number; take: number } {
  return {
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize,
  };
}

export function buildPageMeta<T>(
  items: T[],
  total: number,
  pagination: Pagination,
): { items: T[]; total: number; page: number; pageSize: number; totalPages: number } {
  return {
    items,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  };
}
