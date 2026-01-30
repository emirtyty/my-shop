'use client';

import { useEffect, useRef, useState } from 'react';

// Hook для виртуальной прокрутки больших списков
interface UseVirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  getItemKey?: (index: number) => string | number;
}

export function useVirtualScroll<T>({
  itemHeight,
  containerHeight,
  overscan = 5,
  getItemKey = (index) => index
}: UseVirtualScrollOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  const [items, setItems] = useState<T[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  );

  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length - 1, visibleEnd + overscan);

  const visibleItems = items.slice(startIndex, endIndex + 1).map((item, index) => ({
    item,
    index: startIndex + index,
    key: getItemKey(startIndex + index)
  }));

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    setItems
  };
}

// Hook для дебаунсинга
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook для троттлинга
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

// Hook для ленивой загрузки компонентов
export function useLazyLoad(threshold = 0.1) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsIntersecting(true);
          setHasLoaded(true);
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, hasLoaded]);

  return {
    elementRef,
    isIntersecting,
    hasLoaded
  };
}

// Hook для мемоизации дорогих вычислений
export function useMemoized<T>(factory: () => T, deps: React.DependencyList): T {
  const [value, setValue] = useState<T>(factory);
  const prevDeps = useRef<React.DependencyList>(deps);

  useEffect(() => {
    const hasChanged = deps.some((dep, i) => dep !== prevDeps.current[i]);
    if (hasChanged) {
      setValue(factory());
      prevDeps.current = deps;
    }
  }, deps);

  return value;
}

// Hook для управления состоянием загрузки с кэшированием
interface UseCachedStateOptions<T> {
  cacheKey: string;
  ttl?: number; // Time to live in milliseconds
}

export function useCachedState<T>(
  initialValue: T,
  options: UseCachedStateOptions<T>
) {
  const { cacheKey, ttl = 5 * 60 * 1000 } = options; // 5 минут по умолчанию
  const [state, setState] = useState<T>(() => {
    // Пытаемся загрузить из кэша
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { value, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < ttl) {
            return value;
          }
        }
      } catch (error) {
        console.error('Cache read error:', error);
      }
    }
    return initialValue;
  });

  const setStateWithCache = (newValue: T | ((prev: T) => T)) => {
    const valueToSet = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(state)
      : newValue;

    setState(valueToSet);

    // Сохраняем в кэш
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          value: valueToSet,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Cache write error:', error);
      }
    }
  };

  return [state, setStateWithCache] as const;
}

// Hook для отслеживания производительности
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    componentCount: 0,
    reRenderCount: 0
  });

  const renderStart = useRef<number>(Date.now());
  const reRenderCount = useRef<number>(0);

  useEffect(() => {
    const renderTime = Date.now() - renderStart.current;
    reRenderCount.current += 1;

    setMetrics(prev => ({
      ...prev,
      renderTime,
      reRenderCount: reRenderCount.current
    }));

    renderStart.current = Date.now();
  });

  const measureComponent = (componentName: string) => {
    const start = performance.now();
    return () => {
      const end = performance.now();
      console.log(`⚡ ${componentName} render time: ${end - start}ms`);
    };
  };

  return {
    metrics,
    measureComponent
  };
}

// Hook для оптимизации изображений
export function useImageOptimization() {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const preloadImage = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (loadedImages.has(src)) {
        resolve();
        return;
      }

      setLoadingImages(prev => new Set(prev).add(src));

      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(src));
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(src);
          return newSet;
        });
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  const preloadImages = async (urls: string[]) => {
    const promises = urls.map(url => preloadImage(url));
    await Promise.allSettled(promises);
  };

  return {
    loadedImages,
    loadingImages,
    preloadImage,
    preloadImages
  };
}

// Hook для управления памятью
export function useMemoryManagement() {
  const [memoryUsage, setMemoryUsage] = useState({
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0
  });

  useEffect(() => {
    if ('memory' in performance) {
      const updateMemoryUsage = () => {
        const memory = (performance as any).memory;
        setMemoryUsage({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        });
      };

      const interval = setInterval(updateMemoryUsage, 5000);
      updateMemoryUsage();

      return () => clearInterval(interval);
    }
  }, []);

  const clearCache = () => {
    // Очистка неиспользуемых данных
    if ('gc' in window) {
      (window as any).gc();
    }
  };

  return {
    memoryUsage,
    clearCache
  };
}

// Компонент для ленивой загрузки
interface LazyLoadProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}

export function LazyLoad({
  children,
  fallback = <div>Loading...</div>,
  threshold = 0.1,
  rootMargin = '50px'
}: LazyLoadProps) {
  const { elementRef, isIntersecting } = useLazyLoad(threshold);

  return (
    <div ref={elementRef}>
      {isIntersecting ? children : fallback}
    </div>
  );
}

// Компонент для виртуального списка
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey?: (index: number) => string | number;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  getItemKey = (index) => index,
  overscan = 5
}: VirtualListProps<T>) {
  const {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll
  } = useVirtualScroll({
    itemHeight,
    containerHeight,
    overscan,
    getItemKey
  });

  useEffect(() => {
    // Устанавливаем элементы
    // В реальном использовании это должно приходить извне
  }, [items]);

  return (
    <div
      ref={containerRef}
      style={{
        height: containerHeight,
        overflow: 'auto'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div
              key={getItemKey(index)}
              style={{ height: itemHeight }}
            >
              {renderItem(item as T, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
