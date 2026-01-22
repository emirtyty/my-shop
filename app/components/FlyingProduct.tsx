'use client';

import { useEffect, useState } from 'react';

interface FlyingProductProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  imageUrl: string;
  onComplete: () => void;
}

export default function FlyingProduct({ startX, startY, endX, endY, imageUrl, onComplete }: FlyingProductProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    console.log('🛒 FlyingProduct mounted with props:', { startX, startY, endX, endY, imageUrl });
    
    // Простая анимация через CSS
    const timer = setTimeout(() => {
      console.log('🎯 Animation timeout triggered');
      setIsVisible(false);
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed pointer-events-none z-[9999] animate-fly-to-cart"
      style={{
        left: `${startX}px`,
        top: `${startY}px`,
        width: '60px',
        height: '60px',
      }}
    >
      <img
        src={imageUrl}
        alt="Flying product"
        className="w-full h-full object-cover rounded-lg shadow-2xl"
      />
    </div>
  );
}
