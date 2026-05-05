'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Save, Sparkles, Star } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSystemPlans, useUpdatePlan, type PlanRow } from '@/hooks/queries/system';

export default function SystemPlansPage() {
  const t = useTranslations('system.plans');
  const plans = useSystemPlans();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl md:text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </header>

      {plans.isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.data?.map((p) => (
          <PlanEditor key={p.id} plan={p} />
        ))}
      </div>
    </div>
  );
}

function PlanEditor({ plan }: { plan: PlanRow }) {
  const t = useTranslations('system.plans');
  const mut = useUpdatePlan();

  const [draft, setDraft] = useState(plan);
  useEffect(() => setDraft(plan), [plan]);

  const dirty =
    draft.name !== plan.name ||
    draft.tagline !== plan.tagline ||
    draft.monthlyPrice !== plan.monthlyPrice ||
    draft.yearlyPrice !== plan.yearlyPrice ||
    draft.currency !== plan.currency ||
    draft.clientsLimit !== plan.clientsLimit ||
    draft.employeesLimit !== plan.employeesLimit ||
    draft.branchesLimit !== plan.branchesLimit ||
    draft.active !== plan.active ||
    draft.highlight !== plan.highlight;

  async function save(): Promise<void> {
    try {
      await mut.mutateAsync({
        id: plan.id,
        data: {
          name: draft.name,
          tagline: draft.tagline,
          monthlyPrice: draft.monthlyPrice,
          yearlyPrice: draft.yearlyPrice,
          currency: draft.currency,
          clientsLimit: draft.clientsLimit,
          employeesLimit: draft.employeesLimit,
          branchesLimit: draft.branchesLimit,
          active: draft.active,
          highlight: draft.highlight,
        },
      });
      toast.success(t('saved'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('saveError'));
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-muted">
          {plan.key}
        </span>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
            />
            {t('active')}
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.highlight}
              onChange={(e) => setDraft({ ...draft, highlight: e.target.checked })}
            />
            <Star className="size-3" /> {t('highlight')}
          </label>
        </div>
      </div>

      <div>
        <Label>{t('name')}</Label>
        <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </div>
      <div>
        <Label>{t('tagline')}</Label>
        <Input
          value={draft.tagline ?? ''}
          onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t('monthlyPrice')}</Label>
          <Input
            type="number"
            min={0}
            value={draft.monthlyPrice}
            onChange={(e) =>
              setDraft({ ...draft, monthlyPrice: Number.parseFloat(e.target.value) || 0 })
            }
          />
        </div>
        <div>
          <Label>{t('yearlyPrice')}</Label>
          <Input
            type="number"
            min={0}
            value={draft.yearlyPrice}
            onChange={(e) =>
              setDraft({ ...draft, yearlyPrice: Number.parseFloat(e.target.value) || 0 })
            }
          />
        </div>
      </div>
      <div>
        <Label>{t('currency')}</Label>
        <Input
          maxLength={3}
          value={draft.currency}
          onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>{t('clientsLimit')}</Label>
          <Input
            type="number"
            min={0}
            value={draft.clientsLimit}
            onChange={(e) =>
              setDraft({ ...draft, clientsLimit: Number.parseInt(e.target.value, 10) || 0 })
            }
          />
        </div>
        <div>
          <Label>{t('employeesLimit')}</Label>
          <Input
            type="number"
            min={0}
            value={draft.employeesLimit}
            onChange={(e) =>
              setDraft({ ...draft, employeesLimit: Number.parseInt(e.target.value, 10) || 0 })
            }
          />
        </div>
        <div>
          <Label>{t('branchesLimit')}</Label>
          <Input
            type="number"
            min={0}
            value={draft.branchesLimit}
            onChange={(e) =>
              setDraft({ ...draft, branchesLimit: Number.parseInt(e.target.value, 10) || 0 })
            }
          />
        </div>
      </div>

      <Button
        type="button"
        variant="gradient"
        className="w-full"
        onClick={save}
        disabled={!dirty || mut.isPending}
      >
        {mut.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        {t('save')}
      </Button>
    </div>
  );
}
