'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { CalendarRange, Check, ChevronsUpDown, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type DatePresetKey =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'currentWeek'
  | 'currentMonth'
  | 'previousMonth'
  | 'last7'
  | 'last15'
  | 'last30'
  | 'last3Months'
  | 'last6Months'
  | 'custom';

export interface DateRangeValue {
  preset: DatePresetKey;
  from?: string; // ISO yyyy-mm-dd
  to?: string;
}

const PRESETS: DatePresetKey[] = [
  'all',
  'today',
  'yesterday',
  'currentWeek',
  'currentMonth',
  'previousMonth',
  'last7',
  'last15',
  'last30',
  'last3Months',
  'last6Months',
];

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function rangeFromPreset(preset: DatePresetKey): { from?: string; to?: string } {
  const now = new Date();
  const today = startOfDay();
  switch (preset) {
    case 'all':
      return {};
    case 'today':
      return { from: isoDay(today), to: isoDay(endOfDay()) };
    case 'yesterday': {
      const y = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return { from: isoDay(y), to: isoDay(endOfDay(y)) };
    }
    case 'currentWeek': {
      // Monday-based week
      const day = today.getDay(); // 0=Sun
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(today.getTime() + diff * 24 * 60 * 60 * 1000);
      return { from: isoDay(start), to: isoDay(endOfDay()) };
    }
    case 'currentMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: isoDay(start), to: isoDay(endOfDay()) };
    }
    case 'previousMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: isoDay(start), to: isoDay(endOfDay(end)) };
    }
    case 'last7':
      return { from: isoDay(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)), to: isoDay(endOfDay()) };
    case 'last15':
      return { from: isoDay(new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)), to: isoDay(endOfDay()) };
    case 'last30':
      return { from: isoDay(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)), to: isoDay(endOfDay()) };
    case 'last3Months': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      return { from: isoDay(start), to: isoDay(endOfDay()) };
    }
    case 'last6Months': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 6);
      return { from: isoDay(start), to: isoDay(endOfDay()) };
    }
    default:
      return {};
  }
}

interface Props {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  className?: string;
}

export function DateRangeFilter({ value, onChange, className }: Props): React.ReactElement {
  const t = useTranslations('dateFilter');

  function setPreset(preset: DatePresetKey): void {
    if (preset === 'custom') {
      onChange({ preset, from: value.from, to: value.to });
      return;
    }
    onChange({ preset, ...rangeFromPreset(preset) });
  }

  function setCustomFrom(from: string): void {
    onChange({ preset: 'custom', from, to: value.to });
  }
  function setCustomTo(to: string): void {
    onChange({ preset: 'custom', from: value.from, to });
  }

  const isFiltered = value.preset !== 'all';

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="gap-2">
            <CalendarRange className="size-4" />
            <span>{t(`presets.${value.preset}`)}</span>
            <ChevronsUpDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {PRESETS.map((p) => (
            <DropdownMenuItem
              key={p}
              onSelect={() => setPreset(p)}
              className={cn(value.preset === p && 'bg-muted text-foreground')}
            >
              <span className="flex-1">{t(`presets.${p}`)}</span>
              {value.preset === p && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setPreset('custom')}
            className={cn(value.preset === 'custom' && 'bg-muted text-foreground')}
          >
            <span className="flex-1">{t('presets.custom')}</span>
            {value.preset === 'custom' && <Check className="size-4" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{t('from')}</span>
        <Input
          type="date"
          value={value.from ?? ''}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="h-9 w-auto"
          max={value.to}
        />
        <span className="text-xs text-muted-foreground">{t('to')}</span>
        <Input
          type="date"
          value={value.to ?? ''}
          onChange={(e) => setCustomTo(e.target.value)}
          className="h-9 w-auto"
          min={value.from}
        />
        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange({ preset: 'all' })}
            aria-label={t('clear')}
            className="size-9 text-muted-foreground hover:text-destructive"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
