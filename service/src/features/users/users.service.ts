import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';
import { hashPassword } from '@/lib/password';

import { usersModel } from './users.model';
import type {
  CreateClientAccountInput,
  CreateEmployeeInput,
  CreateManagerInput,
  UpdateUserInput,
} from './users.dto';

export const usersService = {
  async listEmployees(companyId: string, page = 1, pageSize = 50) {
    const [items, total] = await usersModel.listByRole(
      companyId,
      'EMPLOYEE',
      (page - 1) * pageSize,
      pageSize,
    );
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  },
  async listManagers(companyId: string) {
    const [items, total] = await usersModel.listByRole(companyId, 'MANAGER', 0, 200);
    return { items, total };
  },
  async createEmployee(companyId: string, input: CreateEmployeeInput) {
    const exists = await usersModel.findByEmail(input.email);
    if (exists) throw AppError.conflict('Email already registered');
    const passwordHash = await hashPassword(input.password);
    const user = await usersModel.createUser({
      email: input.email,
      passwordHash,
      name: input.name,
      role: 'EMPLOYEE',
      companyId,
      whatsappPhone: input.whatsappPhone ?? null,
    });
    await usersModel.createEmployee({ id: user.id, branchId: input.branchId ?? null });
    return user;
  },
  async createManager(companyId: string, input: CreateManagerInput) {
    const exists = await usersModel.findByEmail(input.email);
    if (exists) throw AppError.conflict('Email already registered');
    const passwordHash = await hashPassword(input.password);
    return usersModel.createUser({
      email: input.email,
      passwordHash,
      name: input.name,
      role: 'MANAGER',
      companyId,
      whatsappPhone: input.whatsappPhone ?? null,
    });
  },
  async createClientAccount(companyId: string, input: CreateClientAccountInput) {
    const client = await prisma.client.findFirst({ where: { id: input.clientId, companyId } });
    if (!client) throw AppError.notFound('Client not found');
    if (client.accountUserId) throw AppError.conflict('Client already has an account');
    const existing = await usersModel.findByEmail(input.email);
    if (existing) throw AppError.conflict('Email already registered');
    const passwordHash = await hashPassword(input.password);
    const user = await usersModel.createUser({
      email: input.email,
      passwordHash,
      name: client.name,
      role: 'CLIENT',
      companyId,
    });
    await usersModel.linkClientAccount(client.id, user.id);
    return user;
  },
  async update(id: string, input: UpdateUserInput) {
    const { branchId, ...rest } = input;
    const user = await usersModel.update(id, rest);
    if (branchId !== undefined) {
      await usersModel.updateEmployee(id, { branch: branchId ? { connect: { id: branchId } } : { disconnect: true } });
    }
    return user;
  },
};
