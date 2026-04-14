'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link, usePathname } from '@/i18n/routing';
import type { ScreenDef } from '@/lib/rbac';
import { cn } from '@/lib/utils';

interface AsideProps {
  screens: ScreenDef[];
  open: boolean;
  onClose: () => void;
}

export function Aside({ screens, open, onClose }: AsideProps) {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <>
      {/* mobile overlay */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-30 bg-background/60 backdrop-blur-md transition-opacity duration-300 md:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : '-110%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 32 }}
        className={cn(
          'fixed z-40 top-0 bottom-0 w-72 max-w-[85vw] bg-card/95 backdrop-blur-xl',
          'border-e border-border shadow-elevated',
          'md:static md:translate-x-0 md:!transform-none md:w-64 md:shrink-0 md:shadow-none md:bg-card/50',
        )}
      >
        <div className="px-5 py-5 border-b border-border flex items-center justify-between">
          <Link href="/dashboard/overview" className="flex items-center gap-2.5 group">
            <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow transition-transform group-hover:scale-105">
              <Sparkles className="size-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-gradient">Bloomo</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </Button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100%-4.25rem)]">
          {screens.length === 0 && (
            <p className="text-sm text-muted-foreground px-3 py-2">{t('common.empty')}</p>
          )}
          {screens.map((s, i) => {
            const active = pathname.startsWith(s.href);
            const Icon = s.icon;
            return (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.025, duration: 0.25 }}
              >
                <Link
                  href={s.href}
                  onClick={onClose}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-gradient-to-r from-primary/15 to-accent/10 text-primary shadow-soft'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="active-pill"
                      className="absolute inset-y-1.5 start-0 w-1 rounded-full bg-gradient-to-b from-primary to-accent"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      'size-[18px] shrink-0 transition-transform group-hover:scale-110',
                      active && 'text-primary',
                    )}
                  />
                  <span className="truncate">{t(s.labelKey)}</span>
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </motion.aside>
    </>
  );
}
