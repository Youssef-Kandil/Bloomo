'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Building2,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  Mail,
  Settings2,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/routing';
import {
  useActivateCompanyPlan,
  useExtendCompany,
  useSetCompanyLimits,
  useSystemCompany,
} from '@/hooks/queries/system';

export default function SystemCompanyDetailPage() {
  const t = useTranslations('system');
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const company = useSystemCompany(id);

  if (company.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!company.data) return <p>{t('common.notFound')}</p>;

  const c = company.data;
  const sub = c.subscription;
  const periodEnd = sub?.plan === 'TRIAL' ? sub?.trialEndsAt : sub?.currentPeriodEnd;
  const formattedEnd = periodEnd
    ? new Date(periodEnd).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div className="space-y-6">
      <Link
        href="/system/companies"
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft className="size-4 flip-x" />
        {t('companies.back')}
      </Link>

      <header className="card flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
            <Building2 className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{c.name}</h1>
            <p className="text-sm text-muted-foreground">
              {t('companies.detail.createdAt')}:{' '}
              {new Date(c.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="text-end">
          <p className="text-xs uppercase text-muted-foreground tracking-wide">
            {t('companies.detail.owner')}
          </p>
          <p className="text-sm font-medium">{c.owner?.name}</p>
          <p className="text-xs text-muted-foreground">{c.owner?.email}</p>
        </div>
      </header>

      <section className="card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              {t('companies.detail.subscription')}
            </h2>
          </div>
          <div className="text-end">
            <p className="text-xs uppercase text-muted-foreground tracking-wide">
              {t('companies.detail.currentPlan')}
            </p>
            <p className="font-semibold">
              {sub?.plan ?? '—'}
              {sub?.billingCycle && (
                <span className="ms-2 text-xs font-normal text-muted-foreground">
                  · {sub.billingCycle}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('companies.detail.endsOn')}: {formattedEnd}
            </p>
            {(sub?.customClientsLimit !== null && sub?.customClientsLimit !== undefined) ||
            (sub?.customEmployeesLimit !== null && sub?.customEmployeesLimit !== undefined) ||
            (sub?.customBranchesLimit !== null && sub?.customBranchesLimit !== undefined) ? (
              <p className="text-xs text-amber-600 mt-1">
                {t('companies.detail.customLimits')}:{' '}
                {sub.customClientsLimit ?? '—'} / {sub.customEmployeesLimit ?? '—'} /{' '}
                {sub.customBranchesLimit ?? '—'}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ActivatePlanCard companyId={id} />
          <ExtendCard companyId={id} />
          <LimitsCard
            companyId={id}
            initialClients={sub?.customClientsLimit ?? null}
            initialEmployees={sub?.customEmployeesLimit ?? null}
            initialBranches={sub?.customBranchesLimit ?? null}
          />
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <User className="size-4" />
          {t('companies.detail.users')} ({c.users?.length ?? 0})
        </h2>
        <div className="scroll-tbl">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-start py-2">{t('users.col.name')}</th>
                <th className="text-start py-2">{t('users.col.email')}</th>
                <th className="text-start py-2">{t('users.col.role')}</th>
                <th className="text-start py-2">{t('users.col.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {c.users?.map((u) => (
                <tr key={u.id}>
                  <td className="py-2">{u.name}</td>
                  <td className="py-2 text-muted-foreground">{u.email}</td>
                  <td className="py-2">{u.role}</td>
                  <td className="py-2">
                    {u.bannedAt ? (
                      <span className="text-xs text-destructive font-medium">
                        {t('users.bannedTag')}
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-600 font-medium">
                        {t('users.activeTag')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ActivatePlanCard({ companyId }: { companyId: string }) {
  const t = useTranslations('system.companies.actions');
  const [plan, setPlan] = useState<'BASIC' | 'PRO' | 'ENTERPRISE'>('PRO');
  const [cycle, setCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const mut = useActivateCompanyPlan(companyId);

  async function submit(): Promise<void> {
    try {
      await mut.mutateAsync({ plan, billingCycle: cycle });
      toast.success(t('activateSuccess'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('error'));
    }
  }

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <h3 className="font-medium flex items-center gap-2">
        <CheckCircle2 className="size-4 text-emerald-600" />
        {t('activateTitle')}
      </h3>
      <div>
        <Label>{t('plan')}</Label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as typeof plan)}
          className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm shadow-soft"
        >
          <option value="BASIC">Basic</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
      </div>
      <div>
        <Label>{t('cycle')}</Label>
        <select
          value={cycle}
          onChange={(e) => setCycle(e.target.value as typeof cycle)}
          className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm shadow-soft"
        >
          <option value="MONTHLY">{t('cycleMonthly')}</option>
          <option value="YEARLY">{t('cycleYearly')}</option>
        </select>
      </div>
      <Button type="button" variant="gradient" className="w-full" onClick={submit} disabled={mut.isPending}>
        {mut.isPending && <Loader2 className="size-4 animate-spin" />}
        {t('activateCta')}
      </Button>
    </div>
  );
}

function ExtendCard({ companyId }: { companyId: string }) {
  const t = useTranslations('system.companies.actions');
  const [days, setDays] = useState(30);
  const mut = useExtendCompany(companyId);

  async function submit(): Promise<void> {
    try {
      await mut.mutateAsync({ days });
      toast.success(t('extendSuccess'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('error'));
    }
  }

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <h3 className="font-medium flex items-center gap-2">
        <CalendarPlus className="size-4 text-primary" />
        {t('extendTitle')}
      </h3>
      <div>
        <Label>{t('days')}</Label>
        <Input
          type="number"
          min={1}
          value={days}
          onChange={(e) => setDays(Number.parseInt(e.target.value, 10) || 0)}
        />
      </div>
      <Button type="button" variant="default" className="w-full" onClick={submit} disabled={mut.isPending || days < 1}>
        {mut.isPending && <Loader2 className="size-4 animate-spin" />}
        {t('extendCta')}
      </Button>
    </div>
  );
}

function LimitsCard({
  companyId,
  initialClients,
  initialEmployees,
  initialBranches,
}: {
  companyId: string;
  initialClients: number | null;
  initialEmployees: number | null;
  initialBranches: number | null;
}) {
  const t = useTranslations('system.companies.actions');
  const [clients, setClients] = useState<string>(initialClients?.toString() ?? '');
  const [employees, setEmployees] = useState<string>(initialEmployees?.toString() ?? '');
  const [branches, setBranches] = useState<string>(initialBranches?.toString() ?? '');
  const mut = useSetCompanyLimits(companyId);

  async function submit(): Promise<void> {
    try {
      await mut.mutateAsync({
        customClientsLimit: clients === '' ? null : Number.parseInt(clients, 10),
        customEmployeesLimit: employees === '' ? null : Number.parseInt(employees, 10),
        customBranchesLimit: branches === '' ? null : Number.parseInt(branches, 10),
      });
      toast.success(t('limitsSuccess'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('error'));
    }
  }

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <h3 className="font-medium flex items-center gap-2">
        <Settings2 className="size-4 text-amber-500" />
        {t('limitsTitle')}
      </h3>
      <p className="text-xs text-muted-foreground">{t('limitsHint')}</p>
      <div>
        <Label>{t('clientsLimit')}</Label>
        <Input
          type="number"
          min={0}
          value={clients}
          onChange={(e) => setClients(e.target.value)}
          placeholder={t('useDefault')}
        />
      </div>
      <div>
        <Label>{t('employeesLimit')}</Label>
        <Input
          type="number"
          min={0}
          value={employees}
          onChange={(e) => setEmployees(e.target.value)}
          placeholder={t('useDefault')}
        />
      </div>
      <div>
        <Label>{t('branchesLimit')}</Label>
        <Input
          type="number"
          min={0}
          value={branches}
          onChange={(e) => setBranches(e.target.value)}
          placeholder={t('useDefault')}
        />
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={submit} disabled={mut.isPending}>
        {mut.isPending && <Loader2 className="size-4 animate-spin" />}
        <ShieldCheck className="size-4" />
        {t('limitsCta')}
      </Button>
    </div>
  );
}
