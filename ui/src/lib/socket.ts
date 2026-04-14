import { io, type Socket } from 'socket.io-client';

import { tokenStore } from './auth';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';
  socket = io(url, {
    transports: ['websocket'],
    autoConnect: true,
    withCredentials: true,
    auth: { token: tokenStore.get() ?? '' },
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
