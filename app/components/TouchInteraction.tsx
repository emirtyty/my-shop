'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface TouchInteractionProps {
  children: React.ReactNode;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  className?: string;
  hapticFeedback?: boolean;
  longPressDelay?: number;
  doubleTapDelay?: number;
  swipeThreshold?: number;
  pinchThreshold?: number;
}

export default function TouchInteraction({
  children,
  onTap,
  onDoubleTap,
  onLongPress,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinch,
  className = '',
  hapticFeedback = true,
  longPressDelay = 500,
  doubleTapDelay = 300,
  swipeThreshold = 50,
  pinchThreshold = 10
}: TouchInteractionProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0, time: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });
  const [lastTap, setLastTap] = useState(0);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [initialDistance, setInitialDistance] = useState(0);
  const [isPinching, setIsPinching] = useState(false);

  // Haptic feedback
  const triggerHaptic = async (style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!hapticFeedback || !Capacitor.isNativePlatform()) return;

    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const impactStyle = style === 'light' ? ImpactStyle.Light : 
                         style === 'medium' ? ImpactStyle.Medium : 
                         ImpactStyle.Heavy;
      await Haptics.impact({ style: impactStyle });
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  };

  // Вычисление расстояния между двумя точками
  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Обработка начала касания
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const now = Date.now();
    
    setTouchStart({ x: touch.clientX, y: touch.clientY, time: now });
    setTouchEnd({ x: touch.clientX, y: touch.clientY });

    // Обработка двойного тапа
    if (onDoubleTap && now - lastTap < doubleTapDelay) {
      e.preventDefault();
      triggerHaptic('medium');
      onDoubleTap();
      setLastTap(0);
      return;
    }
    setLastTap(now);

    // Установка таймера для long press
    if (onLongPress) {
      const timer = setTimeout(() => {
        triggerHaptic('heavy');
        onLongPress();
      }, longPressDelay);
      setLongPressTimer(timer);
    }

    // Обработка pinch (если два пальца)
    if (e.touches.length === 2 && onPinch) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      setInitialDistance(distance);
      setIsPinching(true);
    }
  };

  // Обработка движения касания
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });

    // Отмена long press при движении
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    // Обработка pinch
    if (e.touches.length === 2 && isPinching && onPinch) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      const scale = distance / initialDistance;
      
      if (Math.abs(scale - 1) > pinchThreshold / 100) {
        onPinch(scale);
      }
    }
  };

  // Обработка окончания касания
  const handleTouchEnd = (e: React.TouchEvent) => {
    // Очистка таймеров
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;

    // Определение типа жеста
    const isSwipe = Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold;
    const isTap = !isSwipe && deltaTime < 200;

    if (isTap && onTap) {
      triggerHaptic('light');
      onTap();
    } else if (isSwipe) {
      // Определение направления свайпа
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0 && onSwipeRight) {
          triggerHaptic('light');
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          triggerHaptic('light');
          onSwipeLeft();
        }
      } else {
        if (deltaY > 0 && onSwipeDown) {
          triggerHaptic('light');
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          triggerHaptic('light');
          onSwipeUp();
        }
      }
    }

    setIsPinching(false);
    setInitialDistance(0);
  };

  // Очистка таймеров при unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  return (
    <div
      ref={elementRef}
      className={`touch-interaction ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        touchAction: 'manipulation', // Улучшает производительность touch событий
        WebkitUserSelect: 'none', // Отключает выделение текста при touch
        WebkitTouchCallout: 'none', // Отключает контекстное меню
        KhtmlUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {children}
    </div>
  );
}

// Hook для удобного использования touch взаимодействий
export function useTouchInteraction(options: Partial<TouchInteractionProps> = {}) {
  return {
    TouchInteraction: (props: Omit<TouchInteractionProps, keyof typeof options> & { children: React.ReactNode }) => (
      <TouchInteraction {...options} {...props} />
    )
  };
}
