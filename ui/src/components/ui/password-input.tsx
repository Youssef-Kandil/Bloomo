'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Check, Eye, EyeOff, X, type LucideIcon } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PasswordRule {
  key: string;
  label: string;
  test: (value: string) => boolean;
}

export function usePasswordRules(): PasswordRule[] {
  const t = useTranslations('password');
  return [
    { key: 'min', label: t('ruleMin'), test: (v) => v.length >= 8 },
    { key: 'upper', label: t('ruleUpper'), test: (v) => /[A-Z]/.test(v) },
    { key: 'lower', label: t('ruleLower'), test: (v) => /[a-z]/.test(v) },
    { key: 'number', label: t('ruleNumber'), test: (v) => /[0-9]/.test(v) },
    { key: 'symbol', label: t('ruleSymbol'), test: (v) => /[^A-Za-z0-9]/.test(v) },
  ];
}

export function isPasswordValid(value: string, rules: PasswordRule[]): boolean {
  return rules.every((r) => r.test(value));
}

export function passwordStrength(value: string, rules: PasswordRule[]): {
  score: number;
  label: 'weak' | 'medium' | 'strong';
} {
  const passed = rules.filter((r) => r.test(value)).length;
  const ratio = rules.length === 0 ? 0 : passed / rules.length;
  if (ratio >= 1) return { score: passed, label: 'strong' };
  if (ratio >= 0.6) return { score: passed, label: 'medium' };
  return { score: passed, label: 'weak' };
}

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  showRules?: boolean;
  showStrength?: boolean;
  rules?: PasswordRule[];
  leftIcon?: LucideIcon;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      value,
      showRules = true,
      showStrength = true,
      rules: rulesProp,
      leftIcon: LeftIcon,
      className,
      ...props
    },
    ref,
  ) {
    const t = useTranslations('password');
    const defaultRules = usePasswordRules();
    const rules = rulesProp ?? defaultRules;
    const [visible, setVisible] = React.useState(false);
    const [touched, setTouched] = React.useState(false);

    const strength = passwordStrength(value, rules);
    const strengthColor =
      strength.label === 'strong'
        ? 'bg-[hsl(var(--success))]'
        : strength.label === 'medium'
          ? 'bg-[hsl(var(--warning))]'
          : 'bg-destructive';
    const strengthWidth = `${(strength.score / rules.length) * 100}%`;

    return (
      <div className="space-y-2">
        <div className="relative">
          {LeftIcon && (
            <LeftIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          )}
          <Input
            ref={ref}
            type={visible ? 'text' : 'password'}
            value={value}
            onBlur={() => setTouched(true)}
            className={cn('pe-10', LeftIcon && 'ps-10', className)}
            autoComplete="new-password"
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            aria-label={visible ? t('hide') : t('show')}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        {showStrength && value.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t('strength')}</span>
              <span
                className={cn(
                  'font-medium',
                  strength.label === 'strong' && 'text-[hsl(var(--success))]',
                  strength.label === 'medium' && 'text-[hsl(var(--warning))]',
                  strength.label === 'weak' && 'text-destructive',
                )}
              >
                {t(strength.label)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300', strengthColor)}
                style={{ width: strengthWidth }}
              />
            </div>
          </div>
        )}

        {showRules && (touched || value.length > 0) && (
          <ul className="space-y-1 pt-1">
            {rules.map((r) => {
              const ok = r.test(value);
              return (
                <li
                  key={r.key}
                  className={cn(
                    'flex items-center gap-1.5 text-xs transition-colors',
                    ok ? 'text-[hsl(var(--success))]' : 'text-muted-foreground',
                  )}
                >
                  {ok ? (
                    <Check className="size-3.5 shrink-0" />
                  ) : (
                    <X className="size-3.5 shrink-0 text-muted-foreground/60" />
                  )}
                  <span>{r.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  },
);
