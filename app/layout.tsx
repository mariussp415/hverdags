import type { Metadata, Viewport } from 'next';
import './globals.css';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: 'Hverdags — vårt lille hjem',
  description: 'Få oversikt over planer, gjøremål og handlelisten — sammen og hver for seg.',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Hverdags' },
  icons: { icon: `${basePath}/favicon.svg`, apple: `${basePath}/icon-192.png` },
  manifest: `${basePath}/manifest.webmanifest`,
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, themeColor: '#f8f7f2',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="nb"><body>{children}</body></html>;
}
