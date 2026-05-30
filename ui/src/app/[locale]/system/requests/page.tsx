'use client';

import axios from 'axios';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, Clock, Info, Loader2, MessageSquare, X } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DetailDrawer, DetailRow } from '@/components/shared/DetailDrawer';
import {
  useActivationPreview,
  useSystemRequests,
  useUpdateRequestStatus,
  type PlanActivationPreview,
  type SubscriptionRequestRow,
} from '@/hooks/queries/system';
import { cn } from '@/lib/utils';

interface DowngradeBlockedDetails {
  code?: string;
  violations: Array<{ resource: 'clients' | 'employees' | 'branches'; used: number; limit: number }>;
}

function extractDowngradeError(err: unknown): DowngradeBlockedDetails | null {
  if (!axios.isAxiosError(err)) return null;
  const data = err.response?.data as { error?: { details?: unknown } } | undefined;
  const details = data?.error?.details as DowngradeBlockedDetails | undefined;
  if (details && details.code === 'PLAN_DOWNGRADE_BLOCKED' && Array.isArray(details.violations)) {
    return details;
  }
  return null;
}

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: { message?: string } } | undefined;
    return data?.error?.message ?? err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

export default function SystemRequestsPage() {
  const t = useTranslations('system.requests');
  const list = useSystemRequests();
  const [selected, setSelected] = useState<SubscriptionRequestRow | null>(null);

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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(r)}
                  aria-label={t('details')}
                  className="p-2 text-muted-foreground hover:text-primary rounded-md hover:bg-muted transition-colors"
                  title={t('details')}
                >
                  <Info className="size-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!list.isLoading && (list.data?.length ?? 0) === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            {t('empty')}
          </div>
        )}
      </div>

      {selected && (
        <RequestDetailDrawer
          request={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function RequestDetailDrawer({
  request,
  onClose,
}: {
  request: SubscriptionRequestRow;
  onClose: () => void;
}): React.ReactElement {
  const t = useTranslations('system.requests');
  const mut = useUpdateRequestStatus();
  const preview = useActivationPreview(
    request.companyId,
    request.plan === 'TRIAL' ? null : request.plan,
    request.billingCycle,
  );
  const [decisionError, setDecisionError] = useState<DowngradeBlockedDetails | null>(null);
  // The drawer can be in three modes: idle (showing buttons), composing a
  // rejection reason, or composing a quote/owner message. State is local so
  // bouncing the drawer resets it.
  type ComposeMode = 'idle' | 'rejecting' | 'quoting';
  const [composeMode, setComposeMode] = useState<ComposeMode>('idle');
  const [rejectReason, setRejectReason] = useState('');
  const [ownerMessage, setOwnerMessage] = useState(request.ownerMessage ?? '');

  const isActionable =
    request.status === 'PENDING' || request.status === 'QUOTED';
  const hasViolations = (preview.data?.violations.length ?? 0) > 0;
  const canApprove = isActionable && (preview.data?.canApprove ?? false);

  async function approve(): Promise<void> {
    setDecisionError(null);
    try {
      await mut.mutateAsync({ id: request.id, status: 'APPROVED' });
      toast.success(t('approved'));
      onClose();
    } catch (e) {
      const dg = extractDowngradeError(e);
      if (dg) {
        setDecisionError(dg);
      } else {
        toast.error(errorMessage(e));
      }
    }
  }

  async function submitReject(): Promise<void> {
    if (rejectReason.trim().length < 3) {
      toast.error(t('rejectReasonRequired'));
      return;
    }
    try {
      await mut.mutateAsync({
        id: request.id,
        status: 'REJECTED',
        rejectReason: rejectReason.trim(),
      });
      toast.success(t('rejected'));
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function submitQuote(): Promise<void> {
    if (ownerMessage.trim().length < 3) {
      toast.error(t('ownerMessageRequired'));
      return;
    }
    try {
      await mut.mutateAsync({
        id: request.id,
        status: 'QUOTED',
        ownerMessage: ownerMessage.trim(),
      });
      toast.success(t('quoted'));
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <DetailDrawer
      open
      onOpenChange={(o) => !o && onClose()}
      mode="view"
      title={t('drawerTitle', { company: request.company?.name ?? '—' })}
      description={t('drawerDesc')}
    >
      <div className="space-y-5">
        {/* Contact details */}
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('contact')}
          </h4>
          <DetailRow label={t('col.contactName')}>{request.contactName}</DetailRow>
          <DetailRow label={t('col.contactEmail')}>{request.contactEmail}</DetailRow>
          {request.contactPhone && (
            <DetailRow label={t('col.contactPhone')}>{request.contactPhone}</DetailRow>
          )}
          {request.note && (
            <DetailRow label={t('col.note')}>
              <span className="whitespace-pre-wrap">{request.note}</span>
            </DetailRow>
          )}
          <DetailRow label={t('col.submittedAt')}>
            {new Date(request.createdAt).toLocaleString()}
          </DetailRow>
        </section>

        {/* Plan comparison */}
        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('planComparison')}
          </h4>
          {preview.isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {preview.data && (
            <ComparisonGrid preview={preview.data} />
          )}
        </section>

        {/* Custom limits requested by admin */}
        {(request.customClientsLimit !== null ||
          request.customEmployeesLimit !== null ||
          request.customBranchesLimit !== null) && (
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('requestedCustomLimits')}
            </h4>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 grid grid-cols-3 gap-2 text-sm">
              {(['clients', 'employees', 'branches'] as const).map((r) => {
                const val =
                  r === 'clients'
                    ? request.customClientsLimit
                    : r === 'employees'
                      ? request.customEmployeesLimit
                      : request.customBranchesLimit;
                return (
                  <div key={r} className="text-center">
                    <p className="text-xs text-muted-foreground">{t(`resource.${r}`)}</p>
                    <p className="font-bold tabular-nums text-lg mt-0.5">
                      {val !== null ? val : '—'}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{t('customLimitsApplyNote')}</p>
          </section>
        )}

        {/* Inline error / violations summary */}
        {(decisionError || hasViolations) && preview.data && (
          <ViolationsCard
            violations={decisionError?.violations ?? preview.data.violations}
            requestedPlanName={preview.data.requestedPlan.name}
            hasCustomLimits={preview.data.hasCustomLimits}
          />
        )}

        {/* Decision area — three modes:
            1. idle    → Approve / Quote / Reject buttons
            2. quoting → textarea for the owner's quote message + Send / Cancel
            3. rejecting → textarea for the rejection reason + Send / Cancel */}
        {isActionable && composeMode === 'idle' && (
          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="flex-1 text-destructive hover:bg-destructive/10"
              onClick={() => setComposeMode('rejecting')}
              disabled={mut.isPending}
            >
              <X className="size-4" />
              {t('reject')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setComposeMode('quoting')}
              disabled={mut.isPending}
            >
              <MessageSquare className="size-4" />
              {t('sendQuote')}
            </Button>
            <Button
              type="button"
              variant="gradient"
              className="flex-1"
              onClick={() => void approve()}
              disabled={mut.isPending || !canApprove}
              title={!canApprove && hasViolations ? t('cannotApprove') : undefined}
            >
              {mut.isPending && mut.variables?.status === 'APPROVED' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {t('approve')}
            </Button>
          </div>
        )}

        {isActionable && composeMode === 'rejecting' && (
          <div className="space-y-2 pt-2 border-t border-border">
            <label htmlFor="rejectReason" className="text-sm font-medium">
              {t('rejectReasonLabel')} <span className="text-destructive">*</span>
            </label>
            <textarea
              id="rejectReason"
              autoFocus
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder={t('rejectReasonPlaceholder')}
              className="flex w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">{t('rejectReasonHint')}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setComposeMode('idle');
                  setRejectReason('');
                }}
                disabled={mut.isPending}
              >
                {t('cancel')}
              </Button>
              <Button
                type="button"
                variant="default"
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void submitReject()}
                disabled={mut.isPending || rejectReason.trim().length < 3}
              >
                {mut.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <X className="size-4" />
                )}
                {t('confirmReject')}
              </Button>
            </div>
          </div>
        )}

        {isActionable && composeMode === 'quoting' && (
          <div className="space-y-2 pt-2 border-t border-border">
            <label htmlFor="ownerMessage" className="text-sm font-medium">
              {t('ownerMessageLabel')} <span className="text-destructive">*</span>
            </label>
            <textarea
              id="ownerMessage"
              autoFocus
              value={ownerMessage}
              onChange={(e) => setOwnerMessage(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder={t('ownerMessagePlaceholder')}
              className="flex w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">{t('ownerMessageHint')}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setComposeMode('idle')}
                disabled={mut.isPending}
              >
                {t('cancel')}
              </Button>
              <Button
                type="button"
                variant="gradient"
                className="flex-1"
                onClick={() => void submitQuote()}
                disabled={mut.isPending || ownerMessage.trim().length < 3}
              >
                {mut.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MessageSquare className="size-4" />
                )}
                {t('sendQuote')}
              </Button>
            </div>
          </div>
        )}

        {!isActionable && (
          <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
            {t('alreadyDecided', { status: t(`status.${request.status}`) })}
          </p>
        )}
      </div>
    </DetailDrawer>
  );
}

function ComparisonGrid({ preview }: { preview: PlanActivationPreview }): React.ReactElement {
  const t = useTranslations('system.requests');
  const { currentPlan, requestedPlan, usage } = preview;

  const rows: Array<{ resource: 'clients' | 'employees' | 'branches'; label: string }> = [
    { resource: 'clients', label: t('resource.clients') },
    { resource: 'employees', label: t('resource.employees') },
    { resource: 'branches', label: t('resource.branches') },
  ];

  function fmtLimit(n: number): string {
    return n <= 0 ? '∞' : String(n);
  }

  return (
    <div className="space-y-3">
      {/* Plan headers */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-muted-foreground uppercase tracking-wide">{t('currentPlan')}</p>
          <p className="font-bold text-sm mt-1">{currentPlan.name}</p>
          <p className="text-muted-foreground mt-0.5">
            {currentPlan.billingCycle ?? '—'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-muted-foreground uppercase tracking-wide">{t('currentUsage')}</p>
          <p className="font-bold text-sm mt-1">·</p>
        </div>
        <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3">
          <p className="text-primary uppercase tracking-wide font-semibold">{t('requestedPlan')}</p>
          <p className="font-bold text-sm mt-1">{requestedPlan.name}</p>
          <p className="text-muted-foreground mt-0.5">
            {requestedPlan.price.toLocaleString()} {requestedPlan.currency}/{requestedPlan.billingCycle === 'YEARLY' ? t('year') : t('month')}
          </p>
        </div>
      </div>

      {/* Limit rows */}
      <div className="rounded-lg border border-border overflow-hidden">
        {rows.map((row, i) => {
          const used = usage[row.resource];
          const oldLim = currentPlan.limits[row.resource];
          const newLim = requestedPlan.limits[row.resource];
          const violates = newLim > 0 && used > newLim;
          return (
            <div
              key={row.resource}
              className={cn(
                'grid grid-cols-3 gap-2 px-3 py-2.5 text-sm items-center',
                i > 0 && 'border-t border-border',
                violates && 'bg-destructive/5',
              )}
            >
              <div className="font-medium">{row.label}</div>
              <div className="text-center">
                <span className={cn('font-semibold tabular-nums', violates && 'text-destructive')}>
                  {used}
                </span>
                <span className="text-muted-foreground"> / {fmtLimit(oldLim)}</span>
              </div>
              <div className="text-center">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 tabular-nums font-semibold',
                    violates ? 'text-destructive' : newLim > oldLim ? 'text-emerald-600' : '',
                  )}
                >
                  {violates && <AlertTriangle className="size-3.5" />}
                  {fmtLimit(newLim)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ViolationsCard({
  violations,
  requestedPlanName,
  hasCustomLimits,
}: {
  violations: DowngradeBlockedDetails['violations'];
  requestedPlanName: string;
  hasCustomLimits: boolean;
}): React.ReactElement {
  const t = useTranslations('system.requests');
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-2">
      <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
        <AlertTriangle className="size-4" />
        {t('downgradeBlockedTitle')}
      </div>
      <p className="text-xs text-muted-foreground">
        {t('downgradeBlockedDesc', { plan: requestedPlanName })}
      </p>
      <ul className="space-y-1 text-sm">
        {violations.map((v) => (
          <li key={v.resource} className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-background/60">
            <span>{t(`resource.${v.resource}`)}</span>
            <span className="font-mono text-xs">
              <span className="text-destructive font-semibold">{v.used}</span>
              <span className="text-muted-foreground"> {t('over')} </span>
              <span>{v.limit}</span>
            </span>
          </li>
        ))}
      </ul>
      {hasCustomLimits && (
        <p className="text-xs text-muted-foreground italic pt-1">
          {t('customLimitsNote')}
        </p>
      )}
      <p className="text-xs text-muted-foreground pt-1">
        {t('downgradeFixHint')}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('system.requests.status');
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    PENDING: { color: 'bg-amber-500/15 text-amber-600', icon: <Clock className="size-3" /> },
    APPROVED: { color: 'bg-emerald-500/15 text-emerald-600', icon: <Check className="size-3" /> },
    REJECTED: { color: 'bg-destructive/15 text-destructive', icon: <X className="size-3" /> },
    QUOTED: { color: 'bg-sky-500/15 text-sky-600', icon: <MessageSquare className="size-3" /> },
  };
  const v = map[status] ?? map.PENDING;
  return (
    <Badge variant="outline" className={cn('gap-1 border-0', v.color)}>
      {v.icon}
      {t(status)}
    </Badge>
  );
}
