import type { Server as HttpServer } from 'node:http';

import { Server as IoServer, type Socket } from 'socket.io';

import { env } from '@/config/env';
import { setWhatsappEventBus } from '@/features/whatsapp/whatsapp.service';
import { verifyAccessToken } from '@/lib/jwt';

import { registerLocationHandler } from './location.handler';
import { registerNotificationsHandler } from './notifications.handler';

let io: IoServer | null = null;

export interface SocketContext {
  userId: string;
  role: string;
  companyId: string | null;
}

declare module 'socket.io' {
  interface Socket {
    ctx?: SocketContext;
  }
}

export function initSockets(server: HttpServer): IoServer {
  io = new IoServer(server, {
    cors: { origin: env.FRONTEND_ORIGIN, credentials: true },
  });

  io.use((socket, next) => {
    const token = (socket.handshake.auth?.token ?? '') as string;
    if (!token) return next(new Error('No token'));
    try {
      const payload = verifyAccessToken(token);
      socket.ctx = { userId: payload.sub, role: payload.role, companyId: payload.companyId };
      return next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    if (!socket.ctx?.companyId) {
      socket.disconnect();
      return;
    }
    const room = `company:${socket.ctx.companyId}`;
    void socket.join(room);
    if (socket.ctx.role === 'ADMIN' || socket.ctx.role === 'MANAGER') {
      void socket.join(`${room}:staff`);
    }
    registerLocationHandler(socket);
    registerNotificationsHandler(socket);
  });

  setWhatsappEventBus({
    emitQr(companyId, qr) {
      io?.to(`company:${companyId}:staff`).emit('whatsapp:qr', { qr });
    },
    emitStatus(companyId, status) {
      io?.to(`company:${companyId}:staff`).emit('whatsapp:status', { status });
    },
  });

  return io;
}

export function getIo(): IoServer | null {
  return io;
}
