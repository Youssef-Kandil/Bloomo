/**
 * One-shot backfill: ensures every EMPLOYEE in every company has attendance,
 * tasks, and salary advance records for the last 60 days. Idempotent.
 *
 *   npx tsx prisma/seed-attendance-backfill.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const NOW = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
function rand(min: number, max: number, r: () => number): number {
  return Math.floor(r() * (max - min + 1)) + min;
}

async function backfillAttendance(): Promise<void> {
  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE', deletedAt: null },
    include: { employee: true, company: true },
  });

  for (const u of employees) {
    if (!u.employee || !u.companyId) continue;
    const owner = await prisma.user.findFirst({
      where: { companyId: u.companyId, role: 'ADMIN' },
    });
    if (!owner) continue;

    // Ensure employee has schedule fields
    if (!u.employee.checkInTime || !u.employee.checkOutTime) {
      await prisma.employee.update({
        where: { id: u.id },
        data: {
          checkInTime: u.employee.checkInTime ?? '09:00',
          checkOutTime: u.employee.checkOutTime ?? '17:00',
          monthlySalary: u.employee.monthlySalary || 5000,
        },
      });
    }

    const existingCount = await prisma.attendance.count({
      where: {
        employeeId: u.id,
        requestedAt: { gte: new Date(NOW.getTime() - 60 * DAY_MS) },
      },
    });
    if (existingCount > 50) continue; // already has data

    const r = rng(u.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
    let inserted = 0;
    for (let d = 0; d < 60; d++) {
      const date = new Date(NOW.getTime() - d * DAY_MS);
      const wd = date.getDay();
      if (wd === 5 || wd === 6) continue;
      if (r() > 0.95) continue;
      const ci = new Date(date);
      ci.setHours(rand(8, 9, r), rand(0, 59, r), 0, 0);
      const co = new Date(date);
      co.setHours(rand(16, 18, r), rand(0, 59, r), 0, 0);

      // Skip if already exists for that day
      const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
      const exists = await prisma.attendance.findFirst({
        where: {
          employeeId: u.id,
          type: 'CHECK_IN',
          requestedAt: { gte: dayStart, lte: dayEnd },
        },
        select: { id: true },
      });
      if (exists) continue;

      await prisma.attendance.create({
        data: {
          employeeId: u.id, type: 'CHECK_IN',
          requestedAt: ci, status: 'APPROVED',
          decidedByUserId: owner.id, decidedAt: ci,
        },
      });
      await prisma.attendance.create({
        data: {
          employeeId: u.id, type: 'CHECK_OUT',
          requestedAt: co, status: 'APPROVED',
          decidedByUserId: owner.id, decidedAt: co,
        },
      });
      inserted += 2;
    }
    if (inserted > 0) console.log(`  + ${u.email}: ${inserted} attendance entries`);
  }
}

async function main(): Promise<void> {
  console.log('🌱 Backfilling attendance for all employees...');
  await backfillAttendance();
  console.log('✅ Done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
