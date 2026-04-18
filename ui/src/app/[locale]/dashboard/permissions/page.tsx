'use client';

import axios from 'axios';
import { motion } from 'framer-motion';
import { Loader2, Pencil, Plus, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DetailDrawer } from '@/components/shared/DetailDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput, isPasswordValid, usePasswordRules } from '@/components/ui/password-input';
import { Switch } from '@/components/ui/switch';
import { useCompany } from '@/hooks/queries/company';
import {
  useBulkUpdatePermissions,
  useCreateManager,
  useDeleteManager,
  useManagerPermissions,
  useManagers,
  useUpdateManager,
  type CreateManagerInput,
  type Manager,
  type UpdateManagerInput,
} from '@/hooks/queries/permissions';
import { SCREENS, SCREEN_ACTIONS, type PermissionAction } from '@/lib/rbac';

type FlagsByScreen = Record<string, Record<PermissionAction, boolean>>;

function emptyFlags(): Record<PermissionAction, boolean> {
  return { view: false, create: false, edit: false, delete: false, assign: false };
}

function actionsFor(screenKey: string): readonly PermissionAction[] {
  return SCREEN_ACTIONS[screenKey] ?? ['view'];
}

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string } | undefined)?.message ?? err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

export default function PermissionsPage() {
  const t = useTranslations();
  const managers = useManagers();
  const [selected, setSelected] = useState<string>('');
  const [showAdd, setShowAdd] = useState(false);
  const [editManager, setEditManager] = useState<Manager | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const perms = useManagerPermissions(selected || undefined);
  const saveMut = useBulkUpdatePermissions();
  const deleteMgr = useDeleteManager();

  async function handleDelete(m: Manager): Promise<void> {
    if (!confirm(t('permissions.confirmDelete', { name: m.name }))) return;
    setDeletingId(m.id);
    try {
      await deleteMgr.mutateAsync(m.id);
      toast.success(t('permissions.deleteSuccess'));
      if (selected === m.id) setSelected('');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  const [draft, setDraft] = useState<FlagsByScreen>({});

  useEffect(() => {
    if (!perms.data) return;
    const next: FlagsByScreen = {};
    for (const screen of SCREENS) {
      next[screen.key] = emptyFlags();
    }
    for (const p of perms.data) {
      next[p.screenKey] = {
        view: p.canView,
        create: p.canCreate,
        edit: p.canEdit,
        delete: p.canDelete,
        assign: p.canAssign,
      };
    }
    setDraft(next);
  }, [perms.data]);

  const selectedManager = managers.data?.items.find((m) => m.id === selected);

  function setAction(screenKey: string, action: PermissionAction, value: boolean): void {
    setDraft((prev) => ({
      ...prev,
      [screenKey]: { ...(prev[screenKey] ?? emptyFlags()), [action]: value },
    }));
  }

  function setAll(screenKey: string, value: boolean): void {
    const actions = actionsFor(screenKey);
    setDraft((prev) => {
      const next = { ...(prev[screenKey] ?? emptyFlags()) };
      for (const a of actions) next[a] = value;
      return { ...prev, [screenKey]: next };
    });
  }

  function isAllOn(screenKey: string): boolean {
    const flags = draft[screenKey] ?? emptyFlags();
    return actionsFor(screenKey).every((a) => flags[a]);
  }

  async function save(): Promise<void> {
    if (!selected) return;
    try {
      await saveMut.mutateAsync({
        managerId: selected,
        screens: SCREENS.map((s) => {
          const f = draft[s.key] ?? emptyFlags();
          return {
            screenKey: s.key,
            canView: f.view,
            canCreate: f.create,
            canEdit: f.edit,
            canDelete: f.delete,
            canAssign: f.assign,
          };
        }),
      });
      toast.success(t('permissions.saveSuccess'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 22 } },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.header variants={item} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {t('permissions.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {managers.data?.items.length ?? 0}
          </p>
        </div>
        <Button variant="gradient" onClick={() => setShowAdd(true)}>
          <Plus className="size-4" />
          {t('permissions.addManager')}
        </Button>
      </motion.header>

      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="size-5 text-primary" />
              {t('permissions.selectManager')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {managers.isLoading ? (
              <div className="h-10 rounded-lg shimmer" />
            ) : (managers.data?.items.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">{t('permissions.noManagers')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {managers.data?.items.map((m) => {
                  const active = selected === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-1 rounded-lg border text-sm transition-colors ${
                        active
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-surface hover:bg-muted'
                      } ${m.active === false ? 'opacity-60' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelected(m.id)}
                        className="flex items-center gap-3 px-3 py-2 text-start"
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{m.name}</span>
                          <span className="text-xs text-muted-foreground">{m.email}</span>
                        </div>
                        {m.branch && (
                          <Badge variant="outline" className="text-xs">
                            {m.branch.name}
                          </Badge>
                        )}
                        {m.active === false && (
                          <Badge variant="outline" className="text-xs">
                            {t('common.inactive')}
                          </Badge>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditManager(m)}
                        aria-label={t('permissions.editManager')}
                        className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/60"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(m)}
                        aria-label={t('common.delete')}
                        disabled={deletingId === m.id}
                        className="p-2 me-1 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 disabled:opacity-50"
                      >
                        {deletingId === m.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {selected ? (
        <motion.div variants={item} className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <h2 className="text-lg font-semibold">
                {t('permissions.screens')} — {selectedManager?.name}
              </h2>
            </div>
            <Button variant="gradient" onClick={save} disabled={saveMut.isPending || perms.isLoading}>
              {saveMut.isPending && <Loader2 className="size-4 animate-spin" />}
              {t('permissions.save')}
            </Button>
          </div>

          {perms.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-36 rounded-xl shimmer" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {SCREENS.map((screen) => {
                const actions = actionsFor(screen.key);
                const flags = draft[screen.key] ?? emptyFlags();
                const allOn = isAllOn(screen.key);
                const Icon = screen.icon;
                return (
                  <Card key={screen.key}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Icon className="size-4 text-primary" />
                          {t(screen.labelKey as Parameters<typeof t>[0])}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {t('permissions.all')}
                          </span>
                          <Switch
                            checked={allOn}
                            onCheckedChange={(v) => setAll(screen.key, v)}
                            aria-label={t('permissions.all')}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {actions.map((a) => (
                        <div
                          key={a}
                          className="flex items-center justify-between gap-3"
                        >
                          <Label
                            htmlFor={`${screen.key}-${a}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {t(`permissions.action${capitalize(a)}` as Parameters<typeof t>[0])}
                          </Label>
                          <Switch
                            id={`${screen.key}-${a}`}
                            checked={flags[a]}
                            onCheckedChange={(v) => setAction(screen.key, a, v)}
                            aria-label={a}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground">{t('permissions.viewHint')}</p>
        </motion.div>
      ) : (
        <motion.p variants={item} className="text-sm text-muted-foreground">
          {t('permissions.noManagerSelected')}
        </motion.p>
      )}

      <AddManagerDrawer
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={(id) => {
          setSelected(id);
          setShowAdd(false);
        }}
      />

      {editManager && (
        <EditManagerDrawer
          open
          manager={editManager}
          onClose={() => setEditManager(null)}
        />
      )}
    </motion.div>
  );
}

function capitalize<S extends string>(s: S): Capitalize<S> {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as Capitalize<S>;
}

function AddManagerDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}): React.ReactElement {
  const t = useTranslations();
  const company = useCompany();
  const createMut = useCreateManager();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [branchId, setBranchId] = useState<string>('');

  const branches = useMemo(() => company.data?.branches ?? [], [company.data]);
  const passwordRules = usePasswordRules();

  const canSubmit =
    name.trim().length >= 2 &&
    /.+@.+\..+/.test(email) &&
    isPasswordValid(password, passwordRules);

  function reset(): void {
    setName('');
    setEmail('');
    setPassword('');
    setWhatsappPhone('');
    setBranchId('');
  }

  async function submit(): Promise<void> {
    const input: CreateManagerInput = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      branchId: branchId || undefined,
      whatsappPhone: whatsappPhone.trim() || undefined,
    };
    try {
      const user = await createMut.mutateAsync(input);
      toast.success(t('permissions.createSuccess'));
      reset();
      onCreated(user.id);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const selectClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50';

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
      title={t('permissions.addManager')}
      description={t('permissions.addManagerDesc')}
      onSubmit={submit}
      submitting={createMut.isPending}
      submitDisabled={!canSubmit}
      submitLabel={t('permissions.addManager')}
      cancelLabel={t('common.cancel')}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mgr-name">
            {t('permissions.nameLabel')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="mgr-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mgr-email">
            {t('permissions.emailLabel')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="mgr-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mgr-password">
            {t('permissions.passwordLabel')} <span className="text-destructive">*</span>
          </Label>
          <PasswordInput
            id="mgr-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mgr-branch">{t('permissions.branchLabel')}</Label>
          <select
            id="mgr-branch"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className={selectClass}
            disabled={company.isLoading}
          >
            <option value="">{t('permissions.noBranch')}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mgr-whatsapp">{t('permissions.whatsappLabel')}</Label>
          <Input
            id="mgr-whatsapp"
            value={whatsappPhone}
            onChange={(e) => setWhatsappPhone(e.target.value)}
            dir="ltr"
            placeholder="+20 100 000 0000"
          />
        </div>
      </div>
    </DetailDrawer>
  );
}

function EditManagerDrawer({
  open,
  manager,
  onClose,
}: {
  open: boolean;
  manager: Manager;
  onClose: () => void;
}): React.ReactElement {
  const t = useTranslations();
  const company = useCompany();
  const updateMut = useUpdateManager();
  const passwordRules = usePasswordRules();

  const [name, setName] = useState(manager.name);
  const [branchId, setBranchId] = useState<string>(manager.branchId ?? '');
  const [whatsappPhone, setWhatsappPhone] = useState(manager.whatsappPhone ?? '');
  const [active, setActive] = useState(manager.active !== false);
  const [password, setPassword] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);

  const branches = useMemo(() => company.data?.branches ?? [], [company.data]);
  const trimmedName = name.trim();
  const trimmedWhatsapp = whatsappPhone.trim();
  const passwordValid = !showPasswordField || isPasswordValid(password, passwordRules);
  const canSubmit = trimmedName.length >= 2 && passwordValid;

  async function submit(): Promise<void> {
    const patch: UpdateManagerInput = { id: manager.id };
    if (trimmedName !== manager.name) patch.name = trimmedName;
    if (active !== (manager.active !== false)) patch.active = active;
    const originalBranch = manager.branchId ?? '';
    if (branchId !== originalBranch) patch.branchId = branchId || null;
    const originalWhatsapp = manager.whatsappPhone ?? '';
    if (trimmedWhatsapp !== originalWhatsapp) {
      patch.whatsappPhone = trimmedWhatsapp.length > 0 ? trimmedWhatsapp : null;
    }
    if (showPasswordField && password.length > 0) {
      patch.password = password;
    }

    const hasChanges = Object.keys(patch).length > 1;
    if (!hasChanges) {
      onClose();
      return;
    }

    try {
      await updateMut.mutateAsync(patch);
      toast.success(t('permissions.updateSuccess'));
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const selectClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50';

  return (
    <DetailDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      mode="edit"
      title={t('permissions.editManager')}
      description={t('permissions.editManagerDesc')}
      onSubmit={submit}
      submitting={updateMut.isPending}
      submitDisabled={!canSubmit}
      submitLabel={t('common.save')}
      cancelLabel={t('common.cancel')}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-mgr-name">
            {t('permissions.nameLabel')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edit-mgr-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-mgr-email">{t('permissions.emailLabel')}</Label>
          <Input id="edit-mgr-email" value={manager.email} disabled dir="ltr" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-mgr-branch">{t('permissions.branchLabel')}</Label>
          <select
            id="edit-mgr-branch"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className={selectClass}
            disabled={company.isLoading}
          >
            <option value="">{t('permissions.noBranch')}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-mgr-whatsapp">{t('permissions.whatsappLabel')}</Label>
          <Input
            id="edit-mgr-whatsapp"
            value={whatsappPhone}
            onChange={(e) => setWhatsappPhone(e.target.value)}
            dir="ltr"
            placeholder="+20 100 000 0000"
          />
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="edit-mgr-pw-toggle">{t('permissions.changePassword')}</Label>
            <Switch
              id="edit-mgr-pw-toggle"
              checked={showPasswordField}
              onCheckedChange={(v) => {
                setShowPasswordField(v);
                if (!v) setPassword('');
              }}
              aria-label={t('permissions.changePassword')}
            />
          </div>
          {showPasswordField && (
            <PasswordInput
              id="edit-mgr-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </div>

        <div className="flex items-start justify-between gap-4 pt-2 border-t border-border">
          <div>
            <Label htmlFor="edit-mgr-active">{t('common.active')}</Label>
            <p className="text-xs text-muted-foreground mt-1">
              {t('permissions.deactivateDesc')}
            </p>
          </div>
          <Switch
            id="edit-mgr-active"
            checked={active}
            onCheckedChange={setActive}
            aria-label={t('common.active')}
          />
        </div>
      </div>
    </DetailDrawer>
  );
}
