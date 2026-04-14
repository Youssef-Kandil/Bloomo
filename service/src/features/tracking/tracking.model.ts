import { prisma } from '@/config/prisma';

export const trackingModel = {
  addPing(employeeId: string, lat: number, lng: number) {
    return prisma.$transaction([
      prisma.locationPing.create({ data: { employeeId, lat, lng } }),
      prisma.employee.update({
        where: { id: employeeId },
        data: { currentLat: lat, currentLng: lng, lastPingAt: new Date() },
      }),
    ]);
  },
  current(companyId: string) {
    return prisma.employee.findMany({
      where: { user: { companyId, active: true, role: 'EMPLOYEE' } },
      select: {
        id: true,
        currentLat: true,
        currentLng: true,
        lastPingAt: true,
        user: { select: { name: true, avatar: true } },
      },
    });
  },
  recentFor(employeeId: string, minutes: number) {
    return prisma.locationPing.findMany({
      where: { employeeId, createdAt: { gte: new Date(Date.now() - minutes * 60_000) } },
      orderBy: { createdAt: 'asc' },
    });
  },
};
