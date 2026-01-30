'use client';

import { useEffect, useRef, useState } from 'react';

// Интерфейсы для аналитики
interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

interface PageView {
  path: string;
  title?: string;
  referrer?: string;
  timestamp: number;
  userAgent?: string;
  screenResolution?: string;
}

interface UserSession {
  sessionId: string;
  startTime: number;
  pageViews: PageView[];
  events: AnalyticsEvent[];
  duration: number;
  deviceInfo: {
    userAgent: string;
    screenResolution: string;
    language: string;
    platform: string;
  };
}

// Hook для аналитики
export function useAnalytics() {
  const sessionRef = useRef<UserSession | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Генерация ID сессии
  const generateSessionId = () => {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  // Получение информации об устройстве
  const getDeviceInfo = () => {
    return {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      language: navigator.language,
      platform: navigator.platform
    };
  };

  // Инициализация сессии
  const initSession = () => {
    const sessionId = generateSessionId();
    const deviceInfo = getDeviceInfo();
    
    sessionRef.current = {
      sessionId,
      startTime: Date.now(),
      pageViews: [],
      events: [],
      duration: 0,
      deviceInfo
    };

    // Сохраняем в localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('analytics_session', JSON.stringify(sessionRef.current));
    }

    // Отправляем событие начала сессии
    trackEvent('session_start', {
      sessionId,
      deviceInfo
    });
  };

  // Отслеживание просмотра страницы
  const trackPageView = (path: string, title?: string) => {
    if (!sessionRef.current) return;

    const pageView: PageView = {
      path,
      title,
      referrer: document.referrer,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`
    };

    sessionRef.current.pageViews.push(pageView);
    saveSession();

    // Отправляем событие
    trackEvent('page_view', {
      path,
      title,
      referrer: document.referrer
    });
  };

  // Отслеживание событий
  const trackEvent = (event: string, properties?: Record<string, any>) => {
    if (!sessionRef.current) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: Date.now()
    };

    sessionRef.current.events.push(analyticsEvent);
    saveSession();

    // Отправляем в консоль для отладки
    console.log('📊 Analytics Event:', analyticsEvent);

    // Здесь можно добавить отправку на сервер аналитики
    sendToAnalytics(analyticsEvent);
  };

  // Отслеживание взаимодействий с товарами
  const trackProductInteraction = (productId: string, action: 'view' | 'click' | 'add_to_cart' | 'purchase') => {
    trackEvent('product_interaction', {
      productId,
      action,
      timestamp: Date.now()
    });
  };

  // Отслеживание поиска
  const trackSearch = (query: string, resultsCount?: number) => {
    trackEvent('search', {
      query,
      resultsCount,
      timestamp: Date.now()
    });
  };

  // Отслеживание ошибок
  const trackError = (error: Error, context?: string) => {
    trackEvent('error', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now()
    });
  };

  // Отслеживание производительности
  const trackPerformance = (metric: string, value: number) => {
    trackEvent('performance', {
      metric,
      value,
      timestamp: Date.now()
    });
  };

  // Сохранение сессии
  const saveSession = () => {
    if (typeof window !== 'undefined' && sessionRef.current) {
      localStorage.setItem('analytics_session', JSON.stringify(sessionRef.current));
    }
  };

  // Отправка данных на сервер аналитики
  const sendToAnalytics = async (data: AnalyticsEvent) => {
    // В реальном приложении здесь будет отправка на ваш сервер аналитики
    // Сейчас просто логируем в консоль
    try {
      // Пример отправки на API
      // await fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data)
      // });
    } catch (error) {
      console.error('Analytics send error:', error);
    }
  };

  // Завершение сессии
  const endSession = () => {
    if (!sessionRef.current) return;

    const duration = Date.now() - sessionRef.current.startTime;
    sessionRef.current.duration = duration;

    trackEvent('session_end', {
      duration,
      pageViews: sessionRef.current.pageViews.length,
      events: sessionRef.current.events.length
    });

    saveSession();
    sessionRef.current = null;
  };

  // Получение статистики сессии
  const getSessionStats = () => {
    if (!sessionRef.current) return null;

    return {
      sessionId: sessionRef.current.sessionId,
      duration: Date.now() - sessionRef.current.startTime,
      pageViews: sessionRef.current.pageViews.length,
      events: sessionRef.current.events.length,
      topPages: getTopPages(),
      topEvents: getTopEvents()
    };
  };

  // Получение самых популярных страниц
  const getTopPages = () => {
    if (!sessionRef.current) return [];

    const pageCounts = sessionRef.current.pageViews.reduce((acc, page) => {
      acc[page.path] = (acc[page.path] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(pageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }));
  };

  // Получение самых частых событий
  const getTopEvents = () => {
    if (!sessionRef.current) return [];

    const eventCounts = sessionRef.current.events.reduce((acc, event) => {
      acc[event.event] = (acc[event.event] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([event, count]) => ({ event, count }));
  };

  // Инициализация при монтировании
  useEffect(() => {
    initSession();

    // Отслеживание выгрузки страницы
    const handleBeforeUnload = () => {
      endSession();
    };

    // Отслеживание видимости страницы
    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackEvent('page_hidden');
      } else {
        trackEvent('page_visible');
      }
    };

    // Отслеживание производительности
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          trackPerformance('page_load_time', navEntry.loadEventEnd - navEntry.loadEventStart);
        }
      }
    });

    observer.observe({ entryTypes: ['navigation'] });

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();
      endSession();
    };
  }, []);

  return {
    trackPageView,
    trackEvent,
    trackProductInteraction,
    trackSearch,
    trackError,
    trackPerformance,
    getSessionStats,
    session: sessionRef.current
  };
}

// Компонент для отладки аналитики
export function AnalyticsDebugger() {
  const { getSessionStats } = useAnalytics();
  const [showStats, setShowStats] = useState(false);

  if (process.env.NODE_ENV !== 'development') return null;

  const stats = getSessionStats();

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setShowStats(!showStats)}
        className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm"
      >
        📊 Analytics
      </button>
      
      {showStats && stats && (
        <div className="absolute bottom-12 left-0 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-64 text-xs">
          <h3 className="font-bold mb-2">Session Stats</h3>
          <div className="space-y-1">
            <div>Session: {stats.sessionId}</div>
            <div>Duration: {Math.round(stats.duration / 1000)}s</div>
            <div>Page Views: {stats.pageViews}</div>
            <div>Events: {stats.events}</div>
            
            {stats.topPages.length > 0 && (
              <div className="mt-2">
                <div className="font-semibold">Top Pages:</div>
                {stats.topPages.map((page, i) => (
                  <div key={i} className="ml-2">
                    {page.path} ({page.count})
                  </div>
                ))}
              </div>
            )}
            
            {stats.topEvents.length > 0 && (
              <div className="mt-2">
                <div className="font-semibold">Top Events:</div>
                {stats.topEvents.map((event, i) => (
                  <div key={i} className="ml-2">
                    {event.event} ({event.count})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
