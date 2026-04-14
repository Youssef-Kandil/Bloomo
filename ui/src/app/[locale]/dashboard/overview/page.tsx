'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  ArrowDownRight,
  ArrowUpRight,
  Inbox,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useResource } from '@/hooks/queries/generic';
import { useRequests } from '@/hooks/queries/requests';
import { cn } from '@/lib/utils';

interface TreasurySummary {
  income: number;
  expense: number;
  balance: number;
}

interface StatConfig {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent: string;
  trend?: 'up' | 'down';
}

export default function OverviewPage() {
  const t = useTranslations();
  const requests = useRequests();
  const treasury = useResource<TreasurySummary>(['treasury', 'summary'], '/api/treasury/summary');

  const stats: StatConfig[] = [
    {
      label: t('nav.requests'),
      value: requests.data?.total ?? '—',
      icon: Inbox,
      accent: 'from-indigo-500/20 to-indigo-500/5 text-indigo-500',
    },
    {
      label: 'Income',
      value: treasury.data?.income ?? '—',
      icon: ArrowUpRight,
      accent: 'from-emerald-500/20 to-emerald-500/5 text-emerald-500',
      trend: 'up',
    },
    {
      label: 'Expense',
      value: treasury.data?.expense ?? '—',
      icon: ArrowDownRight,
      accent: 'from-rose-500/20 to-rose-500/5 text-rose-500',
      trend: 'down',
    },
    {
      label: 'Balance',
      value: treasury.data?.balance ?? '—',
      icon: Wallet,
      accent: 'from-amber-500/20 to-amber-500/5 text-amber-500',
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('nav.overview')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('app.tagline')}</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <TrendingUp className="size-3" />
          Live
        </Badge>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
            >
              <Card className="group relative overflow-hidden">
                <div
                  aria-hidden
                  className={cn(
                    'absolute -top-10 -end-10 size-32 rounded-full bg-gradient-to-br blur-2xl opacity-60 transition-opacity group-hover:opacity-100',
                    s.accent,
                  )}
                />
                <CardContent className="relative p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {s.label}
                    </p>
                    <div
                      className={cn(
                        'flex size-9 items-center justify-center rounded-lg bg-gradient-to-br',
                        s.accent,
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold mt-3 tracking-tight">{s.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="size-5 text-primary" />
            {t('nav.requests')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg shimmer" />
              ))}
            </div>
          )}
          {!requests.isLoading && requests.data?.items?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">{t('common.empty')}</p>
          )}
          <ul className="divide-y divide-border">
            {requests.data?.items?.slice(0, 8).map((r, i) => (
              <motion.li
                key={r.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="py-3 flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate font-medium">
                  {r.client?.name ?? '—'}
                  <span className="text-muted-foreground font-normal"> · {r.type}</span>
                </span>
                <Badge variant="outline" className="shrink-0">
                  {r.status}
                </Badge>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
