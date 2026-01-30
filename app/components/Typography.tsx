'use client';

import React, { useState } from 'react';

// Типографические компоненты с адаптивными размерами
interface TypographyProps {
  children: React.ReactNode;
  className?: string;
  color?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'inherit';
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right' | 'justify';
  truncate?: boolean;
  gradient?: boolean;
}

const colorClasses = {
  primary: 'text-primary',
  secondary: 'text-secondary', 
  tertiary: 'text-tertiary',
  accent: 'text-accent',
  inherit: ''
};

const weightClasses = {
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold'
};

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify'
};

// Заголовки
interface HeadingProps extends TypographyProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  responsive?: boolean;
}

export function Heading({
  children,
  level,
  className = '',
  color = 'primary',
  weight = 'bold',
  align = 'left',
  truncate = false,
  gradient = false,
  responsive = true
}: HeadingProps) {
  const sizeClasses = {
    1: responsive 
      ? 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl' 
      : 'text-4xl',
    2: responsive 
      ? 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl' 
      : 'text-3xl',
    3: responsive 
      ? 'text-xl sm:text-2xl md:text-3xl lg:text-4xl' 
      : 'text-2xl',
    4: responsive 
      ? 'text-lg sm:text-xl md:text-2xl lg:text-3xl' 
      : 'text-xl',
    5: responsive 
      ? 'text-base sm:text-lg md:text-xl lg:text-2xl' 
      : 'text-lg',
    6: responsive 
      ? 'text-sm sm:text-base md:text-lg lg:text-xl' 
      : 'text-base'
  };

  const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  
  const classes = [
    sizeClasses[level],
    weightClasses[weight],
    alignClasses[align],
    colorClasses[color],
    truncate ? 'line-clamp-2' : '',
    gradient ? 'text-gradient' : '',
    'leading-tight',
    className
  ].filter(Boolean).join(' ');

  return (
    <HeadingTag 
      className={classes}
      style={{
        color: gradient ? undefined : `var(--text-${color})`,
        background: gradient ? `linear-gradient(135deg, var(--accent), var(--text-primary))` : undefined,
        WebkitBackgroundClip: gradient ? 'text' : undefined,
        WebkitTextFillColor: gradient ? 'transparent' : undefined,
        backgroundClip: gradient ? 'text' : undefined
      }}
    >
      {children}
    </HeadingTag>
  );
}

// Текст
interface TextProps extends TypographyProps {
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  responsive?: boolean;
  lineHeight?: 'tight' | 'snug' | 'normal' | 'relaxed' | 'loose';
  letterSpacing?: 'tighter' | 'tight' | 'normal' | 'wide' | 'wider' | 'widest';
}

export function Text({
  children,
  size = 'base',
  className = '',
  color = 'primary',
  weight = 'normal',
  align = 'left',
  truncate = false,
  gradient = false,
  responsive = true,
  lineHeight = 'normal',
  letterSpacing = 'normal'
}: TextProps) {
  const sizeClasses = {
    xs: responsive 
      ? 'text-xs sm:text-sm' 
      : 'text-xs',
    sm: responsive 
      ? 'text-sm sm:text-base' 
      : 'text-sm',
    base: responsive 
      ? 'text-base sm:text-lg' 
      : 'text-base',
    lg: responsive 
      ? 'text-lg sm:text-xl md:text-2xl' 
      : 'text-lg',
    xl: responsive 
      ? 'text-xl sm:text-2xl md:text-3xl' 
      : 'text-xl',
    '2xl': responsive 
      ? 'text-2xl sm:text-3xl md:text-4xl' 
      : 'text-2xl',
    '3xl': responsive 
      ? 'text-3xl sm:text-4xl md:text-5xl' 
      : 'text-3xl'
  };

  const lineHeightClasses = {
    tight: 'leading-tight',
    snug: 'leading-snug',
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
    loose: 'leading-loose'
  };

  const letterSpacingClasses = {
    tighter: 'tracking-tighter',
    tight: 'tracking-tight',
    normal: 'tracking-normal',
    wide: 'tracking-wide',
    wider: 'tracking-wider',
    widest: 'tracking-widest'
  };

  const classes = [
    sizeClasses[size],
    weightClasses[weight],
    alignClasses[align],
    colorClasses[color],
    lineHeightClasses[lineHeight],
    letterSpacingClasses[letterSpacing],
    truncate ? 'line-clamp-3' : '',
    gradient ? 'text-gradient' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <p 
      className={classes}
      style={{
        color: gradient ? undefined : `var(--text-${color})`,
        background: gradient ? `linear-gradient(135deg, var(--accent), var(--text-primary))` : undefined,
        WebkitBackgroundClip: gradient ? 'text' : undefined,
        WebkitTextFillColor: gradient ? 'transparent' : undefined,
        backgroundClip: gradient ? 'text' : undefined
      }}
    >
      {children}
    </p>
  );
}

