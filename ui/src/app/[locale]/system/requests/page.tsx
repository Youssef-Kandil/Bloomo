'use client';

import { useTranslations } from 'next-intl';
import { Check, Clock, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useSystemRequests, useUpdateRequestStatus } from '@/hooks/queries/system';

export default function SystemRequestsPage() {
  const t = useTranslations('system.requests');
  const list = useSystemRequests();
  const mut = useUpdateRequestStatus();

  async function setStatus(id: string, status: 'APPROVED' | 'REJECTED'): Promise<void> {
    try {
      await mut.mutateAsync({ id, status });
      toast.success(status === 'APPROVED' ? t('approved') : t('rejected'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('error'));
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl md:text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </header>

      {list.isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="space-y-3">
        {list.data?.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{r.company?.name ?? '—'}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                    {r.plan} · {r.billingCycle}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {r.contactName} · {r.contactEmail}
                  {r.contactPhone && ` · ${r.contactPhone}`}
                </p>
                {r.note && <p className="text-sm whitespace-pre-wrap">{r.note}</p>}
                <p className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString()}
                </p>
              </div>
              {r.status === 'PENDING' && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStatus(r.id, 'REJECTED')}
                    disabled={mut.isPending}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <X className="size-4" />
                    {t('reject')}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => setStatus(r.id, 'APPROVED')}
                    disabled={mut.isPending}
                  >
                    <Check className="size-4" />
                    {t('approve')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        {!list.isLoading && (list.data?.length ?? 0) === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            {t('empty')}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('system.requests.status');
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    PENDING: { color: 'bg-amber-500/15 text-amber-600', icon: <Clock className="size-3" /> },
    APPROVED: { color: 'bg-emerald-500/15 text-emerald-600', icon: <Check className="size-3" /> },
    REJECTED: { color: 'bg-destructive/15 text-destructive', icon: <X className="size-3" /> },
  };
  const v = map[status] ?? map.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${v.color}`}>
      {v.icon}
      {t(status)}
    </span>
  );
}
