// 🚀 Утилиты производительности

// Web Worker для тяжелых вычислений
export class PerformanceWorker {
  private worker: Worker | null = null;
  private workerCode: string;

  constructor() {
    // Код для Web Worker
    this.workerCode = `
      self.onmessage = function(e) {
        const { type, data } = e.data;
        
        switch(type) {
          case 'calculateStats':
            const stats = calculateProductStats(data.products);
            self.postMessage({ type: 'stats', result: stats });
            break;
            
          case 'filterProducts':
            const filtered = filterProductsArray(data.products, data.filters);
            self.postMessage({ type: 'filtered', result: filtered });
            break;
            
          case 'sortProducts':
            const sorted = sortProductsArray(data.products, data.sortBy, data.order);
            self.postMessage({ type: 'sorted', result: sorted });
            break;
            
          case 'searchProducts':
            const searchResults = searchInProducts(data.products, data.query);
            self.postMessage({ type: 'searchResults', result: searchResults });
            break;
        }
      };
      
      function calculateProductStats(products) {
        const stats = {
          total: products.length,
          avgPrice: 0,
          priceRange: { min: Infinity, max: 0 },
          categories: {},
          discountStats: { withDiscount: 0, avgDiscount: 0 }
        };
        
        let totalPrice = 0;
        
        products.forEach(product => {
          // Цена
          totalPrice += product.price;
          stats.priceRange.min = Math.min(stats.priceRange.min, product.price);
          stats.priceRange.max = Math.max(stats.priceRange.max, product.price);
          
          // Категории
          stats.categories[product.category] = (stats.categories[product.category] || 0) + 1;
          
          // Скидки
          if (product.discount && product.discount > 0) {
            stats.discountStats.withDiscount++;
            stats.discountStats.avgDiscount += product.discount;
          }
        });
        
        stats.avgPrice = products.length > 0 ? totalPrice / products.length : 0;
        stats.discountStats.avgDiscount = stats.discountStats.withDiscount > 0 
          ? stats.discountStats.avgDiscount / stats.discountStats.withDiscount 
          : 0;
          
        return stats;
      }
      
      function filterProductsArray(products, filters) {
        return products.filter(product => {
          if (filters.category && product.category !== filters.category) return false;
          if (filters.minPrice && product.price < filters.minPrice) return false;
          if (filters.maxPrice && product.price > filters.maxPrice) return false;
          if (filters.minDiscount && (!product.discount || product.discount < filters.minDiscount)) return false;
          if (filters.inStock && product.stock_quantity === 0) return false;
          return true;
        });
      }
      
      function sortProductsArray(products, sortBy, order = 'asc') {
        return [...products].sort((a, b) => {
          let aVal = a[sortBy];
          let bVal = b[sortBy];
          
          if (typeof aVal === 'string') aVal = aVal.toLowerCase();
          if (typeof bVal === 'string') bVal = bVal.toLowerCase();
          
          if (order === 'desc') {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
          } else {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          }
        });
      }
      
      function searchInProducts(products, query) {
        const searchQuery = query.toLowerCase();
        return products.filter(product => 
          product.name.toLowerCase().includes(searchQuery) ||
          product.description?.toLowerCase().includes(searchQuery) ||
          product.category.toLowerCase().includes(searchQuery)
        );
      }
    `;
  }

  // Инициализация Web Worker
  init(): void {
    if (typeof window !== 'undefined' && 'Worker' in window) {
      const blob = new Blob([this.workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
    }
  }

  // Выполнение задачи в Web Worker
  async execute<T>(type: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Web Worker не инициализирован'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Timeout выполнения задачи'));
      }, 10000);

      this.worker!.onmessage = (e) => {
        clearTimeout(timeout);
        if (e.data.type === type) {
          resolve(e.data.result);
        }
      };

      this.worker!.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      this.worker!.postMessage({ type, data });
    });
  }

  // Очистка
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Ленивая загрузка изображений
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  private loadedImages = new Set<string>();

  constructor() {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              const src = img.dataset.src;
              
              if (src && !this.loadedImages.has(src)) {
                img.src = src;
                img.classList.remove('lazy');
                img.classList.add('loaded');
                this.loadedImages.add(src);
                this.observer?.unobserve(img);
              }
            }
          });
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.1
        }
      );
    }
  }

  observe(img: HTMLImageElement): void {
    if (this.observer) {
      this.observer.observe(img);
    } else {
      // Fallback для браузеров без IntersectionObserver
      const src = img.dataset.src;
      if (src) {
        img.src = src;
        img.classList.remove('lazy');
        img.classList.add('loaded');
        this.loadedImages.add(src);
      }
    }
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Оптимизация bundle размера
export const bundleOptimizer = {
  // Динамический импорт компонентов
  loadComponent: async <T>(componentPath: string): Promise<T> => {
    try {
      const module = await import(componentPath);
      return module.default;
    } catch (error) {
      console.error(`Ошибка загрузки компонента ${componentPath}:`, error);
      throw error;
    }
  },

  // Preload критичных ресурсов
  preloadResource: (href: string, as: string): void => {
    if (typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      document.head.appendChild(link);
    }
  },

  // Prefetch некритичных ресурсов
  prefetchResource: (href: string): void => {
    if (typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    }
  }
};

// Кэширование запросов
export class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 300000): void { // 5 минут по умолчанию
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Очистка устаревших записей
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Оптимизация рендеринга
export const renderOptimizer = {
  // Debounce для поиска
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle для скролла
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Виртуальный скроллинг для больших списков
  calculateVisibleItems: (
    scrollTop: number,
    containerHeight: number,
    itemHeight: number,
    totalItems: number,
    overscan: number = 5
  ) => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      totalItems - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return {
      startIndex,
      endIndex,
      visibleItems: endIndex - startIndex + 1,
      offsetY: startIndex * itemHeight
    };
  }
};

// Мониторинг производительности
export const performanceMonitor = {
  // Измерение времени выполнения
  measure: async <T>(
    name: string,
    fn: () => Promise<T> | T
  ): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    
    // Отправка метрик в проде
    if (process.env.NODE_ENV === 'production' && duration > 1000) {
      console.warn(`🐌 Медленная операция: ${name} (${duration.toFixed(2)}ms)`);
    }
    
    return { result, duration };
  },

  // Core Web Vitals
  measureCoreWebVitals: () => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Largest Contentful Paint (LCP)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log(`🎨 LCP: ${lastEntry.startTime.toFixed(2)}ms`);
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay (FID)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          console.log(`⚡ FID: ${entry.processingStart - entry.startTime.toFixed(2)}ms`);
        });
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        console.log(`📐 CLS: ${clsValue.toFixed(3)}`);
      }).observe({ entryTypes: ['layout-shift'] });
    }
  }
};

// Глобальные экземпляры
export const performanceWorker = new PerformanceWorker();
export const lazyImageLoader = new LazyImageLoader();
export const requestCache = new RequestCache();

// Инициализация при загрузке
if (typeof window !== 'undefined') {
  // Инициализация Web Worker
  performanceWorker.init();
  
  // Очистка кэша каждые 5 минут
  setInterval(() => {
    requestCache.cleanup();
  }, 300000);
  
  // Мониторинг производительности
  performanceMonitor.measureCoreWebVitals();
}
