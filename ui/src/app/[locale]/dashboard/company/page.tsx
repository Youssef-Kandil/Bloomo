'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Building2, MapPin, Navigation, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { LocationPicker } from '@/components/map/LocationPicker';
import { DetailDrawer, DetailRow } from '@/components/shared/DetailDrawer';
import { LimitReachedNotice } from '@/components/shared/LimitReachedNotice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCompany,
  useCreateBranch,
  useDeleteBranch,
  useUpdateBranch,
  useUpdateCompany,
  type Branch,
  type BranchInput,
} from '@/hooks/queries/company';
import { useCurrentSubscription } from '@/hooks/queries/subscription';

type BranchDrawer =
  | { mode: 'create' }
  | { mode: 'view'; branch: Branch }
  | { mode: 'edit'; branch: Branch }
  | null;

export default function CompanyPage() {
  const t = useTranslations();
  const company = useCompany();
  const updateCompany = useUpdateCompany();
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();

  const [companyOpen, setCompanyOpen] = useState(false);
  const [branch, setBranch] = useState<BranchDrawer>(null);
  const sub = useCurrentSubscription();
  const atBranchLimit = sub.data?.atLimit?.branches ?? false;

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 180, damping: 22 },
    },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.header variants={item}>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('company.title')}</h1>
      </motion.header>

      {/* Company card */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              {t('company.details')}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompanyOpen(true)}
              disabled={!company.data}
            >
              <Pencil className="size-4" />
              {t('common.edit')}
            </Button>
          </CardHeader>
          <CardContent>
            {company.isLoading ? (
              <div className="h-12 rounded-lg shimmer" />
            ) : company.data ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('company.name')}
                </p>
                <p className="text-xl font-bold">{company.data.name}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>

      {/* Branches */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" />
              {t('company.branches')}
              <span className="text-sm font-normal text-muted-foreground">
                ({company.data?.branches.length ?? 0})
              </span>
            </CardTitle>
            {atBranchLimit && sub.data ? (
              <LimitReachedNotice
                resource="branches"
                used={sub.data.usage?.branches ?? 0}
                limit={sub.data.limits?.branches ?? 0}
                compact
              />
            ) : (
              <Button variant="gradient" size="sm" onClick={() => setBranch({ mode: 'create' })}>
                <Plus className="size-4" />
                {t('common.create')}
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {company.isLoading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg shimmer" />
                ))}
              </div>
            ) : !company.data?.branches.length ? (
              <p className="p-8 text-sm text-muted-foreground text-center">
                {t('company.empty')}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {company.data.branches.map((b, i) => (
                  <motion.li
                    key={b.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.25 }}
                    onClick={() => setBranch({ mode: 'view', branch: b })}
                    className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <MapPin className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {b.address || t('company.noAddress')}
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                      {b.phones && b.phones.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" />
                          {b.phones.length}
                        </span>
                      )}
                      {b.lat != null && b.lng != null && (
                        <span className="flex items-center gap-1 font-mono">
                          <Navigation className="size-3" />
                          {b.lat.toFixed(3)}, {b.lng.toFixed(3)}
                        </span>
                      )}
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Company edit drawer */}
      {company.data && (
        <CompanyEditDrawer
          open={companyOpen}
          onClose={() => setCompanyOpen(false)}
          initialName={company.data.name}
          onSubmit={async (name) => {
            await updateCompany.mutateAsync({ name });
            setCompanyOpen(false);
          }}
          submitting={updateCompany.isPending}
        />
      )}

      {/* Branch create drawer */}
      <BranchFormDrawer
        open={branch?.mode === 'create'}
        onClose={() => setBranch(null)}
        title={t('company.branchAddTitle')}
        description={t('company.branchAddDesc')}
        submitLabel={t('common.create')}
        onSubmit={async (input) => {
          await createBranch.mutateAsync(input);
          setBranch(null);
        }}
        submitting={createBranch.isPending}
      />

      {/* Branch edit drawer */}
      {branch?.mode === 'edit' && (
        <BranchFormDrawer
          open
          onClose={() => setBranch(null)}
          title={t('company.branchEditTitle')}
          description={t('company.branchEditDesc')}
          submitLabel={t('common.save')}
          initial={branch.branch}
          onSubmit={async (input) => {
            await updateBranch.mutateAsync({ id: branch.branch.id, ...input });
            setBranch(null);
          }}
          submitting={updateBranch.isPending}
        />
      )}

      {/* Branch view drawer */}
      {branch?.mode === 'view' && (
        <DetailDrawer
          open
          onOpenChange={(o) => !o && setBranch(null)}
          mode="view"
          title={branch.branch.name}
          description={branch.branch.address || t('company.noAddress')}
          onEdit={() => setBranch({ mode: 'edit', branch: branch.branch })}
          onDelete={async () => {
            await deleteBranch.mutateAsync(branch.branch.id);
            setBranch(null);
          }}
          deleting={deleteBranch.isPending}
          editLabel={t('common.edit')}
          deleteLabel={t('common.delete')}
        >
          <div className="space-y-1">
            <DetailRow label={t('company.branchName')}>{branch.branch.name}</DetailRow>
            <DetailRow label={t('company.address')}>
              {branch.branch.address || (
                <span className="text-muted-foreground">{t('company.noAddress')}</span>
              )}
            </DetailRow>
            <DetailRow label={t('company.phones')}>
              {branch.branch.phones && branch.branch.phones.length > 0 ? (
                <div className="flex flex-col items-end gap-1">
                  {branch.branch.phones.map((p, i) => (
                    <a
                      key={i}
                      href={`tel:${p}`}
                      className="flex items-center gap-1.5 text-primary hover:underline"
                      dir="ltr"
                    >
                      <Phone className="size-3.5" />
                      {p}
                    </a>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">{t('company.noPhones')}</span>
              )}
            </DetailRow>
            {branch.branch.lat != null && branch.branch.lng != null && (
              <DetailRow label={t('company.coordinates')}>
                <span className="font-mono text-xs">
                  {branch.branch.lat.toFixed(5)}, {branch.branch.lng.toFixed(5)}
                </span>
              </DetailRow>
            )}
          </div>
        </DetailDrawer>
      )}
    </motion.div>
  );
}

function CompanyEditDrawer({
  open,
  onClose,
  initialName,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  initialName: string;
  onSubmit: (name: string) => Promise<void>;
  submitting: boolean;
}): React.ReactElement {
  const t = useTranslations();
  const [name, setName] = useState(initialName);

  return (
    <DetailDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      mode="edit"
      title={t('company.editTitle')}
      description={t('company.editDesc')}
      onSubmit={() => onSubmit(name.trim())}
      submitting={submitting}
      submitDisabled={name.trim().length < 2}
      submitLabel={t('common.save')}
      cancelLabel={t('common.cancel')}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company-name">
            {t('company.name')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="company-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </div>
      </div>
    </DetailDrawer>
  );
}

function BranchFormDrawer({
  open,
  onClose,
  title,
  description,
  submitLabel,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  submitLabel: string;
  initial?: Branch;
  onSubmit: (input: BranchInput) => Promise<void>;
  submitting: boolean;
}): React.ReactElement {
  const t = useTranslations();
  const [name, setName] = useState(initial?.name ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial?.lat != null && initial?.lng != null ? { lat: initial.lat, lng: initial.lng } : null,
  );
  const [phones, setPhones] = useState<string[]>(
    initial?.phones && initial.phones.length > 0 ? initial.phones : [''],
  );

  const phonesClean = phones.map((p) => p.trim()).filter(Boolean);
  const phonesFormatValid = phonesClean.every((p) => p.length >= 5 && p.length <= 20);
  const phonesCountValid = phonesClean.length >= 1 && phonesClean.length <= 3;
  const canSubmit = name.trim().length >= 2 && phonesFormatValid && phonesCountValid;

  function reset(): void {
    setName(initial?.name ?? '');
    setAddress(initial?.address ?? '');
    setCoords(
      initial?.lat != null && initial?.lng != null ? { lat: initial.lat, lng: initial.lng } : null,
    );
    setPhones(initial?.phones && initial.phones.length > 0 ? initial.phones : ['']);
  }

  async function submit(): Promise<void> {
    await onSubmit({
      name: name.trim(),
      address: address.trim() || undefined,
      lat: coords?.lat,
      lng: coords?.lng,
      phones: phonesClean,
    });
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
      mode={initial ? 'edit' : 'create'}
      title={title}
      description={description}
      onSubmit={submit}
      submitting={submitting}
      submitDisabled={!canSubmit}
      submitLabel={submitLabel}
      cancelLabel={t('common.cancel')}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="branch-name">
            {t('company.branchName')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="branch-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch-address">{t('company.address')}</Label>
          <Input
            id="branch-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={255}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>
              {t('company.phones')} <span className="text-destructive">*</span>
              <span className="ms-1 text-xs font-normal text-muted-foreground">
                ({phones.length}/3)
              </span>
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPhones((prev) => [...prev, ''])}
              disabled={phones.length >= 3}
            >
              <Plus className="size-4" />
              {t('company.addPhone')}
            </Button>
          </div>
          <div className="space-y-2">
            {phones.map((p, i) => {
              const trimmed = p.trim();
              const invalid = trimmed.length > 0 && (trimmed.length < 5 || trimmed.length > 20);
              const canRemove = phones.length > 1;
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={p}
                      onChange={(e) =>
                        setPhones((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                      }
                      placeholder={t('company.phonePlaceholder')}
                      dir="ltr"
                      className={invalid ? 'ps-10 border-destructive focus-visible:ring-destructive' : 'ps-10'}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPhones((prev) => prev.filter((_, idx) => idx !== i))}
                    disabled={!canRemove}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
            {!phonesFormatValid && (
              <p className="text-xs text-destructive">{t('company.phoneInvalid')}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('company.pickLocation')}</Label>
          <LocationPicker
            initial={coords ?? undefined}
            onChange={setCoords}
            height="260px"
          />
        </div>
      </div>
    </DetailDrawer>
  );
}
