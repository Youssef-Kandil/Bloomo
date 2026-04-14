'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { AlertCircle, ArrowRight, Loader2, Lock, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/hooks/queries/auth';
import { Link, useRouter } from '@/i18n/routing';

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState('admin@bloomo.local');
  const [password, setPassword] = useState('Password123!');

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      router.push('/dashboard/overview');
    } catch {
      /* error surfaced via login.error */
    }
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <header className="space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t('app.name')}</h1>
        <p className="text-sm text-muted-foreground">{t('app.tagline')}</p>
      </header>

      <div className="space-y-2">
        <Label htmlFor="email">{t('auth.email')}</Label>
        <div className="relative">
          <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="ps-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('auth.password')}</Label>
        <div className="relative">
          <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="ps-10"
          />
        </div>
      </div>

      {login.isError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive animate-fade-in">
          <AlertCircle className="size-4 shrink-0" />
          <span>{t('auth.errorInvalid')}</span>
        </div>
      )}

      <Button
        type="submit"
        variant="gradient"
        size="lg"
        className="w-full"
        disabled={login.isPending}
      >
        {login.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t('common.loading')}
          </>
        ) : (
          <>
            {t('auth.login')}
            <ArrowRight className="size-4 flip-x" />
          </>
        )}
      </Button>

      <div className="flex justify-between text-sm text-muted-foreground">
        <Link href="/forgot-password" className="hover:text-primary transition-colors">
          {t('auth.forgotPassword')}
        </Link>
        <Link href="/register" className="hover:text-primary transition-colors">
          {t('auth.register')}
        </Link>
      </div>
    </motion.form>
  );
}
