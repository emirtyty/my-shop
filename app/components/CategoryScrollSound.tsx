'use client';

import { useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface CategoryScrollSoundProps {
  enabled?: boolean;
  volume?: number;
}

export default function CategoryScrollSound({ 
  enabled = true, 
  volume = 0.2 
}: CategoryScrollSoundProps) {
  const lastScrollTime = useRef(0);
  const scrollThreshold = 50;

  useEffect(() => {
    if (!enabled) return;

    const handleScroll = (event: Event) => {
      const now = Date.now();
      
      if (now - lastScrollTime.current < 100) return;
      
      const target = event.target as HTMLElement;
      if (!target) return;

      const isCategoryScroll = 
        target.closest('[data-category-scroll]') ||
        target.closest('.category-scroll') ||
        target.closest('.categories') ||
        target.closest('[role="tablist"]') ||
        target.closest('[data-category-modal="true"]') ||
        target.classList.contains('category-container');

      console.log('CategoryScrollSound: isCategoryScroll =', isCategoryScroll, 'target =', target);

      if (!isCategoryScroll) return;

      const scrollDelta = Math.abs((event as WheelEvent).deltaY || 0);
      if (scrollDelta < scrollThreshold) return;

      console.log('CategoryScrollSound: Playing sound');
      lastScrollTime.current = now;
      playScrollSound();
    };

    const handleTouchMove = (event: TouchEvent) => {
      const now = Date.now();
      
      if (now - lastScrollTime.current < 150) return;
      
      const target = event.target as HTMLElement;
      if (!target) return;

      const isCategoryScroll = 
        target.closest('[data-category-scroll]') ||
        target.closest('.category-scroll') ||
        target.closest('.categories') ||
        target.closest('[role="tablist"]') ||
        target.closest('[data-category-modal="true"]') ||
        target.classList.contains('category-container');

      if (!isCategoryScroll) return;

      lastScrollTime.current = now;
      playScrollSound();
    };

    const playScrollSound = async () => {
      try {
        // Добавляем звуковой эффект
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.1;
        audio.play().catch(() => {});

        // Тактильный отклик
        await Haptics.impact({
          style: ImpactStyle.Light
        });
      } catch (error) {
        console.log('Haptics error:', error);
      }
    };

    document.addEventListener('wheel', handleScroll, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      document.removeEventListener('wheel', handleScroll);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [enabled, volume]);

  return null;
}

export function useCategoryScrollSound() {
  const playSound = async () => {
    try {
      await Haptics.impact({
        style: ImpactStyle.Light
      });
    } catch (error) {
      console.log('Haptics not available');
    }
  };

  return { playSound };
}
