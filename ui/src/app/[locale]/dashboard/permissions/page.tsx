'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api } from '@/lib/api';
import { SCREENS } from '@/lib/rbac';

interface Manager { id: string; name: string; email: string; }

export default function PermissionsPage() {
  const qc = useQueryClient();
  const managers = useQuery({
    queryKey: ['users', 'managers'],
    queryFn: async () => (await api.get<{ items: Manager[] }>('/api/users/managers')).data.items,
  });
  const [selected, setSelected] = useState<string>('');

  const perms = useQuery({
    queryKey: ['permissions', 'manager', selected],
    enabled: !!selected,
    queryFn: async () =>
      (await api.get<{ permissions: Array<{ screenKey: string; canView: boolean; canEdit: boolean }> }>(
        `/api/permissions/manager/${selected}`,
      )).data.permissions,
  });

  const upsert = useMutation({
    mutationFn: async (vars: { screenKey: string; canView: boolean; canEdit: boolean }) =>
      (await api.put('/api/permissions', { managerId: selected, ...vars })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions', 'manager', selected] }),
  });

  const map = new Map(perms.data?.map((p) => [p.screenKey, p]));

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-semibold">Permissions</h1>

      <select className="input max-w-xs" value={selected} onChange={(e) => setSelected(e.target.value)}>
        <option value="">— pick manager —</option>
        {managers.data?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>

      {selected && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="text-start py-2">Screen</th><th>View</th><th>Edit</th></tr></thead>
            <tbody className="divide-y divide-border">
              {SCREENS.map((s) => {
                const cur = map.get(s.key) ?? { canView: false, canEdit: false };
                return (
                  <tr key={s.key}>
                    <td className="py-2">{s.key}</td>
                    <td className="py-2 text-center">
                      <input type="checkbox" checked={cur.canView}
                             onChange={(e) => upsert.mutate({ screenKey: s.key, canView: e.target.checked, canEdit: cur.canEdit })} />
                    </td>
                    <td className="py-2 text-center">
                      <input type="checkbox" checked={cur.canEdit}
                             onChange={(e) => upsert.mutate({ screenKey: s.key, canView: cur.canView, canEdit: e.target.checked })} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
