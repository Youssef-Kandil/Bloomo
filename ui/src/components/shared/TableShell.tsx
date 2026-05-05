'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Scrollable wrapper for tables: sticky header, fixed max-height, both
 * directions scroll. Compose <TableShell> around your existing <table>.
 *
 *   <TableShell maxHeight="36rem">
 *     <table>
 *       <thead className="sticky top-0 ..."> ... </thead>
 *       <tbody> ... </tbody>
 *     </table>
 *   </TableShell>
 */
export function TableShell({
  maxHeight = '36rem',
  className,
  children,
}: {
  maxHeight?: string;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  // On mobile only horizontal overflow scrolls — the page scrolls naturally so
  // we don't get nested scroll regions. The maxHeight applies only at md+.
  return (
    <div
      className={cn(
        'overflow-x-auto md:overflow-auto md:[max-height:var(--tbl-max-h)] rounded-lg border border-border',
        className,
      )}
      style={{ ['--tbl-max-h' as string]: maxHeight }}
    >
      {children}
    </div>
  );
}

/** Toolbar row above a table. Renders search + filter slots side-by-side. */
export function TableToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 mb-3', className)}>{children}</div>
  );
}

/** Reusable search input with icon and clear button. */
export function TableSearch({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn('relative flex-1 min-w-[12rem] max-w-sm', className)}>
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ps-9 pe-9 h-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute end-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground"
          aria-label="Clear"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** Sticky thead style — apply on `<thead>` inside TableShell so headers stay
 * visible while scrolling. */
export const stickyTheadClass =
  'sticky top-0 z-10 bg-card text-muted-foreground text-xs uppercase tracking-wide border-b border-border';
