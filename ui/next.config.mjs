import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Dev backend target — overridable via env so an environment variable
// can point at a non-default host if needed.
const DEV_BACKEND = process.env.BACKEND_URL ?? 'http://localhost:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy backend endpoints through Next.js so the frontend can speak to the
  // API over the SAME ORIGIN. Two benefits:
  //   1. No CORS — same origin → no preflight, no cookie sameSite gymnastics.
  //   2. HTTPS dev (`next dev --experimental-https`) just works: an HTTPS page
  //      can't call an HTTP backend (mixed content), but it CAN call same-
  //      origin `/api/...` which Next.js then forwards over HTTP to the
  //      backend — required for mic / voice recording on phones over LAN.
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${DEV_BACKEND}/api/:path*` },
      { source: '/auth/:path*', destination: `${DEV_BACKEND}/auth/:path*` },
      { source: '/uploads/:path*', destination: `${DEV_BACKEND}/uploads/:path*` },
    ];
  },
};

export default withNextIntl(nextConfig);
