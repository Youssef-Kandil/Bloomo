import type { Prisma } from '@prisma/client';

import { prisma } from '@/config/prisma';

export const companiesModel = {
  get(companyId: string) {
    return prisma.company.findUnique({
      where: { id: companyId },
      include: { branches: true, owner: { select: { id: true, name: true, email: true } } },
    });
  },
  update(companyId: string, data: Prisma.CompanyUpdateInput) {
    return prisma.company.update({ where: { id: companyId }, data });
  },
  listBranches(companyId: string) {
    return prisma.branch.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
  },
  createBranch(data: Prisma.BranchUncheckedCreateInput) {
    return prisma.branch.create({ data });
  },
  updateBranch(id: string, data: Prisma.BranchUpdateInput) {
    return prisma.branch.update({ where: { id }, data });
  },
  deleteBranch(id: string) {
    return prisma.branch.delete({ where: { id } });
  },
};
