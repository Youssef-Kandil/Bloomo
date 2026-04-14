import { prisma } from '@/config/prisma';

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
