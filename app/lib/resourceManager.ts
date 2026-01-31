// 🎯 Smart Resource Manager

export class ResourceManager {
  private resources = new Map<string, ResourceEntry>();
  private loadingQueue: LoadingTask[] = [];
  private isProcessing = false;
  private maxConcurrent = 3;
  private currentLoading = 0;

  constructor() {
    this.initPerformanceMonitoring();
  }

  // Регистрация ресурса
  registerResource(id: string, config: ResourceConfig): void {
    this.resources.set(id, {
      id,
      config,
      status: 'pending',
      loadTime: 0,
      errorCount: 0,
      lastLoaded: 0
    });
  }

  // Загрузка ресурса с умной очередью
  async loadResource(id: string): Promise<any> {
    const resource = this.resources.get(id);
    if (!resource) {
      throw new Error(`Resource ${id} not found`);
    }

    // Если уже загружен и не устарел
    if (resource.status === 'loaded' && !this.isExpired(resource)) {
      return resource.data;
    }

    // Добавляем в очередь загрузки
    return new Promise((resolve, reject) => {
      this.loadingQueue.push({
        id,
        resource,
        resolve,
        reject,
        retryCount: 0
      });
      
      this.processQueue();
    });
  }

  // Обработка очереди загрузки
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.currentLoading >= this.maxConcurrent) {
      return;
    }

    this.isProcessing = true;

    while (this.loadingQueue.length > 0 && this.currentLoading < this.maxConcurrent) {
      const task = this.loadingQueue.shift();
      if (task) {
        this.currentLoading++;
        this.executeTask(task);
      }
    }

    this.isProcessing = false;
  }

  // Выполнение задачи загрузки
  private async executeTask(task: LoadingTask): Promise<void> {
    const { resource, resolve, reject } = task;

    try {
      resource.status = 'loading';
      const startTime = performance.now();

      let data;
      switch (resource.config.type) {
        case 'image':
          data = await this.loadImage(resource.config.url);
          break;
        case 'script':
          data = await this.loadScript(resource.config.url);
          break;
        case 'style':
          data = await this.loadStyle(resource.config.url);
          break;
        case 'json':
          data = await this.loadJSON(resource.config.url);
          break;
        default:
          throw new Error(`Unknown resource type: ${resource.config.type}`);
      }

      const loadTime = performance.now() - startTime;
      
      resource.status = 'loaded';
      resource.data = data;
      resource.loadTime = loadTime;
      resource.lastLoaded = Date.now();
      resource.errorCount = 0;

      resolve(data);
      
      // Логируем медленные ресурсы
      if (loadTime > 1000) {
        console.warn(`🐌 Slow resource: ${task.id} (${loadTime.toFixed(2)}ms)`);
      }

    } catch (error) {
      resource.status = 'error';
      resource.errorCount++;
      
      // Retry логика
      if (resource.errorCount < (resource.config.maxRetries || 3)) {
        console.warn(`🔄 Retrying resource ${task.id} (attempt ${resource.errorCount})`);
        
        setTimeout(() => {
          this.loadingQueue.push({ ...task, retryCount: resource.errorCount });
          this.processQueue();
        }, Math.pow(2, resource.errorCount) * 1000); // Exponential backoff
        
      } else {
        console.error(`❌ Failed to load resource ${task.id}:`, error);
        reject(error);
      }
    } finally {
      this.currentLoading--;
      this.processQueue();
    }
  }

  // Загрузка изображения
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  // Загрузка скрипта
  private loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.onload = () => resolve();
      script.onerror = reject;
      script.src = url;
      document.head.appendChild(script);
    });
  }

  // Загрузка стилей
  private loadStyle(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.onload = () => resolve();
      link.onerror = reject;
      link.href = url;
      document.head.appendChild(link);
    });
  }

  // Загрузка JSON
  private async loadJSON(url: string): Promise<any> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // Проверка истечения срока действия
  private isExpired(resource: ResourceEntry): boolean {
    if (!resource.config.ttl) return false;
    return Date.now() - resource.lastLoaded > resource.config.ttl;
  }

  // Инициализация мониторинга производительности
  private initPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            this.analyzeResourcePerformance(entry as PerformanceResourceTiming);
          }
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
    }
  }

  // Анализ производительности ресурсов
  private analyzeResourcePerformance(entry: PerformanceResourceTiming): void {
    const loadTime = entry.responseEnd - entry.requestStart;
    
    if (loadTime > 2000) {
      console.warn(`🐌 Slow resource detected:`, {
        name: entry.name,
        loadTime: `${loadTime.toFixed(2)}ms`,
        size: entry.transferSize,
        type: this.getResourceType(entry.name)
      });
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'style';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'image';
    return 'other';
  }

  // Получение статистики
  getStats(): ResourceStats {
    const stats: ResourceStats = {
      total: this.resources.size,
      loaded: 0,
      loading: 0,
      error: 0,
      pending: 0,
      averageLoadTime: 0,
      totalLoadTime: 0
    };

    let totalLoadTime = 0;
    let loadedCount = 0;

    for (const resource of this.resources.values()) {
      stats[resource.status]++;
      
      if (resource.status === 'loaded') {
        totalLoadTime += resource.loadTime;
        loadedCount++;
      }
    }

    if (loadedCount > 0) {
      stats.averageLoadTime = totalLoadTime / loadedCount;
    }

    return stats;
  }

  // Предзагрузка критических ресурсов
  async preloadCriticalResources(resources: ResourceConfig[]): Promise<void> {
    const criticalResources = resources.filter(r => r.priority === 'critical');
    
    const promises = criticalResources.map(config => {
      const id = this.generateResourceId(config);
      this.registerResource(id, config);
      return this.loadResource(id);
    });

    await Promise.all(promises);
  }

  private generateResourceId(config: ResourceConfig): string {
    return `${config.type}-${config.url.replace(/[^a-zA-Z0-9]/g, '-')}`;
  }
}

// Типы
interface ResourceEntry {
  id: string;
  config: ResourceConfig;
  status: 'pending' | 'loading' | 'loaded' | 'error';
  data?: any;
  loadTime: number;
  errorCount: number;
  lastLoaded: number;
}

interface ResourceConfig {
  url: string;
  type: 'image' | 'script' | 'style' | 'json';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  ttl?: number;
  maxRetries?: number;
}

interface LoadingTask {
  id: string;
  resource: ResourceEntry;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  retryCount: number;
}

interface ResourceStats {
  total: number;
  loaded: number;
  loading: number;
  error: number;
  pending: number;
  averageLoadTime: number;
  totalLoadTime: number;
}

// Глобальный экземпляр
export const resourceManager = new ResourceManager();
