import { prisma } from '@/config/prisma';

function parseHHmm(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function dayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function dayEnd(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/**
 * Auto-check-out employees whose scheduled check-out time has passed today
 * and who have an open CHECK_IN with no CHECK_OUT yet. Creates an APPROVED
 * CHECK_OUT record timestamped at the scheduled check-out time.
 */
export async function runAutoCheckOut(): Promise<void> {
  const now = new Date();
  const start = dayStart(now);
  const end = dayEnd(now);
  const nowMin = minutesOfDay(now);

  const employees = await prisma.employee.findMany({
    where: { checkOutTime: { not: null } },
    select: { id: true, checkOutTime: true },
  });

  for (const emp of employees) {
    const checkOutTime = emp.checkOutTime;
    if (!checkOutTime) continue;
    const outMin = parseHHmm(checkOutTime);
    if (nowMin < outMin) continue; // scheduled check-out hasn't happened yet

    const [checkIn, checkOut] = await Promise.all([
      prisma.attendance.findFirst({
        where: {
          employeeId: emp.id,
          type: 'CHECK_IN',
          requestedAt: { gte: start, lte: end },
        },
      }),
      prisma.attendance.findFirst({
        where: {
          employeeId: emp.id,
          type: 'CHECK_OUT',
          requestedAt: { gte: start, lte: end },
        },
      }),
    ]);
    if (!checkIn || checkOut) continue;

    const scheduledOutAt = new Date(now);
    scheduledOutAt.setHours(Math.floor(outMin / 60), outMin % 60, 0, 0);

    await prisma.attendance.create({
      data: {
        employeeId: emp.id,
        type: 'CHECK_OUT',
        requestedAt: scheduledOutAt,
        status: 'APPROVED',
        decidedAt: new Date(),
      },
    });
  }
}

let timer: NodeJS.Timeout | null = null;

export function startAttendanceScheduler(): void {
  if (timer) return;
  const intervalMs = 60_000; // every minute
  timer = setInterval(() => {
    runAutoCheckOut().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('auto-checkout failed', err);
    });
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
}
