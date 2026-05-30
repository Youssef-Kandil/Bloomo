/**
 * Seeds the four subscription plans (TRIAL, BASIC, PRO, ENTERPRISE) with
 * sensible defaults. Without this, the admin's `/dashboard/plans` page is
 * empty and `getPlanLimits()` returns zeros (so feature limits behave
 * incorrectly).
 *
 * Run:   npx tsx prisma/seed-plans.ts
 *
 * Safe: idempotent — upserts by plan `key`.
 *
 * Behavior:
 *   - Default: creates missing plans only, never touches existing rows
 *     (so OWNER price/limit edits from the dashboard survive a re-run).
 *   - With OVERWRITE_PLANS=1: resets every plan to the defaults below.
 */
import { PrismaClient, type SubscriptionPlan } from '@prisma/client';

const prisma = new PrismaClient();

interface PlanSeed {
  key: SubscriptionPlan;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  clientsLimit: number;
  employeesLimit: number;
  branchesLimit: number;
  highlight: boolean;
  sortOrder: number;
  active: boolean;
}

// Prices are in EGP. Tune from the OWNER `/system/plans` screen later — this
// just gives a starting catalogue so the UI isn't blank.
const PLANS: PlanSeed[] = [
  {
    key: 'TRIAL',
    name: 'تجربة مجانية',
    tagline: 'جرّب البلومو 30 يوم بدون أي التزام',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'EGP',
    clientsLimit: 10,
    employeesLimit: 3,
    branchesLimit: 1,
    highlight: false,
    sortOrder: 0,
    // Public catalog hides TRIAL — admins land on it automatically at signup.
    active: false,
  },
  {
    key: 'BASIC',
    name: 'الأساسية',
    tagline: 'للفرق الصغيرة اللي بتبدأ',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    currency: 'EGP',
    clientsLimit: 100,
    employeesLimit: 10,
    branchesLimit: 1,
    highlight: false,
    sortOrder: 1,
    active: true,
  },
  {
    key: 'PRO',
    name: 'الاحترافية',
    tagline: 'للشركات المتوسطة اللي محتاجة فروع وأتمتة أكتر',
    monthlyPrice: 1499,
    yearlyPrice: 14990,
    currency: 'EGP',
    clientsLimit: 500,
    employeesLimit: 40,
    branchesLimit: 5,
    highlight: true,
    sortOrder: 2,
    active: true,
  },
  {
    key: 'ENTERPRISE',
    name: 'الشركات الكبرى',
    tagline: 'حدود مفتوحة + دعم مخصص + SLA',
    monthlyPrice: 4999,
    yearlyPrice: 49990,
    currency: 'EGP',
    clientsLimit: 10000,
    employeesLimit: 500,
    branchesLimit: 50,
    highlight: false,
    sortOrder: 3,
    active: true,
  },
];

async function main(): Promise<void> {
  const overwrite = process.env.OVERWRITE_PLANS === '1';
  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const p of PLANS) {
    const existing = await prisma.plan.findUnique({ where: { key: p.key } });
    if (existing && !overwrite) {
      skipped++;
      continue;
    }
    await prisma.plan.upsert({
      where: { key: p.key },
      create: p,
      update: p,
    });
    if (existing) updated++;
    else created++;
  }

  // eslint-disable-next-line no-console
  console.log(
    `✓ Plans seed done — created: ${created}, updated: ${updated}, skipped: ${skipped}.`,
  );
  if (skipped > 0 && !overwrite) {
    // eslint-disable-next-line no-console
    console.log('  (Existing plans were preserved. Set OVERWRITE_PLANS=1 to reset to defaults.)');
  }
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
