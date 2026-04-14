'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

import { getSocket } from '@/lib/socket';

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false });

interface Employee {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export function EmployeeMarkers({ initial }: { initial: Employee[] }) {
  const [employees, setEmployees] = useState<Employee[]>(initial);

  useEffect(() => {
    const sock = getSocket();
    function onLoc(payload: { employeeId: string; lat: number; lng: number }) {
      setEmployees((prev) => {
        const idx = prev.findIndex((e) => e.id === payload.employeeId);
        if (idx === -1) return prev;
        const next = prev.slice();
        next[idx] = { ...next[idx], lat: payload.lat, lng: payload.lng };
        return next;
      });
    }
    sock.on('employee:location', onLoc);
    return () => {
      sock.off('employee:location', onLoc);
    };
  }, []);

  const center = useMemo(
    () => (employees[0] ? { lat: employees[0].lat, lng: employees[0].lng } : { lat: 30.0444, lng: 31.2357 }),
    [employees],
  );

  return (
    <LeafletMap
      center={center}
      markers={employees.map((e) => ({
        id: e.id,
        lat: e.lat,
        lng: e.lng,
        label: e.name,
        avatar: true,
      }))}
      height="420px"
    />
  );
}
