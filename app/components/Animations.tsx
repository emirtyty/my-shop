'use client';

import React, { useEffect, useRef, useState } from 'react';

// Анимированный контейнер с fade-in эффектом
interface AnimatedContainerProps {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'slideUp' | 'scaleIn' | 'bounceIn' | 'slideInLeft' | 'slideInRight';
  delay?: number;
  duration?: number;
  className?: string;
  trigger?: 'onMount' | 'onScroll' | 'manual';
  onAnimationComplete?: () => void;
}

export function AnimatedContainer({
  children,
  animation = 'fadeIn',
  delay = 0,
  duration = 300,
  className = '',
  trigger = 'onMount',
  onAnimationComplete
}: AnimatedContainerProps) {
  const [isVisible, setIsVisible] = useState(trigger === 'onMount');
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trigger === 'onScroll' && elementRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasAnimated) {
            setIsVisible(true);
            setHasAnimated(true);
          }
        },
        { threshold: 0.1 }
      );

      observer.observe(elementRef.current);
      return () => observer.disconnect();
    }
  }, [trigger, hasAnimated]);

  const animationClasses = {
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    scaleIn: 'animate-scale-in',
    bounceIn: 'animate-bounce-in',
    slideInLeft: 'animate-slide-in-left',
    slideInRight: 'animate-slide-in-right'
  };

  const handleAnimationEnd = () => {
    onAnimationComplete?.();
  };

  return (
    <div
      ref={elementRef}
      className={`
        ${isVisible ? animationClasses[animation] : 'opacity-0'}
        ${className}
      `}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
        animationFillMode: 'both'
      }}
      onAnimationEnd={handleAnimationEnd}
    >
      {children}
    </div>
  );
}

// Hover эффект с масштабированием
interface HoverScaleProps {
  children: React.ReactNode;
  scale?: number;
  duration?: number;
  className?: string;
  disabled?: boolean;
}

export function HoverScale({
  children,
  scale = 1.05,
  duration = 200,
  className = '',
  disabled = false
}: HoverScaleProps) {
  return (
    <div
      className={`
        transition-transform 
        ${disabled ? '' : 'hover:scale-105 active:scale-95'}
        ${className}
      `}
      style={{
        transitionDuration: `${duration}ms`,
        transform: disabled ? 'none' : `scale(${scale})`
      }}
    >
      {children}
    </div>
  );
}

// Пульсирующий эффект
interface PulseProps {
  children: React.ReactNode;
  intensity?: 'light' | 'medium' | 'strong';
  duration?: number;
  className?: string;
}

export function Pulse({
  children,
  intensity = 'medium',
  duration = 2000,
  className = ''
}: PulseProps) {
  const intensityClasses = {
    light: 'animate-pulse-light',
    medium: 'animate-pulse',
    strong: 'animate-pulse-strong'
  };

  return (
    <div className={`${intensityClasses[intensity]} ${className}`} style={{
      animationDuration: `${duration}ms`
    }}>
      {children}
    </div>
  );
}

// Shake эффект для ошибок
interface ShakeProps {
  children: React.ReactNode;
  trigger: boolean;
  duration?: number;
  intensity?: 'light' | 'medium' | 'strong';
  className?: string;
}

export function Shake({
  children,
  trigger,
  duration = 500,
  intensity = 'medium',
  className = ''
}: ShakeProps) {
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), duration);
      return () => clearTimeout(timer);
    }
  }, [trigger, duration]);

  const shakeClasses = {
    light: 'animate-shake-light',
    medium: 'animate-shake',
    strong: 'animate-shake-strong'
  };

  return (
    <div className={isShaking ? shakeClasses[intensity] : ''} style={{
      animationDuration: `${duration}ms`
    }}>
      <div className={className}>
        {children}
      </div>
    </div>
  );
}

// Floating animation
interface FloatingProps {
  children: React.ReactNode;
  amplitude?: number;
  duration?: number;
  delay?: number;
  className?: string;
}

export function Floating({
  children,
  amplitude = 10,
  duration = 3000,
  delay = 0,
  className = ''
}: FloatingProps) {
  return (
    <div 
      className={`animate-floating ${className}`}
      style={{
        animationDuration: `${duration}ms`,
        animationDelay: `${delay}ms`,
        '--floating-amplitude': `${amplitude}px`
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

// Morphing animation для кнопок
interface MorphingButtonProps {
  children: React.ReactNode;
  isExpanded: boolean;
  expandedContent?: React.ReactNode;
  collapsedContent?: React.ReactNode;
  duration?: number;
  className?: string;
  onClick?: () => void;
}

export function MorphingButton({
  children,
  isExpanded,
  expandedContent,
  collapsedContent,
  duration = 300,
  className = '',
  onClick
}: MorphingButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative
        overflow-hidden
        transition-all
        duration-300
        ${className}
      `}
      style={{
        transitionDuration: `${duration}ms`,
        width: isExpanded ? '200px' : 'auto'
      }}
    >
      <div
        className="flex items-center justify-center transition-all duration-300"
        style={{
          transitionDuration: `${duration}ms`,
          transform: isExpanded ? 'translateX(-50%)' : 'translateX(0)',
          opacity: isExpanded ? 0 : 1
        }}
      >
        {collapsedContent || children}
      </div>
      
      {expandedContent && (
        <div
          className="absolute inset-0 flex items-center justify-center transition-all duration-300"
          style={{
            transitionDuration: `${duration}ms`,
            transform: isExpanded ? 'translateX(0)' : 'translateX(50%)',
            opacity: isExpanded ? 1 : 0
          }}
        >
          {expandedContent}
        </div>
      )}
    </button>
  );
}

// Stagger animation для списков
interface StaggerContainerProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  animation?: 'fadeIn' | 'slideUp' | 'scaleIn';
  className?: string;
}

export function StaggerContainer({
  children,
  staggerDelay = 100,
  animation = 'fadeIn',
  className = ''
}: StaggerContainerProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <AnimatedContainer
          key={index}
          animation={animation}
          delay={index * staggerDelay}
        >
          {child}
        </AnimatedContainer>
      ))}
    </div>
  );
}

// Parallax эффект
interface ParallaxProps {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}

export function Parallax({
  children,
  speed = 0.5,
  className = ''
}: ParallaxProps) {
  const [offset, setOffset] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        const scrolled = window.pageYOffset;
        const rate = scrolled * -speed;
        setOffset(rate);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <div ref={elementRef} className={className} style={{
      transform: `translateY(${offset}px)`
    }}>
      {children}
    </div>
  );
}

// Spring animation hook
export function useSpring(config: {
  tension?: number;
  friction?: number;
  mass?: number;
} = {}) {
  const { tension = 170, friction = 26, mass = 1 } = config;
  
  const springConfig = {
    tension,
    friction,
    mass
  };

  return {
    springConfig,
    springStyle: {
      transition: `transform ${300}ms cubic-bezier(${0.25}, ${0.46}, ${0.45}, ${0.94})`
    }
  };
}
