import { io, type Socket } from 'socket.io-client';

import { tokenStore } from './auth';

let socket: Socket | null = null;

/**
 * Socket origin resolution — mirrors src/lib/api.ts:
 *   1. NEXT_PUBLIC_SOCKET_URL — explicit override (production).
 *   2. Browser → same origin as the page. socket.io-client without a URL
 *      uses window.location, which works for both HTTP/LAN-IP and the
 *      HTTPS dev path. (Socket.IO doesn't need a Next.js rewrite — it
 *      connects directly using its own protocol negotiation.)
 *   3. SSR / build → localhost fallback (won't actually be called).
 *
 * Important: Socket.IO talks directly to the backend, NOT through Next.js
 * rewrites. That means under dev:https, you still need the backend on
 * HTTPS too — OR fall back to the HTTP IP setup for socket-heavy testing.
 */
function resolveSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window === 'undefined') return 'http://localhost:4000';
  // Direct connect to the backend port on the same host the page came from.
  const port = process.env.NEXT_PUBLIC_API_PORT ?? '4000';
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  socket = io(resolveSocketUrl(), {
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
