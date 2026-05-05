import type { Prisma } from '@prisma/client';

import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';
import { hashPassword } from '@/lib/password';
import { ensureWithinLimit } from '@/features/subscription/subscription.guards';

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
    await ensureWithinLimit(companyId, 'employees');
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
    await usersModel.createEmployee({
      id: user.id,
      branchId: input.branchId ?? null,
      checkInTime: input.checkInTime ?? null,
      checkOutTime: input.checkOutTime ?? null,
      offDays: input.offDays ?? undefined,
      monthlySalary: input.monthlySalary ?? 0,
      overtimeRateOverride: input.overtimeRateOverride ?? null,
      offDayHourRateOverride: input.offDayHourRateOverride ?? null,
    });
    return user;
  },
  async createManager(companyId: string, input: CreateManagerInput) {
    const exists = await usersModel.findByEmail(input.email);
    if (exists) throw AppError.conflict('Email already registered');
    if (input.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: input.branchId, companyId },
      });
      if (!branch) throw AppError.notFound('Branch not found');
    }
    const passwordHash = await hashPassword(input.password);
    return usersModel.createUser({
      email: input.email,
      passwordHash,
      name: input.name,
      role: 'MANAGER',
      companyId,
      branchId: input.branchId ?? null,
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
    const {
      branchId,
      password,
      checkInTime,
      checkOutTime,
      offDays,
      monthlySalary,
      overtimeRateOverride,
      offDayHourRateOverride,
      ...rest
    } = input;
    const existing = await usersModel.findById(id);
    if (!existing) throw AppError.notFound('User not found');
    const userData: Prisma.UserUpdateInput = { ...rest };
    if (password) {
      userData.passwordHash = await hashPassword(password);
    }
    if (branchId !== undefined && existing.role === 'MANAGER') {
      userData.branch = branchId ? { connect: { id: branchId } } : { disconnect: true };
    }
    const user = await usersModel.update(id, userData);
    if (existing.role === 'EMPLOYEE') {
      const empPatch: Prisma.EmployeeUpdateInput = {};
      if (branchId !== undefined) {
        empPatch.branch = branchId ? { connect: { id: branchId } } : { disconnect: true };
      }
      if (checkInTime !== undefined) empPatch.checkInTime = checkInTime;
      if (checkOutTime !== undefined) empPatch.checkOutTime = checkOutTime;
      if (offDays !== undefined) empPatch.offDays = offDays;
      if (monthlySalary !== undefined) empPatch.monthlySalary = monthlySalary;
      if (overtimeRateOverride !== undefined) empPatch.overtimeRateOverride = overtimeRateOverride;
      if (offDayHourRateOverride !== undefined) {
        empPatch.offDayHourRateOverride = offDayHourRateOverride;
      }
      if (Object.keys(empPatch).length > 0) {
        await usersModel.updateEmployee(id, empPatch);
      }
    }
    return user;
  },
  async softDelete(id: string, companyId: string) {
    const existing = await usersModel.findById(id);
    if (!existing || existing.companyId !== companyId) {
      throw AppError.notFound('User not found');
    }
    return usersModel.softDelete(id);
  },
};
