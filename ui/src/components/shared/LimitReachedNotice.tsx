'use client';

import { useTranslations } from 'next-intl';
import { ArrowUpRight, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useMe } from '@/hooks/queries/auth';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export type LimitResource = 'clients' | 'employees' | 'branches';

interface Props {
  resource: LimitResource;
  used: number;
  limit: number;
  /** Compact: a single inline pill (for sitting next to a list header). Default: false (full card). */
  compact?: boolean;
  className?: string;
}

/**
 * Renders the "you've hit your plan limit" notice in place of an Add button.
 * Two layouts: a full call-to-action card (default) or a compact inline pill.
 * The Upgrade CTA only renders for ADMIN — managers see the message alone
 * with an "ask your admin" hint, since the /plans screen is admin-only.
 */
export function LimitReachedNotice({
  resource,
  used,
  limit,
  compact = false,
  className,
}: Props): React.ReactElement {
  const t = useTranslations('limit');
  const me = useMe();
  const isAdmin = me.data?.role === 'ADMIN';
  const resourceLabel = t(`resource.${resource}`);

  if (compact) {
    return (
      <div
        role="status"
        className={cn(
          'inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs',
          className,
        )}
      >
        <Sparkles className="size-3.5 text-amber-600" />
        <span className="text-amber-700 dark:text-amber-300">
          {t('compactMessage', { used, limit, resource: resourceLabel })}
        </span>
        {isAdmin && (
          <Button asChild size="sm" variant="gradient" className="h-7 px-2.5 text-xs">
            <Link href="/dashboard/plans">
              {t('upgrade')}
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="status"
      className={cn(
        'rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-rose-500/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4',
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 shrink-0">
        <Sparkles className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">
          {t('title', { resource: resourceLabel })}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isAdmin
            ? t('description', { used, limit, resource: resourceLabel })
            : t('descriptionManager', { used, limit, resource: resourceLabel })}
        </p>
      </div>
      {isAdmin && (
        <Button asChild variant="gradient" size="sm" className="shrink-0">
          <Link href="/dashboard/plans">
            {t('upgrade')}
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}
