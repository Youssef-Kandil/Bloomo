'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { useMe } from '@/hooks/queries/auth';
import { api } from '@/lib/api';

interface AttendanceRow {
  id: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  rejectReason?: string | null;
  employee?: { user: { name: string } };
}

export default function AttendancePage() {
  const t = useTranslations();
  const me = useMe();
  const qc = useQueryClient();

  const isStaff = me.data?.role === 'ADMIN' || me.data?.role === 'MANAGER';
  const path = isStaff ? '/api/attendance' : '/api/attendance/mine';
  const list = useQuery({
    queryKey: ['attendance', isStaff ? 'all' : 'mine'],
    enabled: !!me.data,
    queryFn: async () => (await api.get<{ items: AttendanceRow[] }>(path)).data.items,
  });

  const submit = useMutation({
    mutationFn: async (type: 'CHECK_IN' | 'CHECK_OUT') => (await api.post('/api/attendance', { type })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });

  const decide = useMutation({
    mutationFn: async (vars: { id: string; approve: boolean; reason?: string }) =>
      (await api.post(`/api/attendance/${vars.id}/decide`, vars)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-semibold">{t('nav.attendance')}</h1>

      {me.data?.role === 'EMPLOYEE' && (
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => submit.mutate('CHECK_IN')} disabled={submit.isPending}>Check in</button>
          <button className="btn-ghost" onClick={() => submit.mutate('CHECK_OUT')} disabled={submit.isPending}>Check out</button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-fg-muted text-xs uppercase">
            <tr>
              {isStaff && <th className="text-start py-2">Employee</th>}
              <th className="text-start py-2">Type</th>
              <th className="text-start py-2">Requested</th>
              <th className="text-start py-2">Status</th>
              {isStaff && <th className="text-end py-2">{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.data?.map((r) => (
              <tr key={r.id}>
                {isStaff && <td className="py-2">{r.employee?.user.name ?? '—'}</td>}
                <td className="py-2">{r.type}</td>
                <td className="py-2 text-xs text-fg-muted">{new Date(r.requestedAt).toLocaleString()}</td>
                <td className="py-2">{r.status}</td>
                {isStaff && (
                  <td className="py-2 text-end">
                    {r.status === 'PENDING' && (
                      <div className="flex justify-end gap-2">
                        <button className="text-success text-xs" onClick={() => decide.mutate({ id: r.id, approve: true })}>Approve</button>
                        <button
                          className="text-danger text-xs"
                          onClick={() => {
                            const reason = prompt('Reason?');
                            if (reason) decide.mutate({ id: r.id, approve: false, reason });
                          }}
                        >Reject</button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {list.data?.length === 0 && <p className="text-fg-muted">{t('common.empty')}</p>}
      </div>
    </div>
  );
}
