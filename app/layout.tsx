import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

// Настройки метаданных для превращения сайта в приложение (PWA)
export const metadata: Metadata = {
  title: "Мой Маркет",
  description: "Лучшие товары в вашем телефоне",
  manifest: "/manifest.json", // Связь с файлом манифеста
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Мой Маркет",
  },
  icons: {
    apple: "/icon-512x512.png", // Иконка для Apple устройств
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={`${inter.className} bg-black text-white`}>
        {children}

        {/* Скрипт регистрации Service Worker для Android (PWA) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}