'use client';

import React, { useState, useRef, useEffect } from 'react';
import { adaptiveLoading, preloadManager } from '../lib/advancedPerformance';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export default function SmartImage({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  fallback,
  onLoad,
  onError
}: SmartImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Генерация адаптивного URL изображения
  const getAdaptiveSrc = (originalSrc: string): string => {
    const quality = adaptiveLoading.getImageQuality();
    const optimalSize = adaptiveLoading.getOptimalImageSize();
    
    // Если это Supabase Storage, добавляем параметры качества
    if (originalSrc.includes('supabase.co/storage/v1')) {
      const separator = originalSrc.includes('?') ? '&' : '?';
      return `${originalSrc}${separator}quality=${quality === 'low' ? 60 : quality === 'medium' ? 80 : 90}&width=${optimalSize}`;
    }
    
    return originalSrc;
  };

  // Preload для приоритетных изображений
  useEffect(() => {
    if (priority && src) {
      const adaptiveSrc = getAdaptiveSrc(src);
      preloadManager.preloadResource(adaptiveSrc);
    }
  }, [priority, src]);

  // Intersection Observer для lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '100px 0px',
        threshold: 0.1
      }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [priority]);

  // Загрузка изображения с адаптивным качеством
  useEffect(() => {
    if (!isInView || !src || isLoaded || hasError) return;

    const adaptiveSrc = getAdaptiveSrc(src);
    setCurrentSrc(adaptiveSrc);

    const img = imgRef.current;
    if (!img) return;

    const loadStartTime = performance.now();
    
    const handleLoad = () => {
      const loadDuration = performance.now() - loadStartTime;
      setIsLoaded(true);
      onLoad?.();
      
      // Логируем производительность
      if (loadDuration > 1000) {
        console.warn(`🐌 Slow image load: ${loadDuration.toFixed(2)}ms for ${src}`);
      }
    };

    const handleError = () => {
      setHasError(true);
      console.error(`❌ Image load failed: ${src}`);
      onError?.();
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    img.src = adaptiveSrc;

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [isInView, src, isLoaded, hasError, onLoad, onError]);

  // Progressive enhancement - пробуем загрузить более высокое качество
  useEffect(() => {
    if (isLoaded && adaptiveLoading.getImageQuality() !== 'high') {
      // Через 2 секунды пробуем загрузить оригинальное изображение
      const timer = setTimeout(() => {
        if (imgRef.current && src !== currentSrc) {
          const highQualitySrc = getAdaptiveSrc(src);
          if (highQualitySrc !== currentSrc) {
            const tempImg = new Image();
            tempImg.onload = () => {
              imgRef.current!.src = highQualitySrc;
              setCurrentSrc(highQualitySrc);
            };
            tempImg.src = highQualitySrc;
          }
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isLoaded, src, currentSrc]);

  // Fallback при ошибке
  if (hasError && fallback) {
    return (
      <img
        src={fallback}
        alt={alt}
        className={`${className} fallback`}
        width={width}
        height={height}
        style={{
          aspectRatio: width && height ? `${width}/${height}` : undefined,
          backgroundColor: '#f3f4f6',
        }}
      />
    );
  }

  // Skeleton loader
  if (!isLoaded) {
    return (
      <div
        className={`${className} loading-skeleton`}
        style={{
          width: width || '100%',
          height: height || 'auto',
          aspectRatio: width && height ? `${width}/${height}` : undefined,
          backgroundColor: '#f3f4f6',
        }}
      />
    );
  }

  return (
    <img
      ref={imgRef}
      alt={alt}
      className={`${className} fade-in`}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      style={{
        aspectRatio: width && height ? `${width}/${height}` : undefined,
      }}
    />
  );
}
