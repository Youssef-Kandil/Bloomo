'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { UserPlus } from 'lucide-react';

import { AssignTechnicianDrawer } from '@/components/shared/AssignTechnicianDrawer';
import { Button } from '@/components/ui/button';
import { useRequest } from '@/hooks/queries/requests';

export default function RequestDetailPage() {
  const t = useTranslations();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const req = useRequest(id);
  const [assignOpen, setAssignOpen] = useState(false);

  if (req.isLoading) return <p className="text-fg-muted">Loading…</p>;
  if (!req.data) return <p>Not found</p>;

  const canAssign = req.data.status === 'PENDING' || req.data.status === 'ASSIGNED';

  return (
    <div className="space-y-6">
      <header className="card flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{req.data.client.name}</h1>
          <p className="text-sm text-fg-muted">
            {req.data.type} · {req.data.status}
          </p>
          {req.data.note && <p className="text-sm mt-2">{req.data.note}</p>}
        </div>
        {canAssign && (
          <Button type="button" variant="gradient" onClick={() => setAssignOpen(true)}>
            <UserPlus className="size-4" />
            {t('requests.assignTechnician')}
          </Button>
        )}
      </header>

      {req.data.assignments && req.data.assignments.length > 0 && (
        <section className="card">
          <h2 className="text-lg font-medium mb-3">Assigned</h2>
          <ul className="divide-y divide-border">
            {req.data.assignments.map((a) => (
              <li key={a.id} className="py-2 text-sm">
                {a.employee?.user?.name ?? a.id}
              </li>
            ))}
          </ul>
        </section>
      )}

      <AssignTechnicianDrawer
        request={req.data}
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />
    </div>
  );
}
