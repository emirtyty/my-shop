'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { renderOptimizer } from '../lib/performance';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

export default function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Вычисляем видимые элементы
  const visibleItems = useMemo(() => {
    return renderOptimizer.calculateVisibleItems(
      scrollTop,
      containerHeight,
      itemHeight,
      items.length,
      overscan
    );
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan]);

  // Обработчик скролла с throttling
  const handleScroll = useMemo(() => 
    renderOptimizer.throttle((e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    }, 16) // ~60fps
  , [onScroll]);

  // Получаем видимые элементы
  const visibleItemsData = useMemo(() => {
    return items.slice(visibleItems.startIndex, visibleItems.endIndex + 1);
  }, [items, visibleItems]);

  return (
    <div
      ref={containerRef}
      className={`virtual-list ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      {/* Контейнер для всех элементов (для правильного скролла) */}
      <div
        style={{
          height: items.length * itemHeight,
          position: 'relative'
        }}
      >
        {/* Видимые элементы */}
        <div
          style={{
            transform: `translateY(${visibleItems.offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItemsData.map((item, index) => (
            <div
              key={visibleItems.startIndex + index}
              style={{
                height: itemHeight,
                overflow: 'hidden'
              }}
            >
              {renderItem(item, visibleItems.startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
