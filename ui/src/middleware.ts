import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

export default createMiddleware(routing);

// Skip the i18n middleware for backend-bound paths so the Next.js rewrites
// (api/, auth/, uploads/) can forward them as-is to the API instead of
// getting hijacked by the locale prefixer.
export const config = {
  matcher: ['/((?!api|auth|uploads|_next|_vercel|.*\\..*).*)'],
};
