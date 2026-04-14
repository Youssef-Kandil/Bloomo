'use client';

import { useTranslations } from 'next-intl';

import { useResource } from '@/hooks/queries/generic';

interface Summary { income: number; expense: number; balance: number; }
interface List {
  items: Array<{ id: string; kind: 'INCOME' | 'EXPENSE'; amount: number; reason: string; createdAt: string; createdBy?: { name: string } }>;
}

export default function TreasuryPage() {
  const t = useTranslations();
  const summary = useResource<Summary>(['treasury', 'summary'], '/api/treasury/summary');
  const list = useResource<List>(['treasury'], '/api/treasury');

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-semibold">{t('nav.treasury')}</h1>

      <div className="grid grid-cols-3 gap-3">
        <div className="card"><p className="text-xs text-fg-muted">Income</p><p className="text-xl font-semibold">{summary.data?.income ?? '—'}</p></div>
        <div className="card"><p className="text-xs text-fg-muted">Expense</p><p className="text-xl font-semibold">{summary.data?.expense ?? '—'}</p></div>
        <div className="card"><p className="text-xs text-fg-muted">Balance</p><p className="text-xl font-semibold text-primary">{summary.data?.balance ?? '—'}</p></div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-fg-muted text-xs uppercase">
            <tr>
              <th className="text-start py-2">When</th>
              <th className="text-start py-2">Kind</th>
              <th className="text-start py-2">Reason</th>
              <th className="text-end py-2">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.data?.items?.map((e) => (
              <tr key={e.id}>
                <td className="py-2 text-xs text-fg-muted">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="py-2">{e.kind}</td>
                <td className="py-2">{e.reason}</td>
                <td className={`py-2 text-end ${e.kind === 'INCOME' ? 'text-success' : 'text-danger'}`}>{e.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
