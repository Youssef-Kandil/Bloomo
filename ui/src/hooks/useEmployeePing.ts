'use client';

import { useEffect } from 'react';

import { getSocket } from '@/lib/socket';

import type { AuthUser } from '@/lib/auth';

/** Sends a location:ping every 60 seconds while an employee is logged in. */
export function useEmployeePing(me: AuthUser | null | undefined): void {
  useEffect(() => {
    if (!me || me.role !== 'EMPLOYEE') return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    const send = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const sock = getSocket();
          sock.emit('location:ping', { lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => undefined,
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 10_000 },
      );
    };

    send();
    const id = setInterval(send, 60_000);
    return () => clearInterval(id);
  }, [me]);
}
