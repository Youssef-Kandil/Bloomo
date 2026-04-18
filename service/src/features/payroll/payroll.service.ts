import { prisma } from '@/config/prisma';
import { overtimeService } from '@/features/overtime/overtime.service';
import { salaryAdvanceService } from '@/features/salary-advance/salary-advance.service';
import { AppError } from '@/lib/http-error';

function parseHHmm(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export interface PayrollDayBreakdown {
  date: string; // YYYY-MM-DD
  weekday: number;
  isOffDay: boolean;
  offDayApproved: boolean;
  checkedIn: string | null; // ISO
  checkedOut: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  offDayHoursWorked: number;
}

export interface PayrollResult {
  employeeId: string;
  name: string;
  year: number;
  month: number;
  monthlySalary: number;
  hourlyRate: number;
  overtimeHourlyRate: number;
  offDayHourlyRate: number;
  totals: {
    lateMinutes: number;
    earlyLeaveMinutes: number;
    overtimeHours: number;
    offDayHours: number;
    salaryAdvanceTotal: number;
    lateDeduction: number;
    earlyLeaveDeduction: number;
    overtimePay: number;
    offDayPay: number;
    net: number;
  };
  days: PayrollDayBreakdown[];
}

export const payrollService = {
  async computeForEmployee(
    companyId: string,
    employeeId: string,
    year: number,
    month: number, // 1-12
  ): Promise<PayrollResult> {
    const user = await prisma.user.findFirst({
      where: { id: employeeId, companyId, role: 'EMPLOYEE' },
      include: { employee: true },
    });
    if (!user || !user.employee) throw AppError.notFound('Employee not found');
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw AppError.notFound('Company not found');

    const emp = user.employee;
    const offDays = (emp.offDays as number[] | null) ?? [];
    const checkIn = emp.checkInTime ?? '09:00';
    const checkOut = emp.checkOutTime ?? '17:00';
    const scheduledIn = parseHHmm(checkIn);
    const scheduledOut = parseHHmm(checkOut);
    const scheduledHours = Math.max(0, (scheduledOut - scheduledIn) / 60);

    const standardDays = company.standardWorkingDaysPerMonth || 26;
    const monthlySalary = emp.monthlySalary || 0;
    const hourlyRate =
      scheduledHours > 0 && standardDays > 0
        ? monthlySalary / (standardDays * scheduledHours)
        : 0;
    const overtimeHourlyRate =
      emp.overtimeRateOverride != null
        ? emp.overtimeRateOverride
        : hourlyRate * (company.overtimeMultiplier || 1.5);
    const offDayHourlyRate =
      emp.offDayHourRateOverride != null ? emp.offDayHourRateOverride : hourlyRate;

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const [attendance, offReqs] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          employeeId,
          status: 'APPROVED',
          requestedAt: { gte: monthStart, lte: monthEnd },
        },
        orderBy: { requestedAt: 'asc' },
      }),
      prisma.offDayAttendanceRequest.findMany({
        where: {
          employeeId,
          status: 'APPROVED',
          date: { gte: monthStart, lte: monthEnd },
        },
      }),
    ]);

    // Index attendance by day: keep earliest CHECK_IN and latest CHECK_OUT.
    const checkInByDay = new Map<string, Date>();
    const checkOutByDay = new Map<string, Date>();
    for (const a of attendance) {
      const k = dayKey(a.requestedAt);
      if (a.type === 'CHECK_IN') {
        const existing = checkInByDay.get(k);
        if (!existing || a.requestedAt < existing) checkInByDay.set(k, a.requestedAt);
      } else if (a.type === 'CHECK_OUT') {
        const existing = checkOutByDay.get(k);
        if (!existing || a.requestedAt > existing) checkOutByDay.set(k, a.requestedAt);
      }
    }

    const offApprovedByDay = new Set(
      offReqs.map((r) => dayKey(new Date(r.date))),
    );

    const days: PayrollDayBreakdown[] = [];
    let totalLate = 0;
    let totalEarly = 0;
    let totalOvertime = 0;
    let totalOffDayHours = 0;

    for (let d = 1; d <= monthEnd.getDate(); d += 1) {
      const date = new Date(year, month - 1, d);
      const k = dayKey(date);
      const weekday = date.getDay();
      const isOffDay = offDays.includes(weekday);
      const ci = checkInByDay.get(k) ?? null;
      const co = checkOutByDay.get(k) ?? null;

      let late = 0;
      let early = 0;
      let overtime = 0;
      let offHours = 0;
      let offApproved = false;

      if (isOffDay) {
        offApproved = offApprovedByDay.has(k);
        if (offApproved && ci && co && sameDay(ci, co)) {
          offHours = Math.max(0, (minutesOfDay(co) - minutesOfDay(ci)) / 60);
          totalOffDayHours += offHours;
        }
      } else if (ci || co) {
        if (ci) {
          const inMin = minutesOfDay(ci);
          if (inMin > scheduledIn) {
            late = inMin - scheduledIn;
            totalLate += late;
          }
        }
        if (co) {
          const outMin = minutesOfDay(co);
          if (outMin < scheduledOut) {
            early = scheduledOut - outMin;
            totalEarly += early;
          }
          // Overtime from post-schedule check-out is ignored; overtime
          // only counts from approved OvertimeRequest records (summed below).
        }
      }

      days.push({
        date: k,
        weekday,
        isOffDay,
        offDayApproved: offApproved,
        checkedIn: ci ? ci.toISOString() : null,
        checkedOut: co ? co.toISOString() : null,
        lateMinutes: late,
        earlyLeaveMinutes: early,
        overtimeMinutes: overtime,
        offDayHoursWorked: offHours,
      });
    }

    const [approvedOvertimeHours, advanceTotal] = await Promise.all([
      overtimeService.approvedHoursForMonth(employeeId, year, month),
      salaryAdvanceService.approvedTotalForMonth(employeeId, year, month),
    ]);

    const lateDeduction = (totalLate / 60) * hourlyRate;
    const earlyLeaveDeduction = (totalEarly / 60) * hourlyRate;
    const overtimeHours = approvedOvertimeHours;
    const overtimePay = overtimeHours * overtimeHourlyRate;
    const offDayPay = totalOffDayHours * offDayHourlyRate;
    const net =
      monthlySalary -
      lateDeduction -
      earlyLeaveDeduction +
      overtimePay +
      offDayPay -
      advanceTotal;

    // totalOvertime variable is unused in the new flow (kept for legacy shape)
    void totalOvertime;

    return {
      employeeId,
      name: user.name,
      year,
      month,
      monthlySalary,
      hourlyRate,
      overtimeHourlyRate,
      offDayHourlyRate,
      totals: {
        lateMinutes: totalLate,
        earlyLeaveMinutes: totalEarly,
        overtimeHours,
        offDayHours: totalOffDayHours,
        salaryAdvanceTotal: round2(advanceTotal),
        lateDeduction: round2(lateDeduction),
        earlyLeaveDeduction: round2(earlyLeaveDeduction),
        overtimePay: round2(overtimePay),
        offDayPay: round2(offDayPay),
        net: round2(net),
      },
      days,
    };
  },

  async summaryForMonth(companyId: string, year: number, month: number) {
    const employees = await prisma.user.findMany({
      where: { companyId, role: 'EMPLOYEE', deletedAt: null },
      select: { id: true, name: true, email: true },
    });
    const rows = await Promise.all(
      employees.map((e) =>
        payrollService
          .computeForEmployee(companyId, e.id, year, month)
          .then((r) => ({
            employeeId: e.id,
            name: e.name,
            email: e.email,
            monthlySalary: r.monthlySalary,
            net: r.totals.net,
            lateMinutes: r.totals.lateMinutes,
            earlyLeaveMinutes: r.totals.earlyLeaveMinutes,
            overtimeHours: r.totals.overtimeHours,
            offDayHours: r.totals.offDayHours,
          }))
          .catch(() => null),
      ),
    );
    return rows.filter((r): r is NonNullable<typeof r> => r !== null);
  },
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
