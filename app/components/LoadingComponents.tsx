'use client';

import React from 'react';
import { Capacitor } from '@capacitor/core';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'current';
  className?: string;
  text?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'primary', 
  className = '',
  text
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    primary: 'border-blue-500 border-t-transparent',
    secondary: 'border-gray-500 border-t-transparent',
    white: 'border-white border-t-transparent',
    current: 'border-current border-t-transparent'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className={`
          ${sizeClasses[size]} 
          ${colorClasses[color]} 
          border-2 
          rounded-full 
          animate-spin
        `}
      />
      {text && (
        <span className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {text}
        </span>
      )}
    </div>
  );
}

interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  loadingText?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function LoadingButton({
  loading,
  children,
  disabled = false,
  className = '',
  loadingText = 'Загрузка...',
  onClick,
  type = 'button'
}: LoadingButtonProps) {
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

  const handleClick = () => {
    if (!loading && !disabled) {
      triggerHaptic();
      onClick?.();
    }
  };

  return (
    <button
      type={type}
      disabled={loading || disabled}
      onClick={handleClick}
      className={`
        relative
        inline-flex
        items-center
        justify-center
        px-4
        py-2
        rounded-lg
        font-medium
        transition-all
        duration-200
        ${loading || disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
        ${className}
      `}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" color="white" />
        </div>
      )}
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          {loadingText}
        </span>
      )}
    </button>
  );
}

interface LoadingCardProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  skeleton?: boolean;
}

export function LoadingCard({ 
  loading, 
  children, 
  className = '',
  skeleton = true 
}: LoadingCardProps) {
  if (loading) {
    if (skeleton) {
      return (
        <div className={`rounded-lg overflow-hidden shadow-sm border ${className}`} style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-primary)'
        }}>
          <div className="relative aspect-3/4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div className="absolute inset-0 animate-pulse" style={{
              background: 'linear-gradient(to right, var(--bg-tertiary), var(--bg-secondary), var(--bg-tertiary))'
            }} />
          </div>
          <div className="p-2">
            <div className="h-2 rounded animate-pulse mb-1" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
            <div className="h-2 rounded animate-pulse mb-1 w-3/4" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
            <div className="flex justify-between items-center">
              <div className="h-3 rounded animate-pulse w-12" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
              <div className="w-5 h-5 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <LoadingSpinner text="Загрузка..." />
      </div>
    );
  }

  return <>{children}</>;
}

interface LoadingOverlayProps {
  loading: boolean;
  children: React.ReactNode;
  text?: string;
  spinnerSize?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingOverlay({
  loading,
  children,
  text = 'Загрузка...',
  spinnerSize = 'md',
  className = ''
}: LoadingOverlayProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center" style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(2px)',
          zIndex: 50
        }}>
          <div className="flex flex-col items-center">
            <LoadingSpinner size={spinnerSize} color="white" />
            <span className="mt-2 text-white text-sm">{text}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook для управления состоянием загрузки
export function useLoading(initialState = false) {
  const [loading, setLoading] = React.useState(initialState);

  const startLoading = React.useCallback(() => {
    setLoading(true);
  }, []);

  const stopLoading = React.useCallback(() => {
    setLoading(false);
  }, []);

  const toggleLoading = React.useCallback(() => {
    setLoading(prev => !prev);
  }, []);

  return {
    loading,
    setLoading,
    startLoading,
    stopLoading,
    toggleLoading
  };
}

// Компонент для прогресс-бара
interface ProgressBarProps {
  progress: number; // 0-100
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  showText?: boolean;
  className?: string;
}

export function ProgressBar({
  progress,
  color = 'primary',
  size = 'md',
  animated = true,
  showText = false,
  className = ''
}: ProgressBarProps) {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const colorClasses = {
    primary: 'bg-blue-500',
    secondary: 'bg-gray-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  return (
    <div className={`w-full ${sizeClasses[size]} rounded-full overflow-hidden ${className}`} style={{
      backgroundColor: 'var(--bg-tertiary)'
    }}>
      <div
        className={`
          h-full 
          ${colorClasses[color]} 
          ${animated ? 'transition-all duration-300 ease-out' : ''}
          rounded-full
        `}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
      {showText && (
        <div className="text-center mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {Math.round(progress)}%
        </div>
      )}
    </div>
  );
}
