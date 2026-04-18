import { z } from 'zod';

/* Assignment start/finish (existing, used by field employees on service requests) */

export const startTaskDto = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const finishTaskDto = z.object({
  note: z.string().trim().min(1).max(2000),
});

export type StartTaskInput = z.infer<typeof startTaskDto>;
export type FinishTaskInput = z.infer<typeof finishTaskDto>;

/* Standalone Task CRUD (admin/manager assignable to any user) */

export const TASK_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'PENDING_APPROVAL',
  'COMPLETED',
  'CANCELED',
] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const TASK_TYPES = [
  'COLLECTION',
  'SUPPLY',
  'INSTALL',
  'SUPPLY_INSTALL',
  'INSPECTION',
  'MAINTENANCE',
  'REPAIR',
  'OTHER',
] as const;

export const createTaskDto = z
  .object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(4000).optional(),
    priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
    type: z.enum(TASK_TYPES),
    assigneeId: z.string().min(1),
    clientId: z.string().min(1).optional().nullable(),
    collectionAmount: z.number().positive().optional(),
    plannedStart: z.coerce.date().optional().nullable(),
    plannedEnd: z.coerce.date().optional().nullable(),
  })
  .refine(
    (d) => !d.plannedStart || !d.plannedEnd || d.plannedEnd >= d.plannedStart,
    { message: 'plannedEnd must be on/after plannedStart', path: ['plannedEnd'] },
  )
  .refine((d) => d.type !== 'COLLECTION' || !!d.clientId, {
    message: 'Client is required for collection tasks',
    path: ['clientId'],
  })
  .refine(
    (d) => d.type !== 'COLLECTION' || (typeof d.collectionAmount === 'number' && d.collectionAmount > 0),
    { message: 'Collection amount is required for collection tasks', path: ['collectionAmount'] },
  );

export const updateTaskDto = z
  .object({
    title: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().max(4000).optional().nullable(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    type: z.enum(TASK_TYPES).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    assigneeId: z.string().min(1).optional(),
    clientId: z.string().min(1).optional().nullable(),
    collectionAmount: z.number().positive().optional().nullable(),
    plannedStart: z.coerce.date().optional().nullable(),
    plannedEnd: z.coerce.date().optional().nullable(),
    actualStart: z.coerce.date().optional().nullable(),
    actualEnd: z.coerce.date().optional().nullable(),
  })
  .refine(
    (d) => !d.plannedStart || !d.plannedEnd || d.plannedEnd >= d.plannedStart,
    { message: 'plannedEnd must be on/after plannedStart', path: ['plannedEnd'] },
  )
  .refine((d) => !d.actualStart || !d.actualEnd || d.actualEnd >= d.actualStart, {
    message: 'actualEnd must be on/after actualStart',
    path: ['actualEnd'],
  });

export const taskQueryDto = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  assigneeId: z.string().min(1).optional(),
  q: z.string().trim().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskDto>;
export type UpdateTaskInput = z.infer<typeof updateTaskDto>;
export type TaskQuery = z.infer<typeof taskQueryDto>;
