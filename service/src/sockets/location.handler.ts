import type { Socket } from 'socket.io';

import { trackingService } from '@/features/tracking/tracking.service';

export function registerLocationHandler(socket: Socket): void {
  if (socket.ctx?.role !== 'EMPLOYEE') {
    // only employees submit pings; admins/managers still need the listener to receive
    return;
  }
  socket.on('location:ping', async (payload: { lat: number; lng: number }) => {
    const lat = Number(payload?.lat);
    const lng = Number(payload?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    try {
      await trackingService.ping(socket.ctx!.userId, { lat, lng });
      socket.to(`company:${socket.ctx!.companyId}:staff`).emit('employee:location', {
        employeeId: socket.ctx!.userId,
        lat,
        lng,
        at: new Date().toISOString(),
      });
    } catch {
      // swallow — broken pings must not crash the socket
    }
  });
}
