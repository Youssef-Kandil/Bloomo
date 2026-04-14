'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  User,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { useReverseGeocode } from '@/hooks/useReverseGeocode';

import { EmployeeMarkers } from '@/components/map/EmployeeMarkers';
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
  useCreateEmployee,
  useDeleteEmployee,
  useEmployees,
  useUpdateEmployee,
  type CreateEmployeeInput,
  type Employee,
} from '@/hooks/queries/employees';
import { useResource } from '@/hooks/queries/generic';
import { cn } from '@/lib/utils';

const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), { ssr: false });

interface CurrentLocations {
  employees: Array<{
    id: string;
    currentLat: number | null;
    currentLng: number | null;
    user: { name: string };
  }>;
}

type DrawerState =
  | { mode: 'create' }
  | { mode: 'view'; employee: Employee }
  | { mode: 'edit'; employee: Employee }
  | null;

export default function EmployeesPage() {
  const t = useTranslations();
  const list = useEmployees();
  const live = useResource<CurrentLocations>(['tracking', 'current'], '/api/tracking/current');
  const createMut = useCreateEmployee();
  const updateMut = useUpdateEmployee();
  const deleteMut = useDeleteEmployee();

  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const items = list.data?.items ?? [];
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q),
    );
  }, [list.data, query]);

  const liveById = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number }>();
    for (const e of live.data?.employees ?? []) {
      if (e.currentLat != null && e.currentLng != null) {
        map.set(e.id, { lat: e.currentLat, lng: e.currentLng });
      }
    }
    return map;
  }, [live.data]);

  const markers = Array.from(liveById.entries()).map(([id, loc]) => {
    const user = list.data?.items?.find((u) => u.id === id);
    return { id, name: user?.name ?? '—', ...loc };
  });

  function closeDrawer(): void {
    setDrawer(null);
  }

  async function onDelete(emp: Employee): Promise<void> {
    await deleteMut.mutateAsync(emp.id);
    closeDrawer();
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 180, damping: 22 } },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.header variants={item} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('employees.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {list.data?.total ?? 0} · {t('employees.title')}
          </p>
        </div>
        <Button variant="gradient" onClick={() => setDrawer({ mode: 'create' })}>
          <Plus className="size-4" />
          {t('common.create')}
        </Button>
      </motion.header>

      <motion.div variants={item}>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {markers.length > 0 ? (
            <div className="h-72 md:h-80">
              <EmployeeMarkers initial={markers} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              <MapPin className="size-4 me-2" />
              {t('common.empty')}
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      <motion.div variants={item}>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2">
            <User className="size-5 text-primary" />
            {t('employees.title')}
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
                <div key={i} className="h-12 rounded-lg shimmer" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-sm text-muted-foreground text-center">{t('common.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-start font-medium px-5 py-3">{t('employees.name')}</th>
                    <th className="text-start font-medium px-5 py-3">{t('employees.email')}</th>
                    <th className="text-start font-medium px-5 py-3">{t('common.status')}</th>
                    <th className="text-start font-medium px-5 py-3">{t('employees.lastPing')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((e, i) => (
                    <motion.tr
                      key={e.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.25 }}
                      onClick={() => setDrawer({ mode: 'view', employee: e })}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-muted/50',
                        e.active === false && 'opacity-60',
                      )}
                    >
                      <td className="px-5 py-3 font-medium">{e.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{e.email}</td>
                      <td className="px-5 py-3">
                        {e.active === false ? (
                          <Badge variant="destructive" className="gap-1">
                            <UserX className="size-3" />
                            {t('common.inactive')}
                          </Badge>
                        ) : (
                          <Badge variant="success" className="gap-1">
                            <UserCheck className="size-3" />
                            {t('common.active')}
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {e.employee?.lastPingAt
                          ? new Date(e.employee.lastPingAt).toLocaleString()
                          : '—'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {/* Create drawer */}
      <CreateDrawer
        open={drawer?.mode === 'create'}
        onClose={closeDrawer}
        onSubmit={async (input) => {
          await createMut.mutateAsync(input);
          closeDrawer();
        }}
        submitting={createMut.isPending}
        error={createMut.error instanceof Error ? createMut.error.message : null}
      />

      {/* Edit drawer */}
      {drawer?.mode === 'edit' && (
        <EditDrawer
          employee={drawer.employee}
          onClose={closeDrawer}
          onSubmit={async (patch) => {
            await updateMut.mutateAsync({ id: drawer.employee.id, ...patch });
            closeDrawer();
          }}
          submitting={updateMut.isPending}
        />
      )}

      {/* View drawer */}
      {drawer?.mode === 'view' && (
        <DetailDrawer
          open
          onOpenChange={(o) => !o && closeDrawer()}
          mode="view"
          title={drawer.employee.name}
          description={drawer.employee.email}
          onEdit={() => setDrawer({ mode: 'edit', employee: drawer.employee })}
          onDelete={() => onDelete(drawer.employee)}
          deleting={deleteMut.isPending}
          editLabel={t('common.edit')}
          deleteLabel={t('common.delete')}
        >
          <div className="space-y-1">
            <DetailRow label={t('employees.email')}>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="size-3.5" />
                {drawer.employee.email}
              </span>
            </DetailRow>
            {drawer.employee.whatsappPhone && (
              <DetailRow label={t('employees.whatsapp')}>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="size-3.5" />
                  {drawer.employee.whatsappPhone}
                </span>
              </DetailRow>
            )}
            <DetailRow label={t('common.status')}>
              {drawer.employee.active === false ? (
                <Badge variant="destructive">{t('common.inactive')}</Badge>
              ) : (
                <Badge variant="success">{t('common.active')}</Badge>
              )}
            </DetailRow>
            {drawer.employee.employee?.branch && (
              <DetailRow label={t('employees.branch')}>
                {drawer.employee.employee.branch.name}
              </DetailRow>
            )}
            <DetailRow label={t('employees.lastPing')}>
              {drawer.employee.employee?.lastPingAt
                ? new Date(drawer.employee.employee.lastPingAt).toLocaleString()
                : '—'}
            </DetailRow>
            {drawer.employee.createdAt && (
              <DetailRow label={t('employees.joined')}>
                {new Date(drawer.employee.createdAt).toLocaleDateString()}
              </DetailRow>
            )}
          </div>

          {/* Location map */}
          <div className="mt-6 space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="size-4 text-primary" />
              {t('employees.location')}
            </h3>
            <EmployeeLocation employee={drawer.employee} liveLoc={liveById.get(drawer.employee.id)} />
          </div>
        </DetailDrawer>
      )}
    </motion.div>
  );
}

function EmployeeLocation({
  employee,
  liveLoc,
}: {
  employee: Employee;
  liveLoc?: { lat: number; lng: number };
}): React.ReactElement {
  const t = useTranslations();
  const lat = liveLoc?.lat ?? employee.employee?.currentLat ?? null;
  const lng = liveLoc?.lng ?? employee.employee?.currentLng ?? null;
  const geo = useReverseGeocode(lat, lng);

  if (lat == null || lng == null) {
    return (
      <div className="flex items-center justify-center h-40 rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
        {t('employees.noLocation')}
      </div>
    );
  }

  const addressText = geo.isLoading
    ? t('employees.locatingAddress')
    : geo.data?.label || t('employees.unknownAddress');

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
        <MapPin className="size-4 shrink-0 text-primary mt-0.5" />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-sm font-medium break-words',
              geo.isLoading && 'text-muted-foreground animate-pulse',
            )}
          >
            {addressText}
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </p>
        </div>
      </div>
      <div className="rounded-lg overflow-hidden border border-border">
        <LeafletMap
          center={{ lat, lng }}
          markers={[{ id: employee.id, lat, lng, label: employee.name }]}
          height="220px"
          zoom={14}
        />
      </div>
    </div>
  );
}

function CreateDrawer({
  open,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateEmployeeInput) => Promise<void>;
  submitting: boolean;
  error: string | null;
}): React.ReactElement {
  const t = useTranslations();
  const rules = usePasswordRules();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');

  function reset(): void {
    setName('');
    setEmail('');
    setPassword('');
    setWhatsappPhone('');
  }

  const passwordOk = isPasswordValid(password, rules);
  const canSubmit = name.trim().length >= 2 && /@/.test(email) && passwordOk;

  async function submit(): Promise<void> {
    await onSubmit({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      whatsappPhone: whatsappPhone.trim() || undefined,
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
      mode="create"
      title={t('employees.addTitle')}
      description={t('employees.addDesc')}
      onSubmit={submit}
      submitting={submitting}
      submitDisabled={!canSubmit}
      submitLabel={t('common.create')}
      cancelLabel={t('common.cancel')}
    >
      <div className="space-y-4">
        <TextField id="new-name" label={t('employees.name')} value={name} onChange={setName} required />
        <TextField
          id="new-email"
          label={t('employees.email')}
          type="email"
          value={email}
          onChange={setEmail}
          required
        />
        <div className="space-y-2">
          <Label htmlFor="new-password">
            {t('employees.password')} <span className="text-destructive">*</span>
          </Label>
          <PasswordInput
            id="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <TextField
          id="new-phone"
          label={t('employees.whatsappOptional')}
          value={whatsappPhone}
          onChange={setWhatsappPhone}
        />
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            {error}
          </p>
        )}
      </div>
    </DetailDrawer>
  );
}

function EditDrawer({
  employee,
  onClose,
  onSubmit,
  submitting,
}: {
  employee: Employee;
  onClose: () => void;
  onSubmit: (patch: { name?: string; active?: boolean }) => Promise<void>;
  submitting: boolean;
}): React.ReactElement {
  const t = useTranslations();
  const [name, setName] = useState(employee.name);
  const [active, setActive] = useState(employee.active !== false);

  return (
    <DetailDrawer
      open
      onOpenChange={(o) => !o && onClose()}
      mode="edit"
      title={t('employees.editTitle')}
      description={employee.email}
      onSubmit={() => onSubmit({ name: name.trim(), active })}
      submitting={submitting}
      submitDisabled={name.trim().length < 2}
      submitLabel={t('common.save')}
      cancelLabel={t('common.cancel')}
    >
      <div className="space-y-4">
        <TextField id="edit-name" label={t('employees.name')} value={name} onChange={setName} required />
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">{t('common.active')}</p>
            <p className="text-xs text-muted-foreground">{t('employees.deactivateDesc')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            onClick={() => setActive((v) => !v)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
              active ? 'bg-primary' : 'bg-muted',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-5 rounded-full bg-white shadow-soft transition-transform',
                active ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0.5 rtl:-translate-x-0.5',
              )}
            />
          </button>
        </div>
      </div>
    </DetailDrawer>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
}): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ms-0.5">*</span>}
      </Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
