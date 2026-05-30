'use client';

import axios from 'axios';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { AlertCircle, ArrowRight, Loader2, Lock, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';

/** First line: short, user-friendly. Distinguishes "wrong password" from
 *  "can't reach the server" so users on LAN/IP don't get a misleading
 *  "invalid credentials" when the actual failure is a network/CORS issue. */
function describeLoginError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response) {
      // Server responded with non-2xx → most likely truly invalid credentials
      if (err.response.status === 401) return 'بيانات الدخول غير صحيحة';
      if (err.response.status === 403) return 'الحساب محظور';
      return `خطأ من السيرفر (${err.response.status})`;
    }
    // No response → network layer failure (CORS, DNS, unreachable, etc.)
    return 'تعذّر الاتصال بالسيرفر';
  }
  return 'حدث خطأ غير متوقع';
}

/** Second line: technical details (request URL, axios code) — visible so the
 *  user / dev can immediately see *why* the login failed without opening
 *  devtools (critical on a phone where devtools aren't easy to reach). */
function detailedLoginError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const url = err.config?.baseURL && err.config?.url ? `${err.config.baseURL}${err.config.url}` : err.config?.url ?? '';
    if (err.response) {
      const msg = (err.response.data as { error?: { message?: string } } | undefined)?.error?.message;
      return msg ? `${msg} · ${url}` : `${err.message} · ${url}`;
    }
    return `${err.code ?? 'NETWORK_ERROR'} · ${url || err.message}`;
  }
  return err instanceof Error ? err.message : String(err);
}

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
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
      const user = await login.mutateAsync({ email, password });
      // OWNER → system control panel; CLIENT → straight to the request form;
      // everyone else (ADMIN/MANAGER/EMPLOYEE) → the dashboard overview.
      const dest =
        user.role === 'OWNER'
          ? '/system/overview'
          : user.role === 'CLIENT'
            ? '/dashboard/new-request'
            : '/dashboard/overview';
      router.push(dest);
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
        <PasswordInput
          id="password"
          name="password"
          leftIcon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          showRules={false}
          showStrength={false}
        />
      </div>

      {login.isError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive animate-fade-in">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0">
            <p className="font-medium">{describeLoginError(login.error)}</p>
            <p className="text-xs opacity-80 break-words">
              {detailedLoginError(login.error)}
            </p>
          </div>
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
