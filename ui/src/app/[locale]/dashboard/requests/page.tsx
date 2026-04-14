'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Link } from '@/i18n/routing';
import { useRequests } from '@/hooks/queries/requests';

const STATUSES = ['', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export default function RequestsPage() {
  const t = useTranslations();
  const [status, setStatus] = useState<string>('');
  const list = useRequests(status || undefined);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-semibold">{t('nav.requests')}</h1>
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'All'}</option>
          ))}
        </select>
      </header>

      <div className="card overflow-x-auto">
        {list.isLoading && <p className="text-fg-muted">{t('common.loading')}</p>}
        {list.data?.items?.length === 0 && <p className="text-fg-muted">{t('common.empty')}</p>}
        <table className="w-full text-sm">
          <thead className="text-fg-muted text-xs uppercase">
            <tr>
              <th className="text-start py-2">Client</th>
              <th className="text-start py-2">Type</th>
              <th className="text-start py-2">Status</th>
              <th className="text-start py-2">Created</th>
              <th className="text-end py-2">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.data?.items?.map((r) => (
              <tr key={r.id}>
                <td className="py-2 truncate">{r.client?.name ?? '—'}</td>
                <td className="py-2">{r.type}</td>
                <td className="py-2">{r.status}</td>
                <td className="py-2 text-xs text-fg-muted">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="py-2 text-end">
                  <Link href={`/dashboard/requests/${r.id}`} className="text-primary hover:underline">
                    {t('common.edit')}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
