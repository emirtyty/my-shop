'use client';

import { useState, useEffect } from 'react';

interface FastLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
}

export default function FastLoader({ 
  children, 
  fallback = (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
        <p className="text-gray-600 text-sm">Загрузка...</p>
      </div>
    </div>
  ),
  delay = 200
}: FastLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Показываем fallback только если загрузка занимает больше времени
    const fallbackTimer = setTimeout(() => {
      if (isLoading) {
        setShowFallback(true);
      }
    }, delay);

    // Проверяем готовность DOM
    const checkReady = () => {
      if (document.readyState === 'complete') {
        setIsLoading(false);
        setShowFallback(false);
      }
    };

    // Слушаем событие загрузки
    window.addEventListener('load', checkReady);
    
    // Проверяем сразу на случай если уже загружено
    checkReady();

    return () => {
      clearTimeout(fallbackTimer);
      window.removeEventListener('load', checkReady);
    };
  }, [delay, isLoading]);

  if (showFallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
