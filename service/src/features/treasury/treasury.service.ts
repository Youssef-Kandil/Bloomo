import { ensureExpenseFitsMonth } from './treasury.guards';
import { treasuryModel } from './treasury.model';
import type { CreateTreasuryEntryInput, TreasuryListQuery } from './treasury.dto';

/** If `to` arrived as midnight UTC (which is what `new Date('YYYY-MM-DD')`
 * produces), push to end-of-day so the filter is inclusive of records
 * created later that day. */
function toEndOfDay(d?: Date): Date | undefined {
  if (!d) return undefined;
  if (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  ) {
    const x = new Date(d);
    x.setUTCHours(23, 59, 59, 999);
    return x;
  }
  return d;
}

export const treasuryService = {
  async list(companyId: string, q: TreasuryListQuery) {
    const range = { from: q.from, to: toEndOfDay(q.to) };
    const [items, total] = await treasuryModel.list(
      companyId,
      range,
      (q.page - 1) * q.pageSize,
      q.pageSize,
    );
    return {
      items,
      total,
      page: q.page,
      pageSize: q.pageSize,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    };
  },
  async summary(companyId: string, range: { from?: Date; to?: Date }) {
    const adjusted = { from: range.from, to: toEndOfDay(range.to) };
    const rows = await treasuryModel.totals(companyId, adjusted);
    const income = rows.find((r) => r.kind === 'INCOME')?._sum.amount ?? 0;
    const expense = rows.find((r) => r.kind === 'EXPENSE')?._sum.amount ?? 0;
    return { income, expense, balance: income - expense };
  },
  async create(
    companyId: string,
    createdByUserId: string,
    input: CreateTreasuryEntryInput,
  ) {
    if (input.kind === 'EXPENSE') {
      await ensureExpenseFitsMonth(companyId, input.amount);
    }
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
