import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hverdags — vårt lille hjem',
  description: 'Få oversikt over planer, gjøremål og handlelisten — sammen og hver for seg.',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Hverdags' },
  icons: { icon: '/favicon.svg', apple: '/icon-192.png' },
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, themeColor: '#f8f7f2',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="nb"><body>{children}</body></html>;
}
