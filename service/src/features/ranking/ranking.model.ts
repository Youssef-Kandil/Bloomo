import { prisma } from '@/config/prisma';

export interface AttendanceState {
  /** ISO timestamp of today's first APPROVED CHECK_IN (null if not checked-in). */
  checkedInAt: string | null;
  /** ISO timestamp of today's last APPROVED CHECK_OUT (null if still working). */
  checkedOutAt: string | null;
  /** True iff `checkedInAt && !checkedOutAt`. */
  isOnDuty: boolean;
}

export const rankingModel = {
  findRequestWithClient(companyId: string, requestId: string) {
    return prisma.request.findFirst({
      where: { id: requestId, companyId },
      include: { client: { select: { id: true, lat: true, lng: true } } },
    });
  },

  listCompanyEmployees(companyId: string) {
    return prisma.employee.findMany({
      where: { user: { companyId, role: 'EMPLOYEE', active: true } },
      select: {
        id: true,
        currentLat: true,
        currentLng: true,
        lastPingAt: true,
        user: { select: { name: true, avatar: true } },
      },
    });
  },

  async todayAttendanceByEmployee(
    employeeIds: string[],
  ): Promise<Map<string, AttendanceState>> {
    const result = new Map<string, AttendanceState>();
    if (employeeIds.length === 0) return result;
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const rows = await prisma.attendance.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: 'APPROVED',
        requestedAt: { gte: dayStart, lte: dayEnd },
      },
      select: { employeeId: true, type: true, requestedAt: true },
      orderBy: { requestedAt: 'asc' },
    });

    for (const id of employeeIds) {
      result.set(id, { checkedInAt: null, checkedOutAt: null, isOnDuty: false });
    }
    for (const a of rows) {
      const cur = result.get(a.employeeId);
      if (!cur) continue;
      if (a.type === 'CHECK_IN' && !cur.checkedInAt) {
        cur.checkedInAt = a.requestedAt.toISOString();
      } else if (a.type === 'CHECK_OUT') {
        cur.checkedOutAt = a.requestedAt.toISOString();
      }
    }
    for (const v of result.values()) {
      v.isOnDuty = !!v.checkedInAt && !v.checkedOutAt;
    }
    return result;
  },

  async historicalStats(employeeId: string, clientId: string, requestType: string) {
    const ratings = await prisma.rating.findMany({
      where: {
        clientId,
        request: {
          assignments: { some: { employeeId } },
        },
      },
      select: { stars: true, request: { select: { type: true } } },
    });

    if (ratings.length === 0) {
      return { sameClientAvg: null, sameClientSameTypeAvg: null };
    }
    const sameClientAvg = avg(ratings.map((r) => r.stars));
    const sameType = ratings.filter((r) => r.request.type === requestType).map((r) => r.stars);
    const sameClientSameTypeAvg = sameType.length > 0 ? avg(sameType) : null;
    return { sameClientAvg, sameClientSameTypeAvg };
  },
};

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
