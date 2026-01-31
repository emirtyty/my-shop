// 🚀 Advanced Performance Optimizations

// Intersection Observer для предзагрузки
export class PreloadManager {
  private observer: IntersectionObserver | null = null;
  private preloaded = new Set<string>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const element = entry.target as HTMLElement;
              const preloadUrl = element.dataset.preload;
              
              if (preloadUrl && !this.preloaded.has(preloadUrl)) {
                this.preloadResource(preloadUrl);
                this.preloaded.add(preloadUrl);
              }
            }
          });
        },
        { rootMargin: '200px' }
      );
    }
  }

  observe(element: HTMLElement) {
    this.observer?.observe(element);
  }

  preloadResource(url: string) {
    if (this.preloaded.has(url)) return;
    
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
    this.preloaded.add(url);
  }
}

// Resource Hints Manager
export class ResourceHintsManager {
  private static instance: ResourceHintsManager;
  private hints = new Map<string, HTMLLinkElement>();

  static getInstance() {
    if (!ResourceHintsManager.instance) {
      ResourceHintsManager.instance = new ResourceHintsManager();
    }
    return ResourceHintsManager.instance;
  }

  // DNS prefetch для внешних доменов
  dnsPrefetch(domains: string[]) {
    domains.forEach(domain => {
      if (!this.hints.has(`dns-${domain}`)) {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = `//${domain}`;
        document.head.appendChild(link);
        this.hints.set(`dns-${domain}`, link);
      }
    });
  }

  // Preconnect для критических доменов
  preconnect(domains: string[]) {
    domains.forEach(domain => {
      if (!this.hints.has(`preconnect-${domain}`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = `https://${domain}`;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
        this.hints.set(`preconnect-${domain}`, link);
      }
    });
  }

  // Preload для критических ресурсов
  preload(resources: Array<{ url: string; as: string; type?: string }>) {
    resources.forEach(resource => {
      const key = `preload-${resource.url}`;
      if (!this.hints.has(key)) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource.url;
        link.as = resource.as;
        if (resource.type) link.type = resource.type;
        document.head.appendChild(link);
        this.hints.set(key, link);
      }
    });
  }
}

// Critical CSS Inliner
export class CriticalCSSManager {
  private criticalCSS: string = '';

  constructor() {
    this.generateCriticalCSS();
  }

  private generateCriticalCSS() {
    // Критичные стили для above-the-fold контента
    this.criticalCSS = `
      body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
      .loading-skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: loading 1.5s infinite; }
      @keyframes loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      .fade-in { animation: fadeIn 0.3s ease-in; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `;
  }

  inject() {
    if (typeof window !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = this.criticalCSS;
      style.id = 'critical-css';
      document.head.insertBefore(style, document.head.firstChild);
    }
  }
}

// Adaptive Loading Manager
export class AdaptiveLoadingManager {
  private connectionSpeed: 'slow' | 'medium' | 'fast' = 'fast';
  private deviceMemory: number = 4;
  private hardwareConcurrency: number = 4;

  constructor() {
    this.detectCapabilities();
  }

  private detectCapabilities() {
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      this.connectionSpeed = this.getConnectionSpeed(conn.effectiveType);
    }

    if ('deviceMemory' in navigator) {
      this.deviceMemory = (navigator as any).deviceMemory || 4;
    }

    if ('hardwareConcurrency' in navigator) {
      this.hardwareConcurrency = navigator.hardwareConcurrency || 4;
    }
  }

  private getConnectionSpeed(effectiveType: string): 'slow' | 'medium' | 'fast' {
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        return 'slow';
      case '3g':
        return 'medium';
      case '4g':
      default:
        return 'fast';
    }
  }

  // Адаптивная загрузка изображений
  getImageQuality(): 'low' | 'medium' | 'high' {
    if (this.connectionSpeed === 'slow' || this.deviceMemory < 2) return 'low';
    if (this.connectionSpeed === 'medium' || this.deviceMemory < 4) return 'medium';
    return 'high';
  }

  // Адаптивная загрузка компонентов
  shouldLoadComponent(componentName: string): boolean {
    const priority = this.getComponentPriority(componentName);
    return this.connectionSpeed !== 'slow' || priority === 'critical';
  }

  private getComponentPriority(name: string): 'critical' | 'important' | 'optional' {
    const critical = ['header', 'navigation', 'hero'];
    const important = ['stories', 'products-grid'];
    
    if (critical.includes(name)) return 'critical';
    if (important.includes(name)) return 'important';
    return 'optional';
  }

  // Получение оптимального размера изображений
  getOptimalImageSize(): number {
    switch (this.connectionSpeed) {
      case 'slow': return 400;
      case 'medium': return 800;
      default: return 1200;
    }
  }
}

// Performance Budget Monitor
export class PerformanceBudgetMonitor {
  private budgets = {
    javascript: 250000, // 250KB
    css: 50000, // 50KB
    images: 500000, // 500KB
    total: 1000000 // 1MB
  };

  private metrics = {
    js: 0,
    css: 0,
    images: 0,
    total: 0
  };

  trackResource(resource: PerformanceResourceTiming) {
    const size = this.estimateSize(resource);
    const type = this.getResourceType(resource);

    this.metrics[type] += size;
    this.metrics.total += size;

    this.checkBudget(type, size);
  }

  private estimateSize(resource: PerformanceResourceTiming): number {
    // Оценка размера на основе transferSize
    return resource.transferSize || 0;
  }

  private getResourceType(resource: PerformanceResourceTiming): 'js' | 'css' | 'images' {
    const url = resource.name;
    if (url.includes('.js')) return 'js';
    if (url.includes('.css')) return 'css';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'images';
    return 'js'; // по умолчанию
  }

  private checkBudget(type: keyof typeof this.metrics, size: number) {
    if (this.metrics[type] > this.budgets[type]) {
      console.warn(`⚠️ Performance budget exceeded for ${type}: ${this.metrics[type]} / ${this.budgets[type]}`);
    }
  }

  getReport() {
    return {
      metrics: this.metrics,
      budgets: this.budgets,
      withinBudget: this.metrics.total <= this.budgets.total
    };
  }
}

// Smart Loading Queue
export class SmartLoadingQueue {
  private queue: Array<() => Promise<any>> = [];
  private loading = false;
  private maxConcurrent = 3;
  private currentLoading = 0;

  add(task: () => Promise<any>) {
    this.queue.push(task);
    this.process();
  }

  private async process() {
    if (this.loading || this.currentLoading >= this.maxConcurrent) return;

    this.loading = true;
    while (this.queue.length > 0 && this.currentLoading < this.maxConcurrent) {
      const task = this.queue.shift();
      if (task) {
        this.currentLoading++;
        this.executeTask(task);
      }
    }
    this.loading = false;
  }

  private async executeTask(task: () => Promise<any>) {
    try {
      await task();
    } catch (error) {
      console.error('Smart loading task failed:', error);
    } finally {
      this.currentLoading--;
      this.process();
    }
  }
}

// Экспорт экземпляров
export const preloadManager = new PreloadManager();
export const resourceHints = ResourceHintsManager.getInstance();
export const criticalCSS = new CriticalCSSManager();
export const adaptiveLoading = new AdaptiveLoadingManager();
export const performanceBudget = new PerformanceBudgetMonitor();
export const smartQueue = new SmartLoadingQueue();
