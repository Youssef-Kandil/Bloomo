'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Building2,
  CreditCard,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  Tag,
  Users,
  X,
} from 'lucide-react';

import { NotAuthorized } from '@/components/shared/NotAuthorized';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { Button } from '@/components/ui/button';
import { useLogout, useMe } from '@/hooks/queries/auth';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';

interface NavEntry {
  key: string;
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
}

const NAV: NavEntry[] = [
  { key: 'overview', href: '/system/overview', labelKey: 'system.nav.overview', icon: LayoutDashboard },
  { key: 'companies', href: '/system/companies', labelKey: 'system.nav.companies', icon: Building2 },
  { key: 'users', href: '/system/users', labelKey: 'system.nav.users', icon: Users },
  { key: 'plans', href: '/system/plans', labelKey: 'system.nav.plans', icon: CreditCard },
  { key: 'offers', href: '/system/offers', labelKey: 'system.nav.offers', icon: Tag },
  { key: 'requests', href: '/system/requests', labelKey: 'system.nav.requests', icon: Inbox },
];

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const isRtl = locale === 'ar';
  const offX = isRtl ? '110%' : '-110%';

  useEffect(() => {
    if (me.isFetched && !me.data) router.replace('/login');
  }, [me.isFetched, me.data, router]);

  if (me.isLoading || (me.isFetched && !me.data)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (me.data && me.data.role !== 'OWNER') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <NotAuthorized
          reason={t('errors.notAuthorized.reasonOwnerOnly')}
          homeHref="/dashboard/overview"
        />
      </div>
    );
  }

  if (!me.data) return null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* mobile overlay */}
      <div
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 z-30 bg-background/60 backdrop-blur-md transition-opacity duration-300 md:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : offX }}
        transition={{ type: 'spring', stiffness: 280, damping: 32 }}
        className={cn(
          'fixed z-40 top-0 bottom-0 start-0 w-72 max-w-[85vw] bg-card/95 backdrop-blur-xl flex flex-col',
          'border-e border-border shadow-elevated',
          'md:static md:translate-x-0 md:!transform-none md:w-64 md:shrink-0 md:shadow-none md:bg-card/60 md:self-stretch',
        )}
      >
        <div className="px-5 py-5 border-b border-border flex items-center justify-between shrink-0">
          <Link
            href="/system/overview"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 group"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 shadow-glow">
              <Sparkles className="size-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-bold tracking-tight text-gradient">Bloomo</p>
              <p className="text-[11px] uppercase tracking-wide text-amber-500 font-semibold">
                {t('system.title')}
              </p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="md:hidden"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </Button>
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto min-h-0">
          {NAV.map((entry, i) => {
            const active = pathname.startsWith(entry.href);
            const Icon = entry.icon;
            return (
              <motion.div
                key={entry.key}
                initial={{ opacity: 0, x: isRtl ? 6 : -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.025 }}
              >
                <Link
                  href={entry.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    active
                      ? 'bg-gradient-to-r from-amber-500/15 to-rose-500/10 text-amber-600 shadow-soft'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="active-system-pill"
                      className="absolute inset-y-1.5 start-0 w-1 rounded-full bg-gradient-to-b from-amber-500 to-rose-500"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="size-[18px] shrink-0 transition-transform group-hover:scale-110" />
                  <span className="truncate">{t(entry.labelKey)}</span>
                </Link>
              </motion.div>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-1 shrink-0">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{me.data.name}</p>
              <p className="text-xs text-muted-foreground truncate">{me.data.email}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={async () => {
              await logout.mutateAsync();
              router.replace('/login');
            }}
          >
            <LogOut className="size-4" />
            {t('auth.logout')}
          </Button>
        </div>
      </motion.aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 bg-card/40 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden -ms-2"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>
            <span className="text-xs uppercase font-semibold tracking-wider text-amber-600">
              {t('system.title')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
