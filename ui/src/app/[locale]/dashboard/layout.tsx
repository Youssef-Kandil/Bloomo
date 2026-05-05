'use client';

import { useEffect, useState } from 'react';

import { Aside } from '@/components/layout/Aside';
import { TopNav } from '@/components/layout/TopNav';
import { NotAuthorized } from '@/components/shared/NotAuthorized';
import { useMe } from '@/hooks/queries/auth';
import { useMyManagerPermissions } from '@/hooks/queries/permissions';
import { useCurrentSubscription } from '@/hooks/queries/subscription';
import { useEmployeePing } from '@/hooks/useEmployeePing';
import { usePathname, useRouter } from '@/i18n/routing';
import { visibleScreens } from '@/lib/rbac';

function deriveScreenKey(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  const dashIdx = parts.indexOf('dashboard');
  if (dashIdx === -1) return '';
  return parts[dashIdx + 1] ?? 'overview';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const perms = useMyManagerPermissions(me.data?.id, me.data?.role);
  useEmployeePing(me.data);

  const isAdmin = me.data?.role === 'ADMIN';
  const sub = useCurrentSubscription(isAdmin);
  const onPlansPage = pathname.startsWith('/dashboard/plans');

  useEffect(() => {
    if (me.isFetched && !me.data) router.replace('/login');
  }, [me.isFetched, me.data, router]);

  useEffect(() => {
    if (me.data?.role === 'OWNER') router.replace('/system/overview');
  }, [me.data?.role, router]);

  useEffect(() => {
    if (isAdmin && sub.data?.isExpired && !onPlansPage) {
      router.replace('/dashboard/plans');
    }
  }, [isAdmin, sub.data?.isExpired, onPlansPage, router]);

  if (!me.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="size-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  const screens = visibleScreens(me.data.role, perms.data ?? []);
  const allowedKeys = new Set(screens.map((s) => s.key));
  // Per-role extras that aren't in the sidebar but are valid routes.
  if (me.data.role === 'EMPLOYEE') allowedKeys.add('attendance').add('my-tasks').add('settings');
  if (me.data.role === 'CLIENT') allowedKeys.add('new-request').add('settings');
  // Plans is handled by its own page-level guard (admin sees it; expired admin
  // is force-redirected to it). Allow the URL through here; the page itself
  // shows the NotAuthorized panel for non-admins.
  allowedKeys.add('plans');

  const screenKey = deriveScreenKey(pathname);
  const stillLoadingPerms = me.data.role === 'MANAGER' && perms.isLoading;
  const pathAllowed = !screenKey || allowedKeys.has(screenKey) || stillLoadingPerms;

  return (
    <div className="min-h-screen flex bg-background">
      <Aside screens={screens} open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopNav onMenu={() => setOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden animate-fade-in">
          {pathAllowed ? children : <NotAuthorized />}
        </main>
      </div>
    </div>
  );
}
