'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  Ban,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Star,
  Trophy,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAssignRequest, useRanking, type RankedCandidate } from '@/hooks/queries/requests';
import { cn } from '@/lib/utils';

export type SortKey = 'recommended' | 'closest' | 'history' | 'top_rated';

interface RequestSummary {
  id: string;
  type: string;
  status: string;
  note: string | null;
  client: { name: string };
}

interface Props {
  request: RequestSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignTechnicianDrawer({ request, open, onOpenChange }: Props): React.ReactElement {
  const t = useTranslations('requests.assign');
  const ranking = useRanking(request?.id ?? '');
  const assign = useAssignRequest(request?.id ?? '');

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<SortKey>('recommended');

  React.useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setExpanded(null);
      setSearch('');
      setSort('recommended');
    }
  }, [open]);

  const candidates = ranking.data ?? [];

  const visible = React.useMemo(() => {
    const s = search.trim().toLowerCase();
    let rows = s ? candidates.filter((c) => c.name.toLowerCase().includes(s)) : candidates.slice();

    switch (sort) {
      case 'closest':
        rows.sort((a, b) => {
          const da = a.distanceMeters ?? Number.POSITIVE_INFINITY;
          const db = b.distanceMeters ?? Number.POSITIVE_INFINITY;
          return da - db;
        });
        break;
      case 'history':
        rows = rows.filter((c) => c.usedCriterion !== 'none');
        rows.sort((a, b) => b.ratingBonus - a.ratingBonus);
        break;
      case 'top_rated':
        rows.sort((a, b) => b.ratingBonus - a.ratingBonus || b.total - a.total);
        break;
      default:
        rows.sort((a, b) => b.total - a.total);
    }
    return rows;
  }, [candidates, search, sort]);

  function toggle(id: string): void {
    const cand = candidates.find((c) => c.employeeId === id);
    if (cand && !cand.isOnDuty) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onAssign(): Promise<void> {
    if (selected.size === 0 || !request) return;
    try {
      await assign.mutateAsync({ employeeIds: Array.from(selected) });
      toast.success(t('successAssigned', { count: selected.size }));
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('errorAssign');
      toast.error(msg);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t('title')}</SheetTitle>
          {request && (
            <SheetDescription>
              <span className="font-medium text-foreground">{request.client.name}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span>{request.type}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span>{request.status}</span>
            </SheetDescription>
          )}
          {request?.note && (
            <p className="mt-2 text-sm text-muted-foreground">{request.note}</p>
          )}
        </SheetHeader>

        <SheetBody className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="ps-9"
              />
            </div>
            <SortDropdown value={sort} onChange={setSort} />
          </div>

          {ranking.isLoading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}

          {!ranking.isLoading && visible.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              {t('emptyList')}
            </div>
          )}

          <ul className="space-y-2">
            {visible.map((c, index) => (
              <CandidateRow
                key={c.employeeId}
                candidate={c}
                rank={sort === 'recommended' && search.trim() === '' ? index + 1 : null}
                selected={selected.has(c.employeeId)}
                expanded={expanded === c.employeeId}
                onToggle={() => toggle(c.employeeId)}
                onExpand={() =>
                  setExpanded((cur) => (cur === c.employeeId ? null : c.employeeId))
                }
              />
            ))}
          </ul>
        </SheetBody>

        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assign.isPending}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            variant="gradient"
            onClick={() => void onAssign()}
            disabled={assign.isPending || selected.size === 0}
          >
            {assign.isPending && <Loader2 className="size-4 animate-spin" />}
            {selected.size > 0
              ? t('assignWithCount', { count: selected.size })
              : t('assign')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function SortDropdown({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}): React.ReactElement {
  const t = useTranslations('requests.assign.sort');
  const options: { key: SortKey; label: string; icon: React.ReactNode }[] = [
    { key: 'recommended', label: t('recommended'), icon: <Sparkles className="size-4" /> },
    { key: 'closest', label: t('closest'), icon: <MapPin className="size-4" /> },
    { key: 'history', label: t('history'), icon: <Trophy className="size-4" /> },
    { key: 'top_rated', label: t('topRated'), icon: <Star className="size-4" /> },
  ];
  const current = options.find((o) => o.key === value) ?? options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="default" className="shrink-0">
          {current.icon}
          <span className="hidden sm:inline">{current.label}</span>
          <ChevronsUpDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-[110]">
        {options.map((o) => (
          <DropdownMenuItem
            key={o.key}
            onSelect={() => onChange(o.key)}
            className={cn(value === o.key && 'bg-muted text-foreground')}
          >
            {o.icon}
            <span className="flex-1">{o.label}</span>
            {value === o.key && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CandidateRow({
  candidate,
  rank,
  selected,
  expanded,
  onToggle,
  onExpand,
}: {
  candidate: RankedCandidate;
  rank: number | null;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
}): React.ReactElement {
  const t = useTranslations('requests.assign');
  const isTop = rank !== null && rank <= 3;
  const onDuty = candidate.isOnDuty;
  const offDutyReason = !candidate.checkedInAt
    ? t('offDutyNotCheckedIn')
    : candidate.checkedOutAt
      ? t('offDutyCheckedOut')
      : '';

  return (
    <li
      className={cn(
        'rounded-xl border bg-card transition-colors',
        selected ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border',
        isTop && rank === 1 && 'shadow-soft',
        !onDuty && 'opacity-60 grayscale-[35%]',
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={!onDuty}
          aria-pressed={selected}
          aria-label={selected ? t('deselect') : t('select')}
          className={cn(
            'size-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
            selected && onDuty
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-border bg-surface',
            onDuty
              ? 'hover:border-primary/50 cursor-pointer'
              : 'cursor-not-allowed bg-muted',
          )}
        >
          {selected && onDuty && <Check className="size-3.5" />}
        </button>

        <button
          type="button"
          onClick={onExpand}
          className="flex-1 min-w-0 text-start flex items-center gap-2"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              {rank !== null && (
                <span
                  className={cn(
                    'text-xs font-bold tabular-nums shrink-0',
                    rank === 1 && 'text-amber-500',
                    rank === 2 && 'text-slate-400',
                    rank === 3 && 'text-orange-600',
                    rank > 3 && 'text-muted-foreground',
                  )}
                >
                  #{rank}
                </span>
              )}
              {rank === 1 && onDuty && <Star className="size-4 text-amber-500 fill-amber-500 shrink-0" />}
              <span className="truncate font-medium text-sm">{candidate.name}</span>
              {!candidate.isFresh && (
                <WifiOff
                  className="size-3.5 text-muted-foreground shrink-0"
                  aria-label={t('staleLocation')}
                />
              )}
              {!onDuty && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive">
                  <Ban className="size-3" />
                  {t('notAvailable')}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {!onDuty
                ? offDutyReason
                : t('pointsLine', {
                    total: candidate.total,
                    distance: candidate.distancePoints,
                    rating: candidate.ratingBonus,
                  })}
            </p>
          </div>
          <span className="text-base font-semibold text-primary tabular-nums shrink-0">
            {candidate.total}
            <span className="text-xs text-muted-foreground">/10</span>
          </span>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 text-muted-foreground"
            aria-hidden
          >
            <ChevronDown className="size-4" />
          </motion.span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden border-t border-border"
          >
            <dl className="px-3 py-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <Detail label={t('detail.distance')} value={candidate.distanceDisplay} />
              <Detail
                label={t('detail.distanceRank')}
                value={
                  candidate.distanceRank !== null
                    ? t('detail.rankValue', { n: candidate.distanceRank })
                    : '—'
                }
              />
              <Detail
                label={t('detail.distancePoints')}
                value={`${candidate.distancePoints} / 6`}
              />
              <Detail label={t('detail.ratingPoints')} value={`${candidate.ratingBonus} / 4`} />
              <Detail
                label={t('detail.criterion')}
                value={t(`criterion.${candidate.usedCriterion}`)}
              />
              <Detail
                label={t('detail.startRadius')}
                value={candidate.withinStartRadius ? t('yes') : t('no')}
                valueClass={candidate.withinStartRadius ? 'text-emerald-600' : ''}
              />
              <Detail
                label={t('detail.freshness')}
                value={candidate.isFresh ? t('detail.fresh') : t('detail.stale')}
                valueClass={candidate.isFresh ? 'text-emerald-600' : 'text-amber-600'}
              />
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Detail({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('font-medium text-foreground tabular-nums', valueClass)}>{value}</dd>
    </div>
  );
}
