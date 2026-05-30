'use client';

import axios from 'axios';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDownCircle, ArrowUpCircle, Crown, Plus, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import { DateRangeFilter, type DateRangeValue } from '@/components/shared/DateRangeFilter';
import { Pagination } from '@/components/shared/Pagination';
import { DetailDrawer } from '@/components/shared/DetailDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useAppTreasuryList,
  useAppTreasurySummary,
  useCreateAppTreasuryEntry,
  useDeleteAppTreasuryEntry,
  type AppExpenseCategory,
  type AppTreasuryKind,
  type CreateAppTreasuryEntryInput,
} from '@/hooks/queries/app-treasury';
import type { PlanKey } from '@/hooks/queries/system';

const PLANS: PlanKey[] = ['BASIC', 'PRO', 'ENTERPRISE'];
const KINDS: AppTreasuryKind[] = ['INCOME', 'EXPENSE'];
const CATEGORIES: AppExpenseCategory[] = [
  'INFRASTRUCTURE',
  'SALARIES',
  'MARKETING',
  'TOOLS',
  'TAXES',
  'REFUND',
  'OTHER',
];

function fmtMoney(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string } | undefined)?.message ?? err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

export default function TreasuryPage() {
  const t = useTranslations();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'last30' });
  // Populated by DateRangeFilter on mount via initial preset:
  const [planFilter, setPlanFilter] = useState<PlanKey | ''>('');
  const [kindFilter, setKindFilter] = useState<AppTreasuryKind | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<AppExpenseCategory | ''>('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);

  const filterShared = useMemo(
    () => ({ from: range.from, to: range.to, plan: planFilter || undefined }),
    [range.from, range.to, planFilter],
  );

  const summary = useAppTreasurySummary(filterShared);
  const list = useAppTreasuryList({
    ...filterShared,
    kind: kindFilter || undefined,
    category: categoryFilter || undefined,
    page,
    pageSize: 25,
  });
  const del = useDeleteAppTreasuryEntry();

  async function onDelete(id: string): Promise<void> {
    if (!confirm(t('system.treasury.confirmDelete'))) return;
    try {
      await del.mutateAsync(id);
      toast.success(t('common.deleted'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const selectClass =
    'rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring h-9';

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">{t('system.treasury.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('system.treasury.subtitle')}</p>
        </div>
        <Button variant="gradient" onClick={() => setShowAdd(true)}>
          <Plus className="size-4" />
          {t('system.treasury.addEntry')}
        </Button>
      </header>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5 flex flex-wrap items-center gap-3">
          <DateRangeFilter value={range} onChange={(v) => { setRange(v); setPage(1); }} />
          <select
            className={selectClass}
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value as PlanKey | ''); setPage(1); }}
          >
            <option value="">{t('system.treasury.allPlans')}</option>
            {PLANS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            className={selectClass}
            value={kindFilter}
            onChange={(e) => { setKindFilter(e.target.value as AppTreasuryKind | ''); setPage(1); }}
          >
            <option value="">{t('system.treasury.allKinds')}</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>{t(`system.treasury.kind.${k}`)}</option>
            ))}
          </select>
          <select
            className={selectClass}
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value as AppExpenseCategory | ''); setPage(1); }}
          >
            <option value="">{t('system.treasury.allCategories')}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`system.treasury.category.${c}`)}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Totals tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile
          icon={<ArrowUpCircle className="size-6" />}
          label={t('system.treasury.totalIncome')}
          value={summary.data?.totals.income ?? 0}
          color="text-emerald-600 bg-emerald-500/10"
        />
        <Tile
          icon={<ArrowDownCircle className="size-6" />}
          label={t('system.treasury.totalExpense')}
          value={summary.data?.totals.expense ?? 0}
          color="text-rose-500 bg-rose-500/10"
        />
        <Tile
          icon={<Wallet className="size-6" />}
          label={t('system.treasury.net')}
          value={summary.data?.totals.net ?? 0}
          color="text-primary bg-primary/10"
        />
      </div>

      {/* Best sellers + revenue per plan */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="size-4 text-amber-500" />
              {t('system.treasury.bestSellersByCount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PlanRanking
              rows={summary.data?.bestSellersByCount ?? []}
              metric="activations"
              emptyKey="system.treasury.empty"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="size-4 text-emerald-500" />
              {t('system.treasury.bestSellersByRevenue')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PlanRanking
              rows={summary.data?.bestSellersByRevenue ?? []}
              metric="revenue"
              emptyKey="system.treasury.empty"
            />
          </CardContent>
        </Card>
      </div>

      {/* Expense categories */}
      {(summary.data?.byCategory.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('system.treasury.expenseBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {summary.data?.byCategory.map((c) => (
                <div
                  key={c.category ?? 'NONE'}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <span className="text-sm">{t(`system.treasury.category.${c.category ?? 'OTHER'}` as Parameters<typeof t>[0])}</span>
                  <span className="font-semibold tabular-nums">{fmtMoney(c.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('system.treasury.entries')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-2 font-medium">{t('system.treasury.col.date')}</th>
                  <th className="text-start px-4 py-2 font-medium">{t('system.treasury.col.kind')}</th>
                  <th className="text-start px-4 py-2 font-medium">{t('system.treasury.col.amount')}</th>
                  <th className="text-start px-4 py-2 font-medium">{t('system.treasury.col.reason')}</th>
                  <th className="text-start px-4 py-2 font-medium">{t('system.treasury.col.tag')}</th>
                  <th className="text-end px-4 py-2 font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {list.isLoading ? (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">{t('common.loading')}</td></tr>
                ) : list.data?.items.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">{t('system.treasury.empty')}</td></tr>
                ) : (
                  list.data?.items.map((e) => (
                    <tr key={e.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{fmtDate(e.createdAt)}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className={e.kind === 'INCOME' ? 'border-emerald-500/40 text-emerald-600' : 'border-rose-500/40 text-rose-600'}>
                          {t(`system.treasury.kind.${e.kind}`)}
                        </Badge>
                      </td>
                      <td className={`px-4 py-2 font-semibold tabular-nums ${e.kind === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {e.kind === 'INCOME' ? '+' : '−'} {fmtMoney(e.amount)}
                      </td>
                      <td className="px-4 py-2">{e.reason}</td>
                      <td className="px-4 py-2 text-xs">
                        {e.plan && <Badge variant="outline" className="me-1">{e.plan}</Badge>}
                        {e.billingCycle && <Badge variant="outline" className="me-1">{e.billingCycle}</Badge>}
                        {e.category && <Badge variant="outline">{t(`system.treasury.category.${e.category}`)}</Badge>}
                      </td>
                      <td className="px-4 py-2 text-end">
                        <button
                          type="button"
                          onClick={() => onDelete(e.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10"
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {list.data && list.data.totalPages > 1 && (
            <Pagination
              page={list.data.page}
              pageCount={list.data.totalPages}
              onPageChange={setPage}
              totalCount={list.data.total}
              firstIndex={(list.data.page - 1) * list.data.pageSize + 1}
              lastIndex={Math.min(list.data.page * list.data.pageSize, list.data.total)}
            />
          )}
        </CardContent>
      </Card>

      <AddEntryDrawer open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold mt-1 tabular-nums">{fmtMoney(value)}</p>
      </div>
      <div className={`flex size-12 items-center justify-center rounded-xl ${color}`}>{icon}</div>
    </div>
  );
}

function PlanRanking({
  rows,
  metric,
  emptyKey,
}: {
  rows: Array<{ plan: PlanKey; activations: number; revenue: number }>;
  metric: 'activations' | 'revenue';
  emptyKey: string;
}): React.ReactElement {
  const t = useTranslations();
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t(emptyKey as Parameters<typeof t>[0])}</p>;
  }
  const max = Math.max(...rows.map((r) => r[metric] || 0), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => {
        const pct = ((r[metric] || 0) / max) * 100;
        return (
          <li key={r.plan} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">#{i + 1}</span>
                {r.plan}
              </span>
              <span className="tabular-nums font-semibold">
                {metric === 'revenue' ? fmtMoney(r.revenue) : r.activations}
                <span className="text-xs text-muted-foreground ms-1">
                  {metric === 'revenue'
                    ? `· ${r.activations} ${t('system.treasury.unit.activations')}`
                    : `· ${fmtMoney(r.revenue)}`}
                </span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function AddEntryDrawer({ open, onClose }: { open: boolean; onClose: () => void }): React.ReactElement {
  const t = useTranslations();
  const createMut = useCreateAppTreasuryEntry();
  const [kind, setKind] = useState<AppTreasuryKind>('EXPENSE');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<AppExpenseCategory | ''>('OTHER');
  const [plan, setPlan] = useState<PlanKey | ''>('');

  function reset(): void {
    setKind('EXPENSE');
    setAmount('');
    setReason('');
    setCategory('OTHER');
    setPlan('');
  }

  const canSubmit =
    reason.trim().length >= 1 &&
    Number(amount) > 0 &&
    (kind === 'INCOME' || category !== '');

  async function submit(): Promise<void> {
    const input: CreateAppTreasuryEntryInput = {
      kind,
      amount: Number(amount),
      reason: reason.trim(),
    };
    if (kind === 'EXPENSE' && category) input.category = category;
    if (plan) input.plan = plan;
    try {
      await createMut.mutateAsync(input);
      toast.success(t('system.treasury.addSuccess'));
      reset();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const selectClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <DetailDrawer
      open={open}
      onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}
      mode="create"
      title={t('system.treasury.addEntry')}
      description={t('system.treasury.addEntryDesc')}
      onSubmit={submit}
      submitting={createMut.isPending}
      submitDisabled={!canSubmit}
      submitLabel={t('common.save')}
      cancelLabel={t('common.cancel')}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('system.treasury.col.kind')} <span className="text-destructive">*</span></Label>
          <select className={selectClass} value={kind} onChange={(e) => setKind(e.target.value as AppTreasuryKind)}>
            {KINDS.map((k) => (
              <option key={k} value={k}>{t(`system.treasury.kind.${k}`)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="entry-amount">{t('system.treasury.col.amount')} <span className="text-destructive">*</span></Label>
          <Input
            id="entry-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="entry-reason">{t('system.treasury.col.reason')} <span className="text-destructive">*</span></Label>
          <Input
            id="entry-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
        </div>
        {kind === 'EXPENSE' && (
          <div className="space-y-2">
            <Label>{t('system.treasury.col.category')} <span className="text-destructive">*</span></Label>
            <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as AppExpenseCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(`system.treasury.category.${c}`)}</option>
              ))}
            </select>
          </div>
        )}
        {kind === 'INCOME' && (
          <div className="space-y-2">
            <Label>{t('system.treasury.col.plan')}</Label>
            <select className={selectClass} value={plan} onChange={(e) => setPlan(e.target.value as PlanKey | '')}>
              <option value="">—</option>
              {PLANS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </DetailDrawer>
  );
}
