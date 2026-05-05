import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';

/**
 * Throws if recording an expense of `amount` would push month-to-date
 * EXPENSE total above the month's INCOME total. Use this anywhere a
 * treasury EXPENSE entry is created (direct creation, salary advance
 * approval, etc.).
 */
export async function ensureExpenseFitsMonth(
  companyId: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const rows = await prisma.treasuryEntry.groupBy({
    by: ['kind'],
    where: { companyId, createdAt: { gte: monthStart, lte: monthEnd } },
    _sum: { amount: true },
  });
  const income = rows.find((r) => r.kind === 'INCOME')?._sum.amount ?? 0;
  const expense = rows.find((r) => r.kind === 'EXPENSE')?._sum.amount ?? 0;
  if (expense + amount > income) {
    throw AppError.badRequest(
      `Expense exceeds this month's income. Income: ${income}, already spent: ${expense}, available: ${Math.max(
        0,
        income - expense,
      )}, requested: ${amount}`,
    );
  }
}
