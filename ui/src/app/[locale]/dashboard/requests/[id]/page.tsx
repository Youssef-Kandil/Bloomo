'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';

import { useAssignRequest, useRanking, useRequest } from '@/hooks/queries/requests';

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const req = useRequest(id);
  const ranking = useRanking(id);
  const assign = useAssignRequest(id);

  const [employeeId, setEmployeeId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  async function onAssign(): Promise<void> {
    if (!employeeId || !start || !end) return;
    await assign.mutateAsync({ employeeId, plannedStart: start, plannedEnd: end });
  }

  if (req.isLoading) return <p className="text-fg-muted">Loading…</p>;
  if (!req.data) return <p>Not found</p>;

  return (
    <div className="space-y-6">
      <header className="card">
        <h1 className="text-xl font-semibold">{req.data.client.name}</h1>
        <p className="text-sm text-fg-muted">{req.data.type} · {req.data.status}</p>
        {req.data.note && <p className="text-sm mt-2">{req.data.note}</p>}
      </header>

      <section className="card">
        <h2 className="text-lg font-medium mb-3">Recommended employees (score / 10)</h2>
        {ranking.isLoading && <p className="text-fg-muted">Loading ranking…</p>}
        <ul className="divide-y divide-border">
          {ranking.data?.map((c) => (
            <li key={c.employeeId} className="py-2 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{c.name}</p>
                <p className="text-xs text-fg-muted">
                  {c.distanceDisplay} · distance {c.distancePoints} + rating {c.ratingBonus}
                  {c.withinStartRadius && ' · ✓ within 200m'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-primary">{c.total}</span>
                <button
                  className="btn-ghost text-xs"
                  onClick={() => setEmployeeId(c.employeeId)}
                  aria-label="Pick"
                >
                  Pick
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-medium">Assign</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input className="input" placeholder="employee id" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
          <input className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          <input className="input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={onAssign} disabled={assign.isPending}>
          {assign.isPending ? '…' : 'Assign'}
        </button>
        {assign.isError && <p className="text-sm text-danger">{(assign.error as Error).message}</p>}
        {assign.isSuccess && <p className="text-sm text-success">Assigned ✓</p>}
      </section>
    </div>
  );
}
