'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForgotPassword } from '@/hooks/queries/auth';
import { Link } from '@/i18n/routing';

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const forgot = useForgotPassword();
  const [email, setEmail] = useState('');

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    await forgot.mutateAsync(email).catch(() => undefined);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t('auth.forgotPassword')}</h1>
      </header>

      <div className="space-y-2">
        <Label htmlFor="email">{t('auth.email')}</Label>
        <div className="relative">
          <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="ps-10"
          />
        </div>
      </div>

      {forgot.isSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.1)] p-3 text-sm text-[hsl(var(--success))] animate-fade-in">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{t('auth.resetSent')}</span>
        </div>
      )}

      <Button
        type="submit"
        variant="gradient"
        size="lg"
        className="w-full"
        disabled={forgot.isPending}
      >
        {forgot.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t('common.loading')}
          </>
        ) : (
          t('auth.sendResetLink')
        )}
      </Button>

      <p className="text-sm text-muted-foreground text-center">
        <Link href="/login" className="text-primary font-medium hover:underline">
          {t('auth.rememberPassword')}
        </Link>
      </p>
    </form>
  );
}
