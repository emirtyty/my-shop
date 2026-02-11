import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerRegister from './components/ServiceWorkerRegister';
import NetworkStatus from './components/NetworkStatus';
import CategoryScrollSound from './components/CategoryScrollSound';

export const metadata: Metadata = {
  title: 'RA DELL Signature Marketplace',
  description: 'Premium digital marketplace experience',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0E1624',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="theme-color" content="#0E1624" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-status-bar-translucent" content="false" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="color-scheme" content="dark light" />
      </head>
      <body className="antialiased">
        <CategoryScrollSound enabled={true} volume={0.15} />
        <NetworkStatus />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
