import { redirect } from '@/i18n/routing';

export default function SystemRoot({ params }: { params: { locale: string } }) {
  redirect({ href: '/system/overview', locale: params.locale as 'ar' | 'en' });
}
