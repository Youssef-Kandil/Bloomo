'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  totalCount: number;
  firstIndex: number;
  lastIndex: number;
  className?: string;
}

/** Build a list of page numbers to render with `…` ellipses for large ranges. */
function pageWindow(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | 'gap')[] = [1];
  if (current > 3) out.push('gap');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) out.push(i);
  if (current < total - 2) out.push('gap');
  out.push(total);
  return out;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  totalCount,
  firstIndex,
  lastIndex,
  className,
}: Props): React.ReactElement | null {
  const t = useTranslations('pagination');
  if (totalCount === 0) return null;

  const pages = pageWindow(page, pageCount);
  const canPrev = page > 1;
  const canNext = page < pageCount;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t border-border bg-card',
        className,
      )}
    >
      <p className="text-xs text-muted-foreground tabular-nums">
        {t('range', { from: firstIndex, to: lastIndex, total: totalCount })}
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={!canPrev}
          onClick={() => onPageChange(1)}
          aria-label={t('first')}
        >
          <ChevronsLeft className="size-4 flip-x" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          aria-label={t('prev')}
        >
          <ChevronLeft className="size-4 flip-x" />
        </Button>

        {pages.map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                'min-w-8 h-8 px-2 rounded-md text-xs font-medium tabular-nums transition-colors',
                p === page
                  ? 'bg-primary text-primary-foreground shadow-soft'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {p}
            </button>
          ),
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          aria-label={t('next')}
        >
          <ChevronRight className="size-4 flip-x" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={!canNext}
          onClick={() => onPageChange(pageCount)}
          aria-label={t('last')}
        >
          <ChevronsRight className="size-4 flip-x" />
        </Button>
      </div>
    </div>
  );
}
