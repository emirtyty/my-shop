import type { Metadata } from 'next';
import './globals.css';
import ServiceWorkerRegister from './components/ServiceWorkerRegister';
import NetworkStatus from './components/NetworkStatus';
import CategoryScrollSound from './components/CategoryScrollSound';
import { resourceHints, criticalCSS, adaptiveLoading } from './lib/advancedPerformance';

export const metadata: Metadata = {
  title: 'RA DELL - Marketplace',
  description: 'Digital marketplace platform',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
  themeColor: '#FF6B35',
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
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/uicons/3.0.0/uicons-regular-rounded/css/uicons-regular-rounded.min.css" />
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
