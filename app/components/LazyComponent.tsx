'use client';

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { adaptiveLoading } from '../lib/advancedPerformance';

interface LazyComponentProps {
  loader: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ReactNode;
  delay?: number;
  priority?: boolean;
  rootMargin?: string;
  threshold?: number;
  children?: React.ReactNode;
}

export default function LazyComponent({
  loader,
  fallback = (
    <div className="flex items-center justify-center p-8">
      <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
    </div>
  ),
  delay = 200,
  priority = false,
  rootMargin = '50px',
  threshold = 0.1,
  children
}: LazyComponentProps) {
  const [shouldLoad, setShouldLoad] = useState(priority);
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Проверяем, стоит ли загружать компонент
  useEffect(() => {
    if (priority) {
      loadComponent();
      return;
    }

    // Проверяем адаптивную загрузку
    const componentName = loader.name || 'unknown';
    if (!adaptiveLoading.shouldLoadComponent(componentName)) {
      console.log(`🚫 Skipping component load due to slow connection: ${componentName}`);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin, threshold }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, rootMargin, threshold, loader]);

  // Показываем fallback с задержкой
  useEffect(() => {
    if (!shouldLoad) return;

    const timer = setTimeout(() => {
      if (!Component) {
        setShowFallback(true);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [shouldLoad, Component, delay]);

  // Загружаем компонент
  useEffect(() => {
    if (!shouldLoad || Component) return;

    loadComponent();
  }, [shouldLoad, Component]);

  const loadComponent = async () => {
    try {
      const module = await loader();
      setComponent(() => module.default);
    } catch (error) {
      console.error('❌ Failed to load lazy component:', error);
      // Можно показать ошибку или fallback
    }
  };

  // Если компонент загружен - рендерим его
  if (Component) {
    return <Component>{children}</Component>;
  }

  // Показываем контейнер для отслеживания
  return (
    <div ref={containerRef} style={{ minHeight: '100px' }}>
      {showFallback && fallback}
    </div>
  );
}

// HOC для создания ленивых компонентов
export function withLazyLoading<T extends object>(
  importFunc: () => Promise<{ default: React.ComponentType<T> }>,
  options?: Partial<LazyComponentProps>
) {
  const LazyComp = lazy(importFunc);
  
  return function LazyWrapper(props: T) {
    return (
      <LazyComponent 
        loader={importFunc} 
        {...options}
      >
        <LazyComp {...props} />
      </LazyComponent>
    );
  };
}

// Пример использования:
// const LazyAdminPanel = withLazyLoading(() => import('./AdminPanel'), {
//   priority: false,
//   rootMargin: '100px'
// });
