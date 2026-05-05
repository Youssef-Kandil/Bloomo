'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Ban, KeyRound, Loader2, Search, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/shared/Pagination';
import {
  useBanUser,
  useResetUserPassword,
  useSystemUsers,
  useUnbanUser,
  type UserRow,
} from '@/hooks/queries/system';

export default function SystemUsersPage() {
  const t = useTranslations('system');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string>('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const list = useSystemUsers(search || undefined, role || undefined, page, PAGE_SIZE);
  const total = list.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const itemsLen = list.data?.items.length ?? 0;
  const firstIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + itemsLen;

  const banMut = useBanUser();
  const unbanMut = useUnbanUser();
  const resetMut = useResetUserPassword();

  const [banTarget, setBanTarget] = useState<UserRow | null>(null);
  const [banReason, setBanReason] = useState('');

  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');

  async function confirmBan(): Promise<void> {
    if (!banTarget) return;
    try {
      await banMut.mutateAsync({ id: banTarget.id, reason: banReason || undefined });
      toast.success(t('users.banSuccess'));
      setBanTarget(null);
      setBanReason('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    }
  }

  async function unban(u: UserRow): Promise<void> {
    try {
      await unbanMut.mutateAsync(u.id);
      toast.success(t('users.unbanSuccess'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    }
  }

  async function confirmReset(): Promise<void> {
    if (!resetTarget) return;
    if (newPassword.length < 8) {
      toast.error(t('users.passwordTooShort'));
      return;
    }
    try {
      await resetMut.mutateAsync({ id: resetTarget.id, newPassword });
      toast.success(t('users.resetSuccess', { password: newPassword }));
      setResetTarget(null);
      setNewPassword('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">{t('users.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('users.subtitle')}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-input bg-surface px-3 py-2 text-sm shadow-soft"
          >
            <option value="">{t('users.filter.allRoles')}</option>
            <option value="OWNER">OWNER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="MANAGER">MANAGER</option>
            <option value="EMPLOYEE">EMPLOYEE</option>
            <option value="CLIENT">CLIENT</option>
          </select>
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t('users.searchPlaceholder')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="ps-9"
            />
          </div>
        </div>
      </header>

      <div className="scroll-tbl bg-card rounded-2xl">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-start py-3 px-4">{t('users.col.name')}</th>
              <th className="text-start py-3 px-4">{t('users.col.email')}</th>
              <th className="text-start py-3 px-4">{t('users.col.role')}</th>
              <th className="text-start py-3 px-4">{t('users.col.company')}</th>
              <th className="text-start py-3 px-4">{t('users.col.status')}</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.data?.items.map((u) => (
              <tr key={u.id}>
                <td className="py-3 px-4 font-medium">{u.name}</td>
                <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-muted-foreground">
                  {u.company?.name ?? '—'}
                </td>
                <td className="py-3 px-4">
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
                <td className="py-3 px-4 text-end">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setResetTarget(u)}
                      title={t('users.resetTitle')}
                    >
                      <KeyRound className="size-3.5" />
                    </Button>
                    {u.role !== 'OWNER' &&
                      (u.bannedAt ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => unban(u)}
                          title={t('users.unbanCta')}
                          className="text-emerald-600 hover:bg-emerald-500/10"
                        >
                          <ShieldCheck className="size-3.5" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setBanTarget(u)}
                          title={t('users.banCta')}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Ban className="size-3.5" />
                        </Button>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
            {!list.isLoading && (list.data?.items.length ?? 0) === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted-foreground">
                  {t('users.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        totalCount={total}
        firstIndex={firstIndex}
        lastIndex={lastIndex}
      />

      {/* Ban dialog with reason */}
      {banTarget && (
        <BanReasonDialog
          target={banTarget}
          reason={banReason}
          onChange={setBanReason}
          onClose={() => {
            setBanTarget(null);
            setBanReason('');
          }}
          onConfirm={confirmBan}
          loading={banMut.isPending}
        />
      )}

      {/* Reset password dialog */}
      {resetTarget && (
        <ResetPasswordDialog
          target={resetTarget}
          password={newPassword}
          onChange={setNewPassword}
          onClose={() => {
            setResetTarget(null);
            setNewPassword('');
          }}
          onConfirm={confirmReset}
          loading={resetMut.isPending}
        />
      )}
    </div>
  );
}

function BanReasonDialog({
  target,
  reason,
  onChange,
  onClose,
  onConfirm,
  loading,
}: {
  target: UserRow;
  reason: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const t = useTranslations('system.users');
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t('banDialogTitle', { name: target.name })}
      description={
        <div className="space-y-3">
          <p>{t('banDialogDescription', { email: target.email })}</p>
          <div>
            <Label>{t('banReason')}</Label>
            <Input value={reason} onChange={(e) => onChange(e.target.value)} placeholder={t('banReasonPlaceholder')} />
          </div>
        </div>
      }
      confirmLabel={t('banCta')}
      cancelLabel={t('cancel')}
      onConfirm={onConfirm}
      loading={loading}
      variant="destructive"
    />
  );
}

function ResetPasswordDialog({
  target,
  password,
  onChange,
  onClose,
  onConfirm,
  loading,
}: {
  target: UserRow;
  password: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const t = useTranslations('system.users');
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t('resetTitle')}
      description={
        <div className="space-y-3">
          <p>{t('resetDescription', { email: target.email })}</p>
          <div>
            <Label>{t('newPassword')}</Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => onChange(e.target.value)}
              placeholder={t('newPasswordHint')}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('passwordRequirement')}</p>
          </div>
        </div>
      }
      confirmLabel={t('resetCta')}
      cancelLabel={t('cancel')}
      onConfirm={onConfirm}
      loading={loading}
      variant="default"
    />
  );
}
