import { treasuryModel } from './treasury.model';
import type { CreateTreasuryEntryInput } from './treasury.dto';

export const treasuryService = {
  async list(companyId: string, page = 1, pageSize = 30) {
    const [items, total] = await treasuryModel.list(companyId, (page - 1) * pageSize, pageSize);
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  },
  async summary(companyId: string) {
    const rows = await treasuryModel.totals(companyId);
    const income = rows.find((r) => r.kind === 'INCOME')?._sum.amount ?? 0;
    const expense = rows.find((r) => r.kind === 'EXPENSE')?._sum.amount ?? 0;
    return { income, expense, balance: income - expense };
  },
  create(companyId: string, createdByUserId: string, input: CreateTreasuryEntryInput) {
    return treasuryModel.create({
      companyId,
      createdByUserId,
      kind: input.kind,
      amount: input.amount,
      reason: input.reason,
      requestId: input.requestId ?? null,
    });
  },
};
