import { useState, useEffect } from 'react';

interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  gradient: string;
}

const useBrandColors = () => {
  const [colors, setColors] = useState<BrandColors>({
    primary: '#FF6B35',
    secondary: '#F97316',
    accent: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #F97316 100%)'
  });

  // CSS переменные для брендовых цветов
  useEffect(() => {
    const root = document.documentElement;
    
    root.style.setProperty('--brand-primary', colors.primary);
    root.style.setProperty('--brand-secondary', colors.secondary);
    root.style.setProperty('--brand-accent', colors.accent);
    root.style.setProperty('--brand-success', colors.success);
    root.style.setProperty('--brand-warning', colors.warning);
    root.style.setProperty('--brand-error', colors.error);
    root.style.setProperty('--brand-gradient', colors.gradient);
    
    // Добавляем CSS переменные для анимаций
    root.style.setProperty('--animation-duration-fast', '0.2s');
    root.style.setProperty('--animation-duration-normal', '0.3s');
    root.style.setProperty('--animation-duration-slow', '0.5s');
    root.style.setProperty('--animation-timing-ease', 'cubic-bezier(0.4, 0.0, 0.2, 1)');
    root.style.setProperty('--animation-timing-bounce', 'cubic-bezier(0.68, -0.55, 0.265, 1.55)');
  }, [colors]);

  return {
    colors,
    updateColors: (newColors: Partial<BrandColors>) => {
      setColors(prev => ({ ...prev, ...newColors }));
    }
  };
};

export default useBrandColors;
