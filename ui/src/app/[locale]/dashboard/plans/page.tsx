'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

import { NotAuthorized } from '@/components/shared/NotAuthorized';
import { useScreenGuard } from '@/hooks/useScreenGuard';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Rocket,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMe } from '@/hooks/queries/auth';
import {
  useContactSales,
  useCurrentSubscription,
  usePlans,
  type BillingCycle,
  type PlanCatalogEntry,
  type SubscriptionPlan,
} from '@/hooks/queries/subscription';
import { cn } from '@/lib/utils';

const PAID_PLANS: SubscriptionPlan[] = ['BASIC', 'PRO', 'ENTERPRISE'];

const PLAN_ICONS: Record<SubscriptionPlan, React.ComponentType<{ className?: string }>> = {
  TRIAL: Sparkles,
  BASIC: Briefcase,
  PRO: Rocket,
  ENTERPRISE: Building2,
};

export default function PlansPage() {
  const t = useTranslations('plans');
  const tErr = useTranslations('errors.notAuthorized');
  const me = useMe();
  const guard = useScreenGuard({ roles: ['ADMIN'] });
  const isAdmin = me.data?.role === 'ADMIN';

  const sub = useCurrentSubscription(isAdmin);
  const plans = usePlans();
  const contactMut = useContactSales();

  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY');
  const [contactTarget, setContactTarget] = useState<PlanCatalogEntry | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customForm, setCustomForm] = useState({
    contactName: me.data?.name ?? '',
    contactEmail: me.data?.email ?? '',
    contactPhone: '',
    clients: '',
    employees: '',
    note: '',
  });
  const [form, setForm] = useState({
    contactName: me.data?.name ?? '',
    contactEmail: me.data?.email ?? '',
    contactPhone: '',
    note: '',
  });

  const paidPlans = useMemo(
    () => (plans.data ?? []).filter((p) => PAID_PLANS.includes(p.key)),
    [plans.data],
  );

  const currentPlanEntry = useMemo(
    () => (plans.data ?? []).find((p) => p.key === sub.data?.plan) ?? null,
    [plans.data, sub.data?.plan],
  );

  function openRenew(): void {
    if (!currentPlanEntry || currentPlanEntry.key === 'TRIAL') return;
    if (sub.data?.billingCycle) setCycle(sub.data.billingCycle);
    openContact(currentPlanEntry);
  }

  if (guard.loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (guard.forbidden) {
    return <NotAuthorized reason={tErr('reasonAdminOnly')} />;
  }

  function openContact(plan: PlanCatalogEntry): void {
    setContactTarget(plan);
    setForm({
      contactName: me.data?.name ?? '',
      contactEmail: me.data?.email ?? '',
      contactPhone: '',
      note: '',
    });
  }

  async function submitContact(): Promise<void> {
    if (!contactTarget) return;
    setConfirmOpen(false);
    try {
      await contactMut.mutateAsync({
        plan: contactTarget.key as Exclude<SubscriptionPlan, 'TRIAL'>,
        billingCycle: cycle,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone || undefined,
        note: form.note || undefined,
      });
      toast.success(t('contactSuccess'));
      setContactTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('contactError'));
    }
  }

  function openCustom(): void {
    setCustomForm({
      contactName: me.data?.name ?? '',
      contactEmail: me.data?.email ?? '',
      contactPhone: '',
      clients: '',
      employees: '',
      note: '',
    });
    setCustomOpen(true);
  }

  async function submitCustom(): Promise<void> {
    const composedNote = [
      `[CUSTOM] clients: ${customForm.clients || '—'}, employees: ${customForm.employees || '—'}`,
      customForm.note,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await contactMut.mutateAsync({
        plan: 'ENTERPRISE',
        billingCycle: cycle,
        contactName: customForm.contactName,
        contactEmail: customForm.contactEmail,
        contactPhone: customForm.contactPhone || undefined,
        note: composedNote,
      });
      toast.success(t('contactSuccess'));
      setCustomOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('contactError'));
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <BillingCycleToggle value={cycle} onChange={setCycle} />
      </header>

      {sub.data && (
        <SubscriptionBanner
          data={sub.data}
          planEntry={currentPlanEntry}
          onRenew={openRenew}
        />
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.isLoading && (
          <div className="md:col-span-3 flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
        {paidPlans.map((p) => (
          <PlanCard
            key={p.key}
            plan={p}
            cycle={cycle}
            currentPlan={sub.data?.plan ?? null}
            currentCycle={sub.data?.billingCycle ?? null}
            currentStatus={sub.data?.status}
            onContact={() => openContact(p)}
          />
        ))}
      </div>

      <CustomPlanCallout onClick={openCustom} />

      {customOpen && (
        <CustomPlanPanel
          form={customForm}
          onChange={(patch) => setCustomForm((f) => ({ ...f, ...patch }))}
          onClose={() => setCustomOpen(false)}
          onSubmit={() => void submitCustom()}
          loading={contactMut.isPending}
        />
      )}

      {contactTarget && (
        <ContactSalesPanel
          open={!!contactTarget}
          plan={contactTarget}
          cycle={cycle}
          form={form}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          onClose={() => setContactTarget(null)}
          onSubmit={() => setConfirmOpen(true)}
          loading={contactMut.isPending}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('confirmTitle')}
        description={t('confirmDescription', {
          plan: contactTarget ? t(`names.${contactTarget.key}`) : '',
          cycle: t(`cycle.${cycle}`),
        })}
        confirmLabel={t('confirmSend')}
        cancelLabel={t('confirmCancel')}
        onConfirm={submitContact}
        loading={contactMut.isPending}
        variant="default"
      />
    </div>
  );
}

function BillingCycleToggle({
  value,
  onChange,
}: {
  value: BillingCycle;
  onChange: (v: BillingCycle) => void;
}) {
  const t = useTranslations('plans.cycle');
  const options: { key: BillingCycle; label: string; hint?: string }[] = [
    { key: 'MONTHLY', label: t('MONTHLY') },
    { key: 'YEARLY', label: t('YEARLY'), hint: t('saveHint') },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            'relative px-4 py-1.5 text-sm font-medium rounded-full transition-colors',
            value === o.key
              ? 'bg-gradient-to-r from-primary to-accent text-white shadow-soft'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
          {o.hint && value !== o.key && (
            <span className="ms-2 inline-block rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
              {o.hint}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function SubscriptionBanner({
  data,
  planEntry,
  onRenew,
}: {
  data: NonNullable<ReturnType<typeof useCurrentSubscription>['data']>;
  planEntry: PlanCatalogEntry | null;
  onRenew: () => void;
}) {
  const t = useTranslations('plans.banner');
  const tPlans = useTranslations('plans');
  const variants: Record<string, { bg: string; icon: React.ReactNode; title: string; desc: string }> = {
    TRIALING: {
      bg: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/30',
      icon: <Sparkles className="size-5 text-emerald-600" />,
      title: t('trialingTitle'),
      desc: t('trialingDesc', { days: data.daysRemaining ?? 0 }),
    },
    ACTIVE: {
      bg: 'from-primary/10 to-accent/5 border-primary/30',
      icon: <CheckCircle2 className="size-5 text-primary" />,
      title: t('activeTitle'),
      desc: t('activeDesc', { days: data.daysRemaining ?? 0 }),
    },
    PENDING_ACTIVATION: {
      bg: 'from-amber-500/10 to-amber-500/5 border-amber-500/30',
      icon: <Clock className="size-5 text-amber-600" />,
      title: t('pendingTitle'),
      desc: t('pendingDesc'),
    },
    EXPIRED: {
      bg: 'from-destructive/10 to-destructive/5 border-destructive/30',
      icon: <AlertCircle className="size-5 text-destructive" />,
      title: t('expiredTitle'),
      desc: t('expiredDesc'),
    },
  };
  const v = variants[data.status] ?? variants.ACTIVE;
  const Icon = PLAN_ICONS[data.plan];
  const endDateStr = data.plan === 'TRIAL' ? data.trialEndsAt : data.currentPeriodEnd;
  const formattedEnd = endDateStr
    ? new Date(endDateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;
  const showRenew = data.plan !== 'TRIAL' && data.status !== 'PENDING_ACTIVATION';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border bg-gradient-to-br p-5 flex flex-col md:flex-row md:items-center gap-5',
        v.bg,
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="shrink-0">{v.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{v.title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{v.desc}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 md:border-s md:ps-4 md:border-border/60">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-10 items-center justify-center rounded-xl shrink-0',
              data.plan === 'TRIAL'
                ? 'bg-emerald-500/15 text-emerald-600'
                : 'bg-gradient-to-br from-primary to-accent text-white',
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {tPlans('currentPlanLabel')}
            </p>
            <p className="font-semibold text-foreground truncate">
              {tPlans(`names.${data.plan}`)}
              {data.billingCycle && (
                <span className="ms-2 text-xs font-normal text-muted-foreground">
                  · {tPlans(`cycle.${data.billingCycle}`)}
                </span>
              )}
            </p>
            {formattedEnd && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {tPlans(data.status === 'EXPIRED' ? 'expiredOn' : 'expiresOn', {
                  date: formattedEnd,
                })}
              </p>
            )}
          </div>
        </div>

        {showRenew && planEntry && (
          <Button
            type="button"
            variant={data.status === 'EXPIRED' ? 'gradient' : 'default'}
            onClick={onRenew}
            className="shrink-0"
          >
            <RefreshCw className="size-4" />
            {tPlans('renew')}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function PlanCard({
  plan,
  cycle,
  currentPlan,
  currentCycle,
  currentStatus,
  onContact,
}: {
  plan: PlanCatalogEntry;
  cycle: BillingCycle;
  currentPlan: SubscriptionPlan | null;
  currentCycle: BillingCycle | null;
  currentStatus?: string;
  onContact: () => void;
}) {
  const t = useTranslations('plans');
  const Icon = PLAN_ICONS[plan.key];
  const price = plan.pricing
    ? cycle === 'MONTHLY'
      ? plan.pricing.monthly
      : plan.pricing.yearly
    : null;
  const currency = plan.pricing?.currency ?? '';
  const isCurrent =
    currentPlan === plan.key && currentCycle === cycle && currentStatus === 'ACTIVE';
  const isPending = currentPlan === plan.key && currentStatus === 'PENDING_ACTIVATION';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={cn(
        'relative rounded-2xl border bg-card p-6 flex flex-col shadow-soft',
        plan.highlight
          ? 'border-primary/40 ring-1 ring-primary/20'
          : 'border-border',
      )}
    >
      {plan.highlight && (
        <span className="absolute -top-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-white text-[11px] font-semibold shadow-glow">
          {t('mostPopular')}
        </span>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            'flex size-11 items-center justify-center rounded-xl',
            plan.highlight
              ? 'bg-gradient-to-br from-primary to-accent text-white'
              : 'bg-muted text-foreground',
          )}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{t(`names.${plan.key}`)}</h3>
          <p className="text-xs text-muted-foreground">{t(`tagline.${plan.key}`)}</p>
        </div>
      </div>

      <div className="my-3">
        {price !== null ? (
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tabular-nums">{price.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">{currency}</span>
            <span className="text-sm text-muted-foreground">
              / {cycle === 'MONTHLY' ? t('perMonth') : t('perYear')}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('contactForPrice')}</p>
        )}
      </div>

      <ul className="space-y-2.5 my-5 flex-1">
        <Feature icon={<Users className="size-4" />} label={t('limits.clients', { n: plan.limits.clients })} />
        <Feature icon={<Briefcase className="size-4" />} label={t('limits.employees', { n: plan.limits.employees })} />
        <Feature icon={<Building2 className="size-4" />} label={t('limits.branches', { n: plan.limits.branches })} />
        <Feature icon={<Check className="size-4 text-emerald-600" />} label={t('features.fullSuite')} />
        <Feature icon={<Check className="size-4 text-emerald-600" />} label={t('features.support')} />
      </ul>

      <Button
        type="button"
        variant={plan.highlight ? 'gradient' : 'outline'}
        onClick={onContact}
        disabled={isCurrent}
        className="w-full"
      >
        {isCurrent ? t('currentPlan') : isPending ? t('pendingActivation') : t('contactSales')}
      </Button>
    </motion.div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-foreground">{label}</span>
    </li>
  );
}

function ContactSalesPanel({
  open,
  plan,
  cycle,
  form,
  onChange,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  plan: PlanCatalogEntry;
  cycle: BillingCycle;
  form: { contactName: string; contactEmail: string; contactPhone: string; note: string };
  onChange: (patch: Partial<typeof form>) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const tForm = useTranslations('plans.contactForm');
  const tPlans = useTranslations('plans');
  const valid = form.contactName.trim().length > 0 && /\S+@\S+\.\S+/.test(form.contactEmail);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: open ? 1 : 0 }}
      className={cn(
        'fixed inset-0 z-[110] flex items-center justify-center p-4',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-elevated overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h3 className="text-lg font-semibold">{tForm('title')}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {tForm('subtitle', {
              plan: tPlans(`names.${plan.key}`),
              cycle: tPlans(`cycle.${cycle}`),
            })}
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onSubmit();
          }}
          className="p-6 space-y-4"
        >
          <div>
            <Label htmlFor="contactName">{tForm('name')}</Label>
            <Input
              id="contactName"
              value={form.contactName}
              onChange={(e) => onChange({ contactName: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="contactEmail">{tForm('email')}</Label>
            <div className="relative">
              <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={(e) => onChange({ contactEmail: e.target.value })}
                className="ps-9"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="contactPhone">{tForm('phone')}</Label>
            <div className="relative">
              <Phone className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="contactPhone"
                value={form.contactPhone}
                onChange={(e) => onChange({ contactPhone: e.target.value })}
                className="ps-9"
                placeholder="+20 100 000 0000"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="note">{tForm('note')}</Label>
            <textarea
              id="note"
              value={form.note}
              onChange={(e) => onChange({ note: e.target.value })}
              rows={3}
              className="flex w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground shadow-soft placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {tForm('cancel')}
            </Button>
            <Button type="submit" variant="gradient" disabled={!valid || loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {tForm('submit')}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function CustomPlanCallout({ onClick }: { onClick: () => void }) {
  const t = useTranslations('plans.custom');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-dashed border-primary/40 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-soft shrink-0">
          <Wand2 className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{t('title')}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{t('subtitle')}</p>
        </div>
      </div>
      <Button type="button" variant="gradient" onClick={onClick} className="shrink-0">
        <Wand2 className="size-4" />
        {t('cta')}
      </Button>
    </motion.div>
  );
}

function CustomPlanPanel({
  form,
  onChange,
  onClose,
  onSubmit,
  loading,
}: {
  form: {
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    clients: string;
    employees: string;
    note: string;
  };
  onChange: (patch: Partial<typeof form>) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const t = useTranslations('plans.custom');
  const tForm = useTranslations('plans.contactForm');
  const valid =
    form.contactName.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(form.contactEmail) &&
    form.clients.trim().length > 0 &&
    form.employees.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-elevated overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wand2 className="size-5 text-primary" />
            {t('formTitle')}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{t('formSubtitle')}</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onSubmit();
          }}
          className="p-6 space-y-4 overflow-y-auto"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="customClients">{t('clientsField')}</Label>
              <Input
                id="customClients"
                type="number"
                min={1}
                value={form.clients}
                onChange={(e) => onChange({ clients: e.target.value })}
                required
                placeholder="500"
              />
            </div>
            <div>
              <Label htmlFor="customEmployees">{t('employeesField')}</Label>
              <Input
                id="customEmployees"
                type="number"
                min={1}
                value={form.employees}
                onChange={(e) => onChange({ employees: e.target.value })}
                required
                placeholder="50"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="customName">{tForm('name')}</Label>
            <Input
              id="customName"
              value={form.contactName}
              onChange={(e) => onChange({ contactName: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="customEmail">{tForm('email')}</Label>
            <div className="relative">
              <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="customEmail"
                type="email"
                value={form.contactEmail}
                onChange={(e) => onChange({ contactEmail: e.target.value })}
                className="ps-9"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="customPhone">{tForm('phone')}</Label>
            <div className="relative">
              <Phone className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="customPhone"
                value={form.contactPhone}
                onChange={(e) => onChange({ contactPhone: e.target.value })}
                className="ps-9"
                placeholder="+20 100 000 0000"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="customNote">{tForm('note')}</Label>
            <textarea
              id="customNote"
              value={form.note}
              onChange={(e) => onChange({ note: e.target.value })}
              rows={3}
              className="flex w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground shadow-soft placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {tForm('cancel')}
            </Button>
            <Button type="submit" variant="gradient" disabled={!valid || loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {tForm('submit')}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
