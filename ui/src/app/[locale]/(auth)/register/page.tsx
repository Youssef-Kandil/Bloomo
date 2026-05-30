'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { AlertCircle, Building2, Loader2, Lock, Mail, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PasswordInput,
  isPasswordValid,
  usePasswordRules,
} from '@/components/ui/password-input';
import { useRegister } from '@/hooks/queries/auth';
import { Link, useRouter } from '@/i18n/routing';

// Defined at module scope so React keeps the same component identity across
// re-renders — declaring it inside RegisterPage would re-create the function
// on every keystroke, causing the input to remount and lose focus.
function Field({
  id,
  label,
  icon: Icon,
  ...rest
}: {
  id: string;
  label: string;
  icon: typeof User;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input id={id} className="ps-10" {...rest} />
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const t = useTranslations();
  const router = useRouter();
  const register = useRegister();
  const passwordRules = usePasswordRules();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordOk = isPasswordValid(password, passwordRules);
  const confirmTouched = confirmPassword.length > 0;
  const passwordsMatch = password === confirmPassword;
  const canSubmit =
    name.trim().length >= 2 &&
    companyName.trim().length >= 2 &&
    /.+@.+\..+/.test(email) &&
    passwordOk &&
    passwordsMatch;

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await register.mutateAsync({ name, companyName, email, password });
      router.push('/dashboard/overview');
    } catch {
      /* surfaced via register.error */
    }
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t('auth.register')}</h1>
      </header>

      <Field
        id="name"
        label={t('auth.name')}
        icon={User}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        minLength={2}
      />
      <Field
        id="companyName"
        label={t('auth.companyName')}
        icon={Building2}
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        required
        minLength={2}
      />
      <Field
        id="email"
        label={t('auth.email')}
        icon={Mail}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <div className="space-y-2">
        <Label htmlFor="password">{t('auth.password')}</Label>
        <PasswordInput
          id="password"
          name="password"
          leftIcon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          leftIcon={Lock}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          showRules={false}
          showStrength={false}
        />
        {confirmTouched && !passwordsMatch && (
          <p className="text-xs text-destructive">{t('auth.passwordsDontMatch')}</p>
        )}
      </div>

      {register.isError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive animate-fade-in">
          <AlertCircle className="size-4 shrink-0" />
          <span>{(register.error as Error).message}</span>
        </div>
      )}

      <Button
        type="submit"
        variant="gradient"
        size="lg"
        className="w-full"
        disabled={register.isPending || !canSubmit}
      >
        {register.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t('common.loading')}
          </>
        ) : (
          t('auth.submit')
        )}
      </Button>

      <p className="text-sm text-muted-foreground text-center">
        {t('auth.haveAccount')}{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          {t('auth.login')}
        </Link>
      </p>
    </motion.form>
  );
}
