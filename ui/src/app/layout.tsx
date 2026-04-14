import type { Metadata } from 'next';

import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Bloomo',
  description: 'Field Service Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
