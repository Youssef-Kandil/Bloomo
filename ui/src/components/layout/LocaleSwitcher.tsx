'use client';

import { useLocale } from 'next-intl';
import { Languages } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from '@/i18n/routing';

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const next = locale === 'ar' ? 'en' : 'ar';

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => router.replace(pathname, { locale: next })}
      aria-label="Switch language"
      className="gap-2"
    >
      <Languages className="size-4" />
      <span className="hidden sm:inline">{next === 'ar' ? 'العربية' : 'English'}</span>
    </Button>
  );
}
