'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean; // Для важных изображений (hero, first images)
  fallback?: string; // Fallback изображение
  onLoad?: () => void;
  onError?: () => void;
}

export default function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  fallback,
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer для lazy loading
  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px' // Начинать загрузку за 50px до появления в viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Определение формата изображения
  const getOptimizedSrc = (originalSrc: string) => {
    // Если это уже webp
    if (originalSrc.includes('.webp')) {
      return originalSrc;
    }

    // Проверяем поддержку webp
    if (typeof window !== 'undefined') {
      const canvas = document.createElement('canvas');
      const webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      
      if (webpSupported) {
        const webpSrc = originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        return webpSrc;
      }
    }

    return originalSrc;
  };

  // Haptic feedback на мобильных устройствах
  const triggerHaptic = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (error) {
        console.log('Haptic feedback not available');
      }
    }
  };

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const handleClick = () => {
    triggerHaptic();
  };

  // Показываем placeholder или загруженное изображение
  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={`animate-pulse ${className}`}
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          width: width || '100%',
          height: height || 'auto',
          aspectRatio: width && height ? `${width}/${height}` : undefined
        }}
      />
    );
  }

  if (hasError && fallback) {
    return (
      <img
        src={fallback}
        alt={alt}
        className={className}
        width={width}
        height={height}
        onClick={handleClick}
        style={{
          objectFit: 'cover',
          opacity: 1
        }}
      />
    );
  }

  return (
    <div className="relative overflow-hidden">
      {/* Skeleton placeholder */}
      {!isLoaded && (
        <div
          className={`absolute inset-0 animate-pulse ${className}`}
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            zIndex: 1
          }}
        />
      )}
      
      {/* Основное изображение */}
      <img
        ref={imgRef}
        src={isInView ? getOptimizedSrc(src) : undefined}
        alt={alt}
        className={`transition-opacity duration-300 ${className}`}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        onClick={handleClick}
        style={{
          objectFit: 'cover',
          opacity: isLoaded ? 1 : 0,
          cursor: 'pointer'
        }}
      />
      
      {/* Индикатор загрузки */}
      {!isLoaded && isInView && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
