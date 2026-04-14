'use client';

import { useTranslations } from 'next-intl';

import { useResource } from '@/hooks/queries/generic';

interface ToolList {
  tools: Array<{ id: string; name: string; code: string; qty: number }>;
}

export default function ToolsPage() {
  const t = useTranslations();
  const data = useResource<ToolList>(['tools'], '/api/tools');

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-semibold">{t('nav.tools')}</h1>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-fg-muted text-xs uppercase">
            <tr>
              <th className="text-start py-2">Code</th>
              <th className="text-start py-2">Name</th>
              <th className="text-end py-2">Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.data?.tools?.map((tt) => (
              <tr key={tt.id}>
                <td className="py-2">{tt.code}</td>
                <td className="py-2">{tt.name}</td>
                <td className="py-2 text-end">{tt.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.data?.tools?.length === 0 && <p className="text-fg-muted">{t('common.empty')}</p>}
      </div>
    </div>
  );
}
