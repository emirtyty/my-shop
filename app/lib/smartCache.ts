// 🧠 Smart Cache с приоритетами и LRU eviction

import { useState, useEffect } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
  accessCount: number;
  lastAccessed: number;
  ttl?: number; // Time to live в миллисекундах
}

interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  priority?: 'high' | 'medium' | 'low';
}

export class SmartCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 минут
    
    // Очистка каждые 30 секунд
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 30000);
  }

  set(key: string, data: T, options: CacheOptions = {}): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      priority: options.priority || 'medium',
      accessCount: 0,
      lastAccessed: Date.now(),
      ttl: options.defaultTTL || this.defaultTTL
    };

    // Если кэш переполнен - удаляем менее приоритетные
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLeastPriority();
    }

    this.cache.set(key, entry);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Проверяем TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Обновляем статистику доступа
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Проверяем TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Удаляет менее приоритетные записи
  private evictLeastPriority(): void {
    let leastPriorityKey: string | null = null;
    let leastPriorityScore = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Скор优先级 = приоритет * время последнего доступа * количество доступов
      const priorityScore = this.calculatePriorityScore(entry);
      
      if (priorityScore < leastPriorityScore) {
        leastPriorityScore = priorityScore;
        leastPriorityKey = key;
      }
    }

    if (leastPriorityKey) {
      this.cache.delete(leastPriorityKey);
    }
  }

  private calculatePriorityScore(entry: CacheEntry<T>): number {
    const priorityWeight = {
      'high': 3,
      'medium': 2,
      'low': 1
    };

    const now = Date.now();
    const timeSinceAccess = now - entry.lastAccessed;
    const timeSinceCreation = now - entry.timestamp;

    // Чем меньше score, тем ниже приоритет удаления
    return (
      priorityWeight[entry.priority] * 
      entry.accessCount * 
      (1 / (1 + timeSinceAccess / 1000)) * // Недавно использованные имеют больший вес
      (1 / (1 + timeSinceCreation / 10000)) // Новые записи имеют больший вес
    );
  }

  // Очистка устаревших записей
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Получение статистики
  getStats() {
    const stats = {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: {
        high: 0,
        medium: 0,
        low: 0
      },
      totalAccesses: 0,
      averageAge: 0
    };

    const now = Date.now();
    let totalAge = 0;

    for (const entry of this.cache.values()) {
      stats.entries[entry.priority]++;
      stats.totalAccesses += entry.accessCount;
      totalAge += now - entry.timestamp;
    }

    if (this.cache.size > 0) {
      stats.averageAge = totalAge / this.cache.size;
    }

    return stats;
  }

  // Предзагрузка данных
  async preload(keys: string[], loader: (key: string) => Promise<T>): Promise<void> {
    const promises = keys.map(async (key) => {
      if (!this.has(key)) {
        try {
          const data = await loader(key);
          this.set(key, data, { priority: 'low' });
        } catch (error) {
          console.error(`Failed to preload ${key}:`, error);
        }
      }
    });

    await Promise.all(promises);
  }

  // Уничтожение кэша
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Глобальные экземпляры для разных типов данных
export const apiCache = new SmartCache({ 
  maxSize: 50, 
  defaultTTL: 2 * 60 * 1000 // 2 минуты для API
});

export const imageCache = new SmartCache({ 
  maxSize: 100, 
  defaultTTL: 10 * 60 * 1000 // 10 минут для изображений
});

export const componentCache = new SmartCache({ 
  maxSize: 30, 
  defaultTTL: 5 * 60 * 1000 // 5 минут для компонентов
});

// React Hook для использования кэша
export function useSmartCache<T>(
  cache: SmartCache<T>,
  key: string,
  loader: () => Promise<T>,
  options?: CacheOptions
) {
  const [data, setData] = useState<T | null>(() => cache.get(key));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Проверяем кэш
    const cachedData = cache.get(key);
    if (cachedData) {
      setData(cachedData);
      return;
    }

    // Загружаем данные
    setLoading(true);
    setError(null);

    loader()
      .then((result) => {
        cache.set(key, result, options);
        setData(result);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [key, cache, loader, options]);

  return { data, loading, error };
}
