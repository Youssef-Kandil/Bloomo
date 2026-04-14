import type { Prisma, Role } from '@prisma/client';

import { prisma } from '@/config/prisma';

export const usersModel = {
  listByRole(companyId: string, role: Role, skip: number, take: number) {
    const where: Prisma.UserWhereInput = { companyId, role };
    return prisma.$transaction([
      prisma.user.findMany({
        where,
        include: role === 'EMPLOYEE' ? { employee: { include: { branch: true } } } : undefined,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);
  },
  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },
  createUser(data: Prisma.UserUncheckedCreateInput) {
    return prisma.user.create({ data });
  },
  createEmployee(data: Prisma.EmployeeUncheckedCreateInput) {
    return prisma.employee.create({ data });
  },
  update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  },
  updateEmployee(id: string, data: Prisma.EmployeeUpdateInput) {
    return prisma.employee.update({ where: { id }, data });
  },
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },
  linkClientAccount(clientId: string, userId: string) {
    return prisma.client.update({ where: { id: clientId }, data: { accountUserId: userId } });
  },
};
