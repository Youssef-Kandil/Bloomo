import type { Prisma, User } from '@prisma/client';

import { prisma } from '@/config/prisma';

export const authModel = {
  findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  createAdminWithCompany(data: {
    email: string;
    passwordHash: string;
    name: string;
    companyName: string;
  }): Promise<{ user: User; companyId: string }> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          name: data.name,
          role: 'ADMIN',
        },
      });
      const company = await tx.company.create({
        data: { name: data.companyName, ownerAdminId: user.id },
      });
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { companyId: company.id },
      });
      return { user: updated, companyId: company.id };
    });
  },

  updatePassword(userId: string, passwordHash: string): Promise<User> {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  },

  storeRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.refreshToken.create({ data });
  },

  findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  revokeRefreshToken(id: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  },

  revokeAllUserTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  countAllowedScreens(managerId: string, screenKey: string): Promise<Prisma.PermissionGetPayload<true> | null> {
    return prisma.permission.findUnique({
      where: { managerId_screenKey: { managerId, screenKey } },
    });
  },
};
