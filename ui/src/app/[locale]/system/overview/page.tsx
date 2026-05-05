'use client';

import { useTranslations } from 'next-intl';
import { Building2, CheckCircle2, Inbox, Users } from 'lucide-react';

import { useSystemOverview } from '@/hooks/queries/system';

export default function SystemOverviewPage() {
  const t = useTranslations('system.overview');
  const overview = useSystemOverview();
  const data = overview.data;

  const tiles = [
    { key: 'companies', icon: Building2, value: data?.companies ?? 0, color: 'text-primary bg-primary/10' },
    { key: 'users', icon: Users, value: data?.users ?? 0, color: 'text-emerald-600 bg-emerald-500/10' },
    { key: 'activeSubscriptions', icon: CheckCircle2, value: data?.activeSubscriptions ?? 0, color: 'text-blue-500 bg-blue-500/10' },
    { key: 'pendingRequests', icon: Inbox, value: data?.pendingRequests ?? 0, color: 'text-amber-500 bg-amber-500/10' },
  ] as const;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl md:text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.key}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft flex items-center justify-between"
            >
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t(`tiles.${tile.key}`)}
                </p>
                <p className="text-3xl font-bold mt-1 tabular-nums">{tile.value.toLocaleString()}</p>
              </div>
              <div className={`flex size-12 items-center justify-center rounded-xl ${tile.color}`}>
                <Icon className="size-6" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
