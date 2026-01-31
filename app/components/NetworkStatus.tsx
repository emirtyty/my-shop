'use client';

import { useState, useEffect } from 'react';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    // Проверяем начальный статус
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowOffline(false);
      console.log('🌐 Network connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOffline(true);
      console.log('📵 Network connection lost');
    };

    // Добавляем слушателей событий
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Проверяем соединение каждые 30 секунд
    const checkInterval = setInterval(async () => {
      try {
        // Проверяем доступность Supabase вместо API health
        const response = await fetch('https://httpbin.org/status/200', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(3000)
        });
        setIsOnline(response.ok);
        if (showOffline) setShowOffline(false);
      } catch (error) {
        setIsOnline(false);
        if (!showOffline) setShowOffline(true);
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkInterval);
    };
  }, [showOffline]);

  if (isOnline && !showOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-2 text-center">
      <div className="flex items-center justify-center space-x-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span className="text-sm font-medium">
          {!isOnline ? 'Нет подключения к интернету' : 'Проблемы с соединением'}
        </span>
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
      </div>
      <p className="text-xs mt-1 opacity-90">
        Приложение работает в офлайн режиме. Некоторые функции могут быть недоступны.
      </p>
    </div>
  );
}