// Цена с улучшенным форматированием
interface PriceProps {
  amount: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'accent' | 'success' | 'error';
  strikeThrough?: boolean;
  className?: string;
}

export function Price({
  amount,
  currency = '₽',
  size = 'md',
  color = 'primary',
  strikeThrough = false,
  className = ''
}: PriceProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const colorMap = {
    primary: 'var(--text-primary)',
    accent: 'var(--accent)',
    success: '#10b981',
    error: '#ef4444'
  };

  return (
    <span 
      className={`
        ${sizeClasses[size]} 
        font-bold 
        ${strikeThrough ? 'line-through' : ''}
        ${className}
      `}
      style={{
        color: colorMap[color]
      }}
    >
      {amount.toLocaleString('ru-RU')}{currency}
    </span>
  );
}

// Бейдж для категорий и тегов
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'solid' | 'outline' | 'soft';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  rounded?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'solid',
  size = 'md',
  color = 'primary',
  rounded = true,
  className = ''
}: BadgeProps) {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const roundedClasses = rounded ? 'rounded-full' : 'rounded-md';

  const variantStyles = {
    solid: {
      primary: { backgroundColor: 'var(--accent)', color: 'white' },
      secondary: { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' },
      accent: { backgroundColor: '#FF6B35', color: 'white' },
      success: { backgroundColor: '#10b981', color: 'white' },
      warning: { backgroundColor: '#f59e0b', color: 'white' },
      error: { backgroundColor: '#ef4444', color: 'white' }
    },
    outline: {
      primary: { border: '1px solid var(--accent)', color: 'var(--accent)' },
      secondary: { border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' },
      accent: { border: '1px solid #FF6B35', color: '#FF6B35' },
      success: { border: '1px solid #10b981', color: '#10b981' },
      warning: { border: '1px solid #f59e0b', color: '#f59e0b' },
      error: { border: '1px solid #ef4444', color: '#ef4444' }
    },
    soft: {
      primary: { backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)' },
      secondary: { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' },
      accent: { backgroundColor: 'rgba(255, 107, 53, 0.1)', color: '#FF6B35' },
      success: { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
      warning: { backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
      error: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
    }
  };

  const style = variantStyles[variant][color];

  return (
    <span 
      className={`
        inline-flex items-center justify-center
        ${sizeClasses[size]}
        ${roundedClasses}
        font-medium
        ${className}
      `}
      style={style}
    >
      {children}
    </span>
  );
}

// Рейтинг звездами
interface RatingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  onChange?: (value: number) => void;
  className?: string;
}

export function Rating({
  value,
  max = 5,
  size = 'md',
  readonly = true,
  onChange,
  className = ''
}: RatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!readonly) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverValue(0);
    }
  };

  return (
    <div 
      className={`
        flex gap-1
        ${sizeClasses[size]}
        ${className}
      `}
      onMouseLeave={handleMouseLeave}
    >
      {[...Array(max)].map((_, index) => {
        const rating = index + 1;
        const filled = rating <= (hoverValue || value);
        
        return (
          <span
            key={index}
            className={`
              ${filled ? 'text-yellow-400' : 'text-gray-300'}
              ${!readonly ? 'cursor-pointer hover:scale-110 transition-transform' : ''}
            `}
            onClick={() => handleClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

// Умный контейнер для текста с адаптивной типографикой
interface ResponsiveTextProps {
  children: React.ReactNode;
  minSize?: number;
  maxSize?: number;
  className?: string;
}

export function ResponsiveText({
  children,
  minSize = 14,
  maxSize = 24,
  className = ''
}: ResponsiveTextProps) {
  return (
    <div 
      className={className}
      style={{
        fontSize: `clamp(${minSize}px, 2vw, ${maxSize}px)`,
        lineHeight: 1.4
      }}
    >
      {children}
    </div>
  );
}
