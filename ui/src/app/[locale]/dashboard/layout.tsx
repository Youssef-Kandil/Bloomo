'use client';

import { useEffect, useState } from 'react';

import { Aside } from '@/components/layout/Aside';
import { TopNav } from '@/components/layout/TopNav';
import { useMe } from '@/hooks/queries/auth';
import { useMyManagerPermissions } from '@/hooks/queries/permissions';
import { useEmployeePing } from '@/hooks/useEmployeePing';
import { useRouter } from '@/i18n/routing';
import { visibleScreens } from '@/lib/rbac';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const perms = useMyManagerPermissions(me.data?.id, me.data?.role);
  useEmployeePing(me.data);

  useEffect(() => {
    if (me.isFetched && !me.data) router.replace('/login');
  }, [me.isFetched, me.data, router]);

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

  return (
    <div className="min-h-screen flex bg-background">
      <Aside screens={screens} open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopNav onMenu={() => setOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
