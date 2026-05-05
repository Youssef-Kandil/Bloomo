'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CalendarClock,
  Inbox,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { AssignTechnicianDrawer } from '@/components/shared/AssignTechnicianDrawer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useResource } from '@/hooks/queries/generic';
import { useRequests, type ServiceRequest } from '@/hooks/queries/requests';
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

      <OpenRequestsByDay items={requests.data?.items ?? []} loading={requests.isLoading} />
    </div>
  );
}

function isOpen(r: ServiceRequest): boolean {
  return r.status !== 'COMPLETED' && r.status !== 'CANCELLED';
}

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function OpenRequestsByDay({
  items,
  loading,
}: {
  items: ServiceRequest[];
  loading: boolean;
}): React.ReactElement {
  const t = useTranslations();
  const [assignTarget, setAssignTarget] = useState<ServiceRequest | null>(null);

  const { today, yesterday } = useMemo(() => {
    const todayStart = startOfDay();
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const todayList: ServiceRequest[] = [];
    const yesterdayList: ServiceRequest[] = [];
    for (const r of items) {
      if (!isOpen(r)) continue;
      const ts = new Date(r.createdAt).getTime();
      if (ts >= todayStart.getTime() && ts < tomorrowStart.getTime()) todayList.push(r);
      else if (ts >= yesterdayStart.getTime() && ts < todayStart.getTime()) yesterdayList.push(r);
    }
    return { today: todayList, yesterday: yesterdayList };
  }, [items]);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <RequestsBucket
          title={t('overview.requestsToday')}
          subtitle={t('overview.requestsTodayHint')}
          icon={Calendar}
          accent="text-primary"
          list={today}
          loading={loading}
          onSelect={setAssignTarget}
        />
        <RequestsBucket
          title={t('overview.requestsYesterday')}
          subtitle={t('overview.requestsYesterdayHint')}
          icon={CalendarClock}
          accent="text-amber-500"
          list={yesterday}
          loading={loading}
          onSelect={setAssignTarget}
        />
      </div>

      <AssignTechnicianDrawer
        request={assignTarget}
        open={!!assignTarget}
        onOpenChange={(open) => !open && setAssignTarget(null)}
      />
    </>
  );
}

function RequestsBucket({
  title,
  subtitle,
  icon: Icon,
  accent,
  list,
  loading,
  onSelect,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: string;
  list: ServiceRequest[];
  loading: boolean;
  onSelect: (r: ServiceRequest) => void;
}): React.ReactElement {
  const t = useTranslations();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={cn('size-5', accent)} />
          {title}
          <span className="ms-auto text-xs font-medium text-muted-foreground tabular-nums">
            {list.length}
          </span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl shimmer" />
            ))}
          </div>
        )}
        {!loading && list.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t('overview.requestsEmpty')}
          </p>
        )}
        {list.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
          >
            <button
              type="button"
              onClick={() => onSelect(r)}
              className="w-full text-start block rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/40 hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {r.client?.name ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.type} · {new Date(r.createdAt).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {r.note && ' · '}
                    {r.note && <span className="italic">{r.note}</span>}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {r.status}
                </Badge>
              </div>
            </button>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
