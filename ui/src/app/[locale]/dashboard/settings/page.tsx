'use client';

import { useTranslations } from 'next-intl';

import { useMe } from '@/hooks/queries/auth';

export default function SettingsPage() {
  const t = useTranslations();
  const me = useMe();

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-semibold">{t('nav.settings')}</h1>

      <div className="card space-y-2">
        <div className="flex justify-between text-sm"><span className="text-fg-muted">Name</span><span>{me.data?.name}</span></div>
        <div className="flex justify-between text-sm"><span className="text-fg-muted">Email</span><span>{me.data?.email}</span></div>
        <div className="flex justify-between text-sm"><span className="text-fg-muted">Role</span><span>{me.data?.role}</span></div>
      </div>

      <p className="text-sm text-fg-muted">
        {t('common.theme')} و {t('common.language')} موجودين فالـ TopNav.
      </p>
    </div>
  );
}
