/**
 * Backfill the application-level treasury with INCOME entries derived from
 * existing non-TRIAL subscriptions. Useful right after deploying the treasury
 * feature so the OWNER dashboard isn't empty — historical activations had no
 * automatic income entry because the hook didn't exist yet.
 *
 * Also adds a few sample EXPENSE rows (server cost, marketing) when there are
 * zero expenses, so the charts have something to render.
 *
 * Run:   npx tsx prisma/seed-app-treasury.ts
 * Safe:  idempotent — bails out if any AppTreasuryEntry rows already exist.
 *
 * Override behavior with env vars:
 *   FORCE_BACKFILL=1   → run even if entries exist (still skips duplicates per company)
 *   NO_DEMO_EXPENSES=1 → skip the demo expense rows
 */
import { PrismaClient, type BillingCycle, type SubscriptionPlan } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const existingCount = await prisma.appTreasuryEntry.count();
  if (existingCount > 0 && !process.env.FORCE_BACKFILL) {
    // eslint-disable-next-line no-console
    console.log(`Skipped: ${existingCount} treasury entries already exist. Set FORCE_BACKFILL=1 to override.`);
    return;
  }

  const owner = await prisma.user.findFirst({ where: { role: 'OWNER' } });
  if (!owner) {
    // eslint-disable-next-line no-console
    console.error('No OWNER user found. Run `npx tsx prisma/seed-owner.ts` first.');
    process.exit(1);
  }

  // Price lookup table, keyed by plan.
  const planRows = await prisma.plan.findMany();
  const priceFor = (plan: SubscriptionPlan, cycle: BillingCycle): number => {
    const row = planRows.find((p) => p.key === plan);
    if (!row) return 0;
    return cycle === 'YEARLY' ? row.yearlyPrice : row.monthlyPrice;
  };

  // Every paying subscription (TRIAL doesn't generate income).
  const subs = await prisma.subscription.findMany({
    where: { plan: { not: 'TRIAL' }, billingCycle: { not: null } },
    include: { company: { select: { id: true, name: true } } },
  });

  let incomeCreated = 0;
  for (const sub of subs) {
    if (!sub.billingCycle) continue;

    // Skip if this company already has any INCOME entry (avoids duplicates
    // when FORCE_BACKFILL is set and you re-run the script).
    const dup = await prisma.appTreasuryEntry.findFirst({
      where: { companyId: sub.companyId, kind: 'INCOME' },
      select: { id: true },
    });
    if (dup) continue;

    await prisma.appTreasuryEntry.create({
      data: {
        kind: 'INCOME',
        amount: priceFor(sub.plan, sub.billingCycle),
        reason: `[Backfill] ${sub.plan} ${sub.billingCycle} — ${sub.company.name}`,
        plan: sub.plan,
        billingCycle: sub.billingCycle,
        companyId: sub.companyId,
        createdByUserId: owner.id,
        createdAt: sub.updatedAt, // anchor at when the subscription was activated
      },
    });
    incomeCreated++;
  }

  // Demo expense rows so the dashboard has both sides of the ledger.
  let expenseCreated = 0;
  if (!process.env.NO_DEMO_EXPENSES) {
    const existingExpenses = await prisma.appTreasuryEntry.count({ where: { kind: 'EXPENSE' } });
    if (existingExpenses === 0) {
      const now = new Date();
      const days = (n: number): Date => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
      const samples = [
        { amount: 250, reason: 'AWS hosting (sample)', category: 'INFRASTRUCTURE' as const, daysAgo: 2 },
        { amount: 120, reason: 'Sentry monitoring (sample)', category: 'TOOLS' as const, daysAgo: 8 },
        { amount: 400, reason: 'Meta ads (sample)', category: 'MARKETING' as const, daysAgo: 15 },
        { amount: 60, reason: 'Domain renewal (sample)', category: 'INFRASTRUCTURE' as const, daysAgo: 22 },
      ];
      for (const s of samples) {
        await prisma.appTreasuryEntry.create({
          data: {
            kind: 'EXPENSE',
            amount: s.amount,
            reason: s.reason,
            category: s.category,
            createdByUserId: owner.id,
            createdAt: days(s.daysAgo),
          },
        });
        expenseCreated++;
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `✓ Done. Backfilled ${incomeCreated} INCOME from subscriptions and ${expenseCreated} demo EXPENSE rows.`,
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
