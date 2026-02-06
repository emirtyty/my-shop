import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerRegister from './components/ServiceWorkerRegister';
import NetworkStatus from './components/NetworkStatus';
import CategoryScrollSound from './components/CategoryScrollSound';
import { resourceHints, criticalCSS, adaptiveLoading } from './lib/advancedPerformance';

export const metadata: Metadata = {
  title: 'RA DELL - Marketplace',
  description: 'Digital marketplace platform',
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
  themeColor: '#FF6B35',
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
        <meta name="theme-color" content="#FF6B35" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-status-bar-translucent" content="false" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="antialiased transition-colors duration-300" style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}>
        <CategoryScrollSound enabled={true} volume={0.15} />
        <NetworkStatus />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
