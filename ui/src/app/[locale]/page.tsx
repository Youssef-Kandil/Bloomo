import { redirect } from '@/i18n/routing';

export default async function RootIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/dashboard/overview', locale: locale as 'ar' | 'en' });
}
