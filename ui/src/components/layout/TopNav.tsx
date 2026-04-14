'use client';

import { useTranslations } from 'next-intl';
import { LogOut, Menu, User } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout, useMe } from '@/hooks/queries/auth';
import { useRouter } from '@/i18n/routing';

import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeToggle } from './ThemeToggle';

export function TopNav({ onMenu }: { onMenu: () => void }) {
  const t = useTranslations();
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();

  async function onLogout(): Promise<void> {
    await logout.mutateAsync();
    router.push('/login');
  }

  const name = me.data?.name ?? '—';
  const role = me.data?.role ?? '';
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 bg-background/70 backdrop-blur-xl border-b border-border">
      <div className="flex items-center gap-2 px-3 py-2.5 md:px-5">
        <Button
          onClick={onMenu}
          variant="ghost"
          size="icon"
          aria-label="Menu"
          className="md:hidden"
        >
          <Menu className="size-5" />
        </Button>

        <div className="flex-1" />

        <LocaleSwitcher />
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 ps-2 pe-3 h-10">
              <Avatar className="size-8">
                <AvatarFallback>{initials || <User className="size-4" />}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-start">
                <p className="text-sm font-medium leading-tight truncate max-w-[120px]">{name}</p>
                <p className="text-xs text-muted-foreground leading-tight truncate">{role}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{name}</span>
                <span className="text-xs text-muted-foreground font-normal">{role}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onLogout}
              disabled={logout.isPending}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
