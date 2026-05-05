'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, ShieldOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';

interface Props {
  /** Optional reason for the denial (e.g. "screen requires ADMIN role"). */
  reason?: string;
  /** Where the "go back" button should send the user. Defaults to /dashboard/overview. */
  homeHref?: string;
}

export function NotAuthorized({ reason, homeHref = '/dashboard/overview' }: Props): React.ReactElement {
  const t = useTranslations('errors.notAuthorized');
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card shadow-elevated p-8 text-center"
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
          <ShieldOff className="size-7" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-2">{t('description')}</p>
        {reason && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
            <Lock className="size-3" />
            <span>{reason}</span>
          </p>
        )}
        <Button asChild variant="gradient" className="mt-6 w-full">
          <Link href={homeHref}>
            <ArrowLeft className="size-4 flip-x" />
            {t('goBack')}
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
