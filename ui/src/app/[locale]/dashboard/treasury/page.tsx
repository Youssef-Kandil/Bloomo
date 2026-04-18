'use client';

import axios from 'axios';
import { motion } from 'framer-motion';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Minus,
  Plus,
  Wallet,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DetailDrawer } from '@/components/shared/DetailDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCreateTreasuryEntry,
  useTreasuryEntries,
  useTreasurySummary,
  type TreasuryKind,
} from '@/hooks/queries/treasury';

type DrawerState = { mode: 'add'; kind: TreasuryKind } | null;

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (
      (err.response?.data as { error?: { message?: string } })?.error?.message ?? err.message
    );
  }
  return err instanceof Error ? err.message : String(err);
}

export default function TreasuryPage() {
  const t = useTranslations();
  const summary = useTreasurySummary();
  const list = useTreasuryEntries();
  const createMut = useCreateTreasuryEntry();

  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [filter, setFilter] = useState<'ALL' | TreasuryKind>('ALL');

  const filtered = useMemo(() => {
    const items = list.data ?? [];
    return filter === 'ALL' ? items : items.filter((e) => e.kind === filter);
  }, [list.data, filter]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 22 } },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.header variants={item} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('nav.treasury')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {list.data?.length ?? 0} {t('treasury.entries')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setDrawer({ mode: 'add', kind: 'EXPENSE' })}>
            <Minus className="size-4" />
            {t('treasury.addExpense')}
          </Button>
          <Button variant="gradient" onClick={() => setDrawer({ mode: 'add', kind: 'INCOME' })}>
            <Plus className="size-4" />
            {t('treasury.addIncome')}
          </Button>
        </div>
      </motion.header>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title={t('treasury.income')}
          value={summary.data?.income}
          icon={ArrowUpCircle}
          iconClass="text-[hsl(var(--success))]"
        />
        <SummaryCard
          title={t('treasury.expense')}
          value={summary.data?.expense}
          icon={ArrowDownCircle}
          iconClass="text-destructive"
        />
        <SummaryCard
          title={t('treasury.balance')}
          value={summary.data?.balance}
          icon={Wallet}
          iconClass="text-primary"
          accent
        />
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-5 text-primary" />
              {t('treasury.entries')}
            </CardTitle>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
              <FilterChip active={filter === 'ALL'} onClick={() => setFilter('ALL')}>
                {t('treasury.filterAll')}
              </FilterChip>
              <FilterChip active={filter === 'INCOME'} onClick={() => setFilter('INCOME')}>
                <ArrowUpCircle className="size-3.5 text-[hsl(var(--success))]" />
                {t('treasury.income')}
              </FilterChip>
              <FilterChip active={filter === 'EXPENSE'} onClick={() => setFilter('EXPENSE')}>
                <ArrowDownCircle className="size-3.5 text-destructive" />
                {t('treasury.expense')}
              </FilterChip>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {list.isLoading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg shimmer" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-sm text-muted-foreground text-center">
                {t('treasury.empty')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-start font-medium px-5 py-3">{t('treasury.when')}</th>
                      <th className="text-start font-medium px-5 py-3">{t('treasury.kind')}</th>
                      <th className="text-start font-medium px-5 py-3">{t('treasury.reason')}</th>
                      <th className="text-start font-medium px-5 py-3">{t('treasury.by')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('treasury.amount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((e) => (
                      <tr key={e.id} className="hover:bg-muted/50">
                        <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(e.createdAt).toLocaleString(undefined, {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-3">
                          {e.kind === 'INCOME' ? (
                            <Badge className="gap-1 bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border-transparent">
                              <ArrowUpCircle className="size-3" />
                              {t('treasury.income')}
                            </Badge>
                          ) : (
                            <Badge className="gap-1 bg-destructive/15 text-destructive border-transparent">
                              <ArrowDownCircle className="size-3" />
                              {t('treasury.expense')}
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-3">{e.reason}</td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">
                          {e.createdBy?.name ?? '—'}
                        </td>
                        <td
                          className={`px-5 py-3 text-end font-mono font-semibold ${
                            e.kind === 'INCOME'
                              ? 'text-[hsl(var(--success))]'
                              : 'text-destructive'
                          }`}
                        >
                          {e.kind === 'EXPENSE' && '-'}
                          {e.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {drawer?.mode === 'add' && (
        <AddEntryDrawer
          open
          kind={drawer.kind}
          onClose={() => setDrawer(null)}
          onSubmit={async (input) => {
            try {
              await createMut.mutateAsync(input);
              toast.success(
                input.kind === 'INCOME'
                  ? t('treasury.incomeAdded')
                  : t('treasury.expenseAdded'),
              );
              setDrawer(null);
            } catch (err) {
              toast.error(errorMessage(err));
              throw err;
            }
          }}
          submitting={createMut.isPending}
        />
      )}
    </motion.div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  iconClass,
  accent,
}: {
  title: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  accent?: boolean;
}): React.ReactElement {
  return (
    <Card className={accent ? 'bg-gradient-to-br from-primary/10 to-accent/10' : undefined}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
          <Icon className={`size-5 ${iconClass}`} />
        </div>
        <p className={`mt-2 text-2xl font-bold font-mono ${accent ? 'text-primary' : ''}`}>
          {value != null ? value.toLocaleString() : '—'}
        </p>
      </CardContent>
    </Card>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-background text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function AddEntryDrawer({
  open,
  kind,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  kind: TreasuryKind;
  onClose: () => void;
  onSubmit: (input: { kind: TreasuryKind; amount: number; reason: string }) => Promise<void>;
  submitting: boolean;
}): React.ReactElement {
  const t = useTranslations();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const amountNum = Number(amount);
  const canSubmit =
    Number.isFinite(amountNum) && amountNum > 0 && reason.trim().length >= 1;

  function reset(): void {
    setAmount('');
    setReason('');
  }

  async function submit(): Promise<void> {
    await onSubmit({ kind, amount: amountNum, reason: reason.trim() });
    reset();
  }

  return (
    <DetailDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
      mode="create"
      title={
        kind === 'INCOME' ? t('treasury.addIncome') : t('treasury.addExpense')
      }
      description={
        kind === 'INCOME'
          ? t('treasury.addIncomeDesc')
          : t('treasury.addExpenseDesc')
      }
      onSubmit={submit}
      submitting={submitting}
      submitDisabled={!canSubmit}
      submitLabel={kind === 'INCOME' ? t('treasury.addIncome') : t('treasury.addExpense')}
      cancelLabel={t('common.cancel')}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="treasury-amount">
            {t('treasury.amount')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="treasury-amount"
            type="number"
            min={0}
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="treasury-reason">
            {t('treasury.reason')} <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="treasury-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={255}
            rows={4}
            placeholder={
              kind === 'INCOME'
                ? t('treasury.incomeReasonPlaceholder')
                : t('treasury.expenseReasonPlaceholder')
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <p className="text-xs text-muted-foreground">{reason.length}/255</p>
        </div>
      </div>
    </DetailDrawer>
  );
}
