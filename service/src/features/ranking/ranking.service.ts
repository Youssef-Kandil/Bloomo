import { env } from '@/config/env';
import { AppError } from '@/lib/http-error';
import { rankCandidates, type RankedCandidate } from '@/lib/scoring';

import { rankingModel } from './ranking.model';

export interface RankedEmployeeRow extends RankedCandidate {
  name: string;
  avatar: string | null;
  /** Today's first APPROVED check-in time (ISO) — null if not checked in yet. */
  checkedInAt: string | null;
  /** Today's last APPROVED check-out time (ISO) — null if still on duty. */
  checkedOutAt: string | null;
  /** True iff checked in today AND has not checked out yet (assignable). */
  isOnDuty: boolean;
}

export const rankingService = {
  async rankForRequest(companyId: string, requestId: string): Promise<RankedEmployeeRow[]> {
    const request = await rankingModel.findRequestWithClient(companyId, requestId);
    if (!request) throw AppError.notFound('Request not found');

    const employees = await rankingModel.listCompanyEmployees(companyId);
    const rowsMeta = new Map(employees.map((e) => [e.id, e.user]));

    const [historyPerEmp, attendance] = await Promise.all([
      Promise.all(
        employees.map(async (e) => ({
          empId: e.id,
          history: await rankingModel.historicalStats(e.id, request.clientId, request.type),
        })),
      ),
      rankingModel.todayAttendanceByEmployee(employees.map((e) => e.id)),
    ]);
    const historyMap = new Map(historyPerEmp.map((h) => [h.empId, h.history]));

    const ranked = rankCandidates(
      employees.map((e) => ({
        employeeId: e.id,
        employeeLocation:
          e.currentLat !== null && e.currentLng !== null
            ? { lat: e.currentLat, lng: e.currentLng }
            : null,
        lastPingAt: e.lastPingAt,
        history: historyMap.get(e.id) ?? { sameClientAvg: null, sameClientSameTypeAvg: null },
      })),
      {
        clientLocation: { lat: request.client.lat, lng: request.client.lng },
        freshnessMinutes: env.LOCATION_FRESHNESS_MIN,
        startRadiusM: env.START_TASK_RADIUS_M,
      },
    );

    return ranked.map((r) => {
      const att = attendance.get(r.employeeId);
      return {
        ...r,
        name: rowsMeta.get(r.employeeId)?.name ?? 'Unknown',
        avatar: rowsMeta.get(r.employeeId)?.avatar ?? null,
        checkedInAt: att?.checkedInAt ?? null,
        checkedOutAt: att?.checkedOutAt ?? null,
        isOnDuty: att?.isOnDuty ?? false,
      };
    });
  },
};
