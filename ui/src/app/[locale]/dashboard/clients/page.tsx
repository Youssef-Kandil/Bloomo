'use client';

import axios from 'axios';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  FileText,
  KeyRound,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserSquare2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { LocationPicker } from '@/components/map/LocationPicker';
import { DetailDrawer, DetailRow } from '@/components/shared/DetailDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PasswordInput,
  isPasswordValid,
  usePasswordRules,
} from '@/components/ui/password-input';
import {
  useClients,
  useCreateClient,
  useCreateClientAccount,
  useDeleteClient,
  useUpdateClient,
  type Client,
  type ClientInput,
  type ClientPhone,
} from '@/hooks/queries/clients';
import { useMarkSupplyPaid, useSupplyOperations } from '@/hooks/queries/supply';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
import { cn } from '@/lib/utils';

const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), { ssr: false });

type DrawerState =
  | { mode: 'create' }
  | { mode: 'view'; client: Client }
  | { mode: 'edit'; client: Client }
  | null;

export default function ClientsPage() {
  const t = useTranslations();
  const [query, setQuery] = useState('');
  const list = useClients(query);
  const createMut = useCreateClient();
  const createAccountMut = useCreateClientAccount();
  const updateMut = useUpdateClient();
  const deleteMut = useDeleteClient();

  const [drawer, setDrawer] = useState<DrawerState>(null);

  const items = list.data?.items ?? [];

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
      <motion.header variants={item} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('clients.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{list.data?.total ?? 0}</p>
        </div>
        <Button variant="gradient" onClick={() => setDrawer({ mode: 'create' })}>
          <Plus className="size-4" />
          {t('common.create')}
        </Button>
      </motion.header>

      <motion.div variants={item}>
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="flex items-center gap-2">
              <UserSquare2 className="size-5 text-primary" />
              {t('clients.title')}
            </CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ps-10 h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {list.isLoading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg shimmer" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="p-8 text-sm text-muted-foreground text-center">{t('clients.empty')}</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((c, i) => {
                  const wa = c.phones.find((p) => p.isWhatsapp);
                  return (
                    <motion.li
                      key={c.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.25 }}
                      onClick={() => setDrawer({ mode: 'view', client: c })}
                      className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-muted/50"
                    >
                      <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-semibold shrink-0">
                        {initialsOf(c.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{c.name}</p>
                          {c.marketingOptIn && (
                            <Badge variant="success" className="text-[10px] py-0 h-4">
                              Opt-in
                            </Badge>
                          )}
                          {c.accountUser && (
                            <ShieldCheck
                              className="size-3.5 text-[hsl(var(--success))] shrink-0"
                              aria-label="Has login"
                            />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <MapPin className="size-3 shrink-0" />
                          {c.address}
                        </p>
                      </div>
                      {wa && (
                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MessageCircle className="size-3.5 text-[hsl(var(--success))]" />
                          <span dir="ltr">{wa.phone}</span>
                        </div>
                      )}
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <ClientFormDrawer
        open={drawer?.mode === 'create'}
        onClose={() => setDrawer(null)}
        title={t('clients.addTitle')}
        description={t('clients.addDesc')}
        submitLabel={t('common.create')}
        requireAccount
        onSubmit={async (input, account) => {
          const client = await createMut.mutateAsync(input);
          if (account) {
            await createAccountMut.mutateAsync({
              clientId: client.id,
              email: account.email,
              password: account.password,
            });
          }
          setDrawer(null);
        }}
        submitting={createMut.isPending || createAccountMut.isPending}
      />

      {drawer?.mode === 'edit' && (
        <ClientFormDrawer
          open
          onClose={() => setDrawer(null)}
          title={t('clients.editTitle')}
          description={t('clients.editDesc')}
          submitLabel={t('common.save')}
          initial={drawer.client}
          onSubmit={async (input) => {
            await updateMut.mutateAsync({ id: drawer.client.id, ...input });
            setDrawer(null);
          }}
          submitting={updateMut.isPending}
        />
      )}

      {drawer?.mode === 'view' && (
        <ClientViewDrawer
          client={drawer.client}
          onClose={() => setDrawer(null)}
          onEdit={() => setDrawer({ mode: 'edit', client: drawer.client })}
          onDelete={async () => {
            await deleteMut.mutateAsync(drawer.client.id);
            setDrawer(null);
          }}
          deleting={deleteMut.isPending}
        />
      )}
    </motion.div>
  );
}

function ClientViewDrawer({
  client,
  onClose,
  onEdit,
  onDelete,
  deleting,
}: {
  client: Client;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  deleting: boolean;
}): React.ReactElement {
  const t = useTranslations();
  const geo = useReverseGeocode(client.lat, client.lng);

  return (
    <DetailDrawer
      open
      onOpenChange={(o) => !o && onClose()}
      mode="view"
      title={client.name}
      description={client.address}
      onEdit={onEdit}
      onDelete={onDelete}
      deleting={deleting}
      editLabel={t('common.edit')}
      deleteLabel={t('common.delete')}
    >
      <div className="space-y-1">
        <DetailRow label={t('clients.name')}>{client.name}</DetailRow>
        <DetailRow label={t('clients.address')}>{client.address}</DetailRow>
        <DetailRow label={t('clients.phones')}>
          <div className="flex flex-col items-end gap-1">
            {client.phones.map((p, i) => (
              <div key={p.id ?? i} className="flex items-center gap-2" dir="ltr">
                <span className="text-xs text-muted-foreground">{p.label}</span>
                <a href={`tel:${p.phone}`} className="text-primary hover:underline">
                  {p.phone}
                </a>
                {p.isWhatsapp && (
                  <MessageCircle className="size-3.5 text-[hsl(var(--success))]" />
                )}
              </div>
            ))}
          </div>
        </DetailRow>
        <DetailRow label={t('clients.marketingOptIn')}>
          {client.marketingOptIn ? (
            <Badge variant="success">{t('common.yes')}</Badge>
          ) : (
            <Badge variant="outline">{t('common.no')}</Badge>
          )}
        </DetailRow>
        <DetailRow label={t('clients.account')}>
          {client.accountUser ? (
            <span className="flex items-center gap-1.5 text-[hsl(var(--success))]">
              <ShieldCheck className="size-3.5" />
              <span dir="ltr">{client.accountUser.email}</span>
            </span>
          ) : (
            <Badge variant="outline">{t('clients.noAccount')}</Badge>
          )}
        </DetailRow>
        {client.note && <DetailRow label={t('clients.note')}>{client.note}</DetailRow>}
      </div>

      <div className="mt-6 space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <MapPin className="size-4 text-primary" />
          {t('clients.location')}
        </h3>
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <MapPin className="size-4 shrink-0 text-primary mt-0.5" />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'text-sm font-medium break-words',
                geo.isLoading && 'text-muted-foreground animate-pulse',
              )}
            >
              {geo.isLoading
                ? t('employees.locatingAddress')
                : geo.data?.label || t('employees.unknownAddress')}
            </p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {client.lat.toFixed(5)}, {client.lng.toFixed(5)}
            </p>
          </div>
        </div>
        <div className="rounded-lg overflow-hidden border border-border">
          <LeafletMap
            center={{ lat: client.lat, lng: client.lng }}
            markers={[{ id: client.id, lat: client.lat, lng: client.lng, label: client.name }]}
            height="220px"
            zoom={14}
          />
        </div>
      </div>

      <ClientDeferredInvoices clientId={client.id} />
    </DetailDrawer>
  );
}

function ClientDeferredInvoices({ clientId }: { clientId: string }): React.ReactElement | null {
  const t = useTranslations();
  const ops = useSupplyOperations({ clientId, status: 'deferred' });
  const markPaidMut = useMarkSupplyPaid();

  if (ops.isLoading) return null;
  const list = ops.data ?? [];
  if (list.length === 0) return null;

  const total = list.reduce((sum, o) => sum + (o.invoiceAmount ?? 0), 0);

  return (
    <div className="mt-6 space-y-2">
      <h3 className="flex items-center justify-between text-sm font-semibold">
        <span className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          {t('clients.deferredInvoices')}
        </span>
        <span className="font-mono text-primary">{total.toLocaleString()}</span>
      </h3>
      <div className="rounded-lg border border-border divide-y divide-border">
        {list.map((op) => (
          <div key={op.id} className="px-3 py-2 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-xs text-muted-foreground">
                {new Date(op.createdAt).toLocaleDateString()}
              </span>
              <span className="font-mono font-semibold">
                {op.invoiceAmount?.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {op.items.map((it) => `${it.inventoryItem.name}×${it.qty}`).join(' · ')}
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {t('inventory.employee')}: {op.employee.name}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await markPaidMut.mutateAsync(op.id);
                    toast.success(t('inventory.collectDeferredSuccess'));
                  } catch (err) {
                    if (axios.isAxiosError(err)) {
                      toast.error(
                        (err.response?.data as { message?: string } | undefined)?.message ??
                          err.message,
                      );
                    } else {
                      toast.error(String(err));
                    }
                  }
                }}
                disabled={markPaidMut.isPending}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                {t('inventory.collectDeferred')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PhoneRow {
  label: string;
  phone: string;
  isWhatsapp: boolean;
}

function ClientFormDrawer({
  open,
  onClose,
  title,
  description,
  submitLabel,
  initial,
  requireAccount = false,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  submitLabel: string;
  initial?: Client;
  requireAccount?: boolean;
  onSubmit: (
    input: ClientInput,
    account?: { email: string; password: string },
  ) => Promise<void>;
  submitting: boolean;
}): React.ReactElement {
  const t = useTranslations();
  const pwRules = usePasswordRules();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordOk = isPasswordValid(password, pwRules);
  const accountOk = !requireAccount || (emailValid && passwordOk);
  const [name, setName] = useState(initial?.name ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [marketingOptIn, setMarketingOptIn] = useState(initial?.marketingOptIn ?? false);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(
    initial ? { lat: initial.lat, lng: initial.lng } : { lat: 30.0444, lng: 31.2357 },
  );
  const [phones, setPhones] = useState<PhoneRow[]>(
    initial?.phones?.length
      ? initial.phones.map(({ label, phone, isWhatsapp }: ClientPhone) => ({
          label,
          phone,
          isWhatsapp,
        }))
      : [{ label: '', phone: '', isWhatsapp: true }],
  );

  const phonesClean = phones
    .map((p) => ({ ...p, label: p.label.trim(), phone: p.phone.trim() }))
    .filter((p) => p.phone.length > 0);
  const phoneFormatOk = phonesClean.every(
    (p) => p.phone.length >= 5 && p.phone.length <= 20 && p.label.length >= 1,
  );
  const waCount = phonesClean.filter((p) => p.isWhatsapp).length;
  const waOk = waCount === 1;
  const addressValid = address.trim().length >= 3;
  const phonesCountOk = phonesClean.length >= 1 && phonesClean.length <= 3;
  const canSubmit =
    name.trim().length >= 2 &&
    addressValid &&
    phonesCountOk &&
    phoneFormatOk &&
    waOk &&
    accountOk;

  async function submit(): Promise<void> {
    await onSubmit(
      {
        name: name.trim(),
        note: note.trim() || undefined,
        address: address.trim(),
        lat: coords.lat,
        lng: coords.lng,
        marketingOptIn,
        phones: phonesClean,
      },
      requireAccount ? { email: email.trim().toLowerCase(), password } : undefined,
    );
  }

  function updatePhone(i: number, patch: Partial<PhoneRow>): void {
    setPhones((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function toggleWa(i: number): void {
    setPhones((prev) => prev.map((p, idx) => ({ ...p, isWhatsapp: idx === i })));
  }

  return (
    <DetailDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
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
          <Label htmlFor="client-name">
            {t('clients.name')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="client-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </div>

        {requireAccount && (
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-primary" />
              {t('clients.account')}
            </div>
            <p className="text-xs text-muted-foreground -mt-1">{t('clients.accountHint')}</p>
            <div className="space-y-2">
              <Label htmlFor="client-email">
                {t('clients.accountEmail')} <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="client-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  dir="ltr"
                  className="ps-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-password">
                {t('clients.accountPassword')} <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <KeyRound className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-10 pointer-events-none" />
                <PasswordInput
                  id="client-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ps-10"
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="client-address">
            {t('clients.address')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="client-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={255}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('clients.location')}</Label>
          <LocationPicker initial={coords} onChange={setCoords} height="240px" />
        </div>

        {/* Phones */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>
              {t('clients.phones')} <span className="text-destructive">*</span>
              <span className="ms-1 text-xs font-normal text-muted-foreground">
                ({phones.length}/3)
              </span>
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setPhones((prev) => [...prev, { label: '', phone: '', isWhatsapp: false }])
              }
              disabled={phones.length >= 3}
            >
              <Plus className="size-4" />
              {t('clients.addPhone')}
            </Button>
          </div>
          <div className="space-y-2">
            {phones.map((p, i) => {
              const canRemove = phones.length > 1;
              const trimmed = p.phone.trim();
              const invalid =
                trimmed.length > 0 && (trimmed.length < 5 || trimmed.length > 20);
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-muted/20 p-3 space-y-2"
                >
                  <div className="grid grid-cols-[120px,1fr,auto] gap-2">
                    <Input
                      value={p.label}
                      onChange={(e) => updatePhone(i, { label: e.target.value })}
                      placeholder={t('clients.labelPlaceholder')}
                      maxLength={50}
                    />
                    <div className="relative">
                      <Phone className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        value={p.phone}
                        onChange={(e) => updatePhone(i, { phone: e.target.value })}
                        placeholder="+20 100 000 0000"
                        dir="ltr"
                        className={cn(
                          'ps-10',
                          invalid && 'border-destructive focus-visible:ring-destructive',
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={!canRemove}
                      onClick={() => setPhones((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleWa(i)}
                    className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 transition-colors',
                      p.isWhatsapp
                        ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70',
                    )}
                  >
                    <MessageCircle className="size-3.5" />
                    {t('clients.markWhatsapp')}
                  </button>
                </div>
              );
            })}
            {!waOk && (
              <p className="text-xs text-destructive">{t('clients.whatsappHint')}</p>
            )}
          </div>
        </div>

        {/* Marketing opt-in */}
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">{t('clients.marketingOptIn')}</p>
            <p className="text-xs text-muted-foreground">{t('clients.marketingOptInDesc')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={marketingOptIn}
            onClick={() => setMarketingOptIn((v) => !v)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
              marketingOptIn ? 'bg-primary' : 'bg-muted',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-5 rounded-full bg-white shadow-soft transition-transform',
                marketingOptIn
                  ? 'translate-x-5 rtl:-translate-x-5'
                  : 'translate-x-0.5 rtl:-translate-x-0.5',
              )}
            />
          </button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-note">{t('clients.note')}</Label>
          <textarea
            id="client-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('clients.notePlaceholder')}
            maxLength={1000}
            rows={3}
            className="flex w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground shadow-soft placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent resize-none"
          />
        </div>
      </div>
    </DetailDrawer>
  );
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
