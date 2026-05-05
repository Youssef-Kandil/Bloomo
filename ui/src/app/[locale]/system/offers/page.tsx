'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  useCreateOffer,
  useDeleteOffer,
  useSystemOffers,
  useUpdateOffer,
  type OfferInput,
  type OfferRow,
  type PlanKey,
} from '@/hooks/queries/system';

const PLAN_KEYS: PlanKey[] = ['BASIC', 'PRO', 'ENTERPRISE'];

const EMPTY_FORM: OfferInput = {
  code: '',
  title: '',
  description: '',
  discountPercent: 10,
  validFrom: new Date().toISOString().slice(0, 10),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  active: true,
  appliesTo: [],
};

export default function SystemOffersPage() {
  const t = useTranslations('system.offers');
  const offers = useSystemOffers();
  const createMut = useCreateOffer();
  const updateMut = useUpdateOffer();
  const deleteMut = useDeleteOffer();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OfferRow | null>(null);
  const [form, setForm] = useState<OfferInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<OfferRow | null>(null);

  function openCreate(): void {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(o: OfferRow): void {
    setEditing(o);
    setForm({
      code: o.code,
      title: o.title,
      description: o.description ?? '',
      discountPercent: o.discountPercent,
      validFrom: o.validFrom.slice(0, 10),
      validUntil: o.validUntil.slice(0, 10),
      active: o.active,
      appliesTo: o.appliesTo ?? [],
    });
    setOpen(true);
  }

  async function submit(): Promise<void> {
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: form });
        toast.success(t('updateSuccess'));
      } else {
        await createMut.mutateAsync(form);
        toast.success(t('createSuccess'));
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('error'));
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success(t('deleteSuccess'));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('error'));
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <Button type="button" variant="gradient" onClick={openCreate}>
          <Plus className="size-4" />
          {t('createCta')}
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {offers.data?.map((o) => (
          <div key={o.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Tag className="size-4 text-primary" />
                <code className="font-mono text-sm font-bold">{o.code}</code>
              </div>
              <span className="text-xl font-bold text-primary tabular-nums">{o.discountPercent}%</span>
            </div>
            <h3 className="font-semibold">{o.title}</h3>
            {o.description && <p className="text-sm text-muted-foreground">{o.description}</p>}
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>
                {t('validFrom')}: {new Date(o.validFrom).toLocaleDateString()} —{' '}
                {new Date(o.validUntil).toLocaleDateString()}
              </p>
              <p>
                {t('appliesTo')}:{' '}
                {Array.isArray(o.appliesTo) && o.appliesTo.length
                  ? o.appliesTo.join(', ')
                  : t('allPlans')}
              </p>
              <p>
                {t('status')}:{' '}
                {o.active ? (
                  <span className="text-emerald-600 font-medium">{t('active')}</span>
                ) : (
                  <span className="text-muted-foreground">{t('inactive')}</span>
                )}
              </p>
            </div>
            <div className="flex justify-end gap-1 pt-2 border-t border-border">
              <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(o)}>
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(o)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {!offers.isLoading && (offers.data?.length ?? 0) === 0 && (
          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            {t('empty')}
          </div>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? t('editTitle') : t('createTitle')}</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-4">
            <div>
              <Label>{t('code')}</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="LAUNCH50"
                disabled={!!editing}
              />
            </div>
            <div>
              <Label>{t('titleField')}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>{t('description')}</Label>
              <textarea
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="flex w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm shadow-soft"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('discountPercent')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.discountPercent}
                  onChange={(e) =>
                    setForm({ ...form, discountPercent: Number.parseInt(e.target.value, 10) || 0 })
                  }
                />
              </div>
              <div>
                <Label>{t('activeField')}</Label>
                <select
                  value={form.active ? '1' : '0'}
                  onChange={(e) => setForm({ ...form, active: e.target.value === '1' })}
                  className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm shadow-soft"
                >
                  <option value="1">{t('active')}</option>
                  <option value="0">{t('inactive')}</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('validFrom')}</Label>
                <Input
                  type="date"
                  value={form.validFrom}
                  onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('validUntil')}</Label>
                <Input
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>{t('appliesTo')}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PLAN_KEYS.map((p) => {
                  const checked = form.appliesTo?.includes(p) ?? false;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          appliesTo: checked
                            ? form.appliesTo?.filter((x) => x !== p) ?? []
                            : [...(form.appliesTo ?? []), p],
                        })
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        checked
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('appliesHint')}</p>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={createMut.isPending || updateMut.isPending}>
              {t('cancel')}
            </Button>
            <Button
              variant="gradient"
              onClick={submit}
              disabled={
                !form.code ||
                !form.title ||
                form.discountPercent < 1 ||
                createMut.isPending ||
                updateMut.isPending
              }
            >
              {(createMut.isPending || updateMut.isPending) && <Loader2 className="size-4 animate-spin" />}
              {t('save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('confirmDeleteTitle')}
        description={t('confirmDeleteDescription', { code: deleteTarget?.code ?? '' })}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        loading={deleteMut.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
