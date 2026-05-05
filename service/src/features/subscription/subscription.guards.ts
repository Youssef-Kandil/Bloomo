import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';

import { subscriptionService } from './subscription.service';

type Resource = 'clients' | 'employees' | 'branches';

export async function ensureWithinLimit(
  companyId: string,
  resource: Resource,
): Promise<void> {
  const sub = await subscriptionService.getCurrent(companyId);
  if (sub.isExpired) {
    throw AppError.forbidden('Subscription expired — renew your plan to continue');
  }

  const limit = sub.limits[resource];
  if (limit <= 0) return;

  const used = await currentUsage(companyId, resource);
  if (used >= limit) {
    throw AppError.forbidden(
      `Plan limit reached: ${used}/${limit} ${resource}. Upgrade your plan or request custom limits.`,
    );
  }
}

async function currentUsage(companyId: string, resource: Resource): Promise<number> {
  if (resource === 'clients') {
    return prisma.client.count({ where: { companyId } });
  }
  if (resource === 'branches') {
    return prisma.branch.count({ where: { companyId } });
  }
  // employees: count active EMPLOYEE-role users belonging to company
  return prisma.user.count({
    where: { companyId, role: 'EMPLOYEE', active: true, bannedAt: null },
  });
}
