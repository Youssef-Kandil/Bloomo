import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = (routing.locales as readonly string[]).includes(requested as string)
    ? (requested as 'ar' | 'en')
    : routing.defaultLocale;

  let messages;
  try {
    messages = (await import(`./messages/${locale}.json`)).default;
  } catch {
    notFound();
  }

  return { locale, messages };
});
