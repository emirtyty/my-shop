'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useSounds from '../hooks/useSounds';

// Haptic Feedback utilities
declare global {
  interface Window {
    Capacitor?: any;
  }
}

const haptics = {
  impact: async (type: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      // Проверяем на Capacitor
      if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Platform) {
        // Динамический импорт для Capacitor
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        const impactStyle = type === 'light' ? ImpactStyle.Light : 
                          type === 'medium' ? ImpactStyle.Medium : ImpactStyle.Heavy;
        await Haptics.impact({ style: impactStyle });
        return;
      }
      
      // Fallback на Vibration API для веба
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        const duration = type === 'light' ? 25 : type === 'medium' ? 50 : 75;
        navigator.vibrate(duration);
        console.log(`Vibration API fallback in Stories: ${duration}ms`);
      }
    } catch (error) {
      console.log('Haptics error in Stories:', error);
    }
  },
  selection: async () => {
    try {
      if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Platform) {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Light });
        return;
      }
      
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(15);
      }
    } catch (error) {
      console.log('Haptics selection error in Stories:', error);
    }
  },
  notification: async (type: 'success' | 'warning' | 'error' = 'success') => {
    try {
      if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Platform) {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.notification({ type: type.toUpperCase() as any });
        return;
      }
      
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        const pattern = type === 'success' ? [30, 50, 30] : [50, 100, 50];
        navigator.vibrate(pattern);
      }
    } catch (error) {
      console.log('Haptics notification error in Stories:', error);
    }
  }
};

// Gesture utilities
const gestures = {
  detectSwipe: (touchStartX: number, touchStartY: number, touchEndX: number, touchEndY: number) => {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 50;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        return deltaX > 0 ? 'right' : 'left';
      }
    } else {
      if (Math.abs(deltaY) > minSwipeDistance) {
        return deltaY > 0 ? 'down' : 'up';
      }
    }
    return null;
  }
};

interface Story {
  id: string;
  product_id?: string;
  seller_id?: string;
  image_url: string;
  title: string;
  price: number;
  discount: number;
  description: string;
  link_url: string;
  is_active: boolean;
  expires_at: string;
  view_count: number;
  click_count: number;
  created_at: string;
  updated_at: string;
  sellers?: {
    id: string;
    shop_name: string;
    telegram_url?: string;
    vk_url?: string;
    whatsapp_url?: string;
    instagram_url?: string;
  };
}

export default function StoriesFeed() {
  console.log('=== StoriesFeed component mounted ===');
  const [stories, setStories] = useState<Story[]>([]);
  const [groupedStories, setGroupedStories] = useState<Map<string, Story[]>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchCurrentY, setTouchCurrentY] = useState(0);
  const [isDraggingDown, setIsDraggingDown] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [currentSellerId, setCurrentSellerId] = useState<string | null>(null);
  
  // Используем звуковые эффекты
  const { click, swipe, modalOpen, modalClose, addToCart } = useSounds({ volume: 0.3, enabled: true });

  // Группировка историй по продавцам
  const groupStoriesBySeller = (storiesList: Story[]) => {
    const grouped = new Map<string, Story[]>();
    
    storiesList.forEach(story => {
      const sellerId = story.seller_id || 'unknown';
      if (!grouped.has(sellerId)) {
        grouped.set(sellerId, []);
      }
      grouped.get(sellerId)?.push(story);
    });
    
    return grouped;
  };

  useEffect(() => {
    console.log('=== StoriesFeed useEffect called ===');
    fetchStories();
  }, []);

  // Обработка жеста назад
  useEffect(() => {
    const handleBackButton = (e: PopStateEvent) => {
      if (isModalOpen) {
        e.preventDefault();
        handleCloseModal();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };

    // Добавляем обработчик для кнопки назад браузера
    window.addEventListener('popstate', handleBackButton);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  // Блокировка pull-to-refresh для Stories
  useEffect(() => {
    const handlePullToRefresh = (e: TouchEvent) => {
      if (isModalOpen) {
        const touch = e.touches[0];
        if (touch.clientY < 100) { // Если касание в верхней части экрана
          e.preventDefault();
        }
      }
    };

    if (isModalOpen) {
      document.addEventListener('touchmove', handlePullToRefresh, { passive: false });
      
      return () => {
        document.removeEventListener('touchmove', handlePullToRefresh);
      };
    }
  }, [isModalOpen]);

  // Автопереход и прогресс-бар
  useEffect(() => {
    if (!isModalOpen || isPaused || !currentSellerId) return;

    const sellerStories = groupedStories.get(currentSellerId) || [];
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + 2; // 2% каждые 100мс = 5 секунд на story
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isModalOpen, isPaused, currentIndex, currentSellerId, groupedStories]);

  // Сброс прогресса при смене story
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  const fetchStories = async () => {
    try {
      console.log('=== StoriesFeed fetchStories called ===');
      setIsLoading(true);
      
      // Импортируем утилиты Supabase
      const { isValid, checkSupabaseConnection } = await import('../lib/supabase');
      
      // Проверяем валидность конфигурации
      if (!isValid) {
        console.warn('⚠️ Supabase не сконфигурирован');
        setStories([]);
        setGroupedStories(new Map());
        setIsLoading(false);
        return;
      }
      
      // Проверяем соединение
      const connectionCheck = await checkSupabaseConnection();
      if (!connectionCheck.success) {
        console.warn('⚠️ Проблемы с соединением Supabase');
        setStories([]);
        setGroupedStories(new Map());
        setIsLoading(false);
        return;
      }
      
      console.log('🔍 Загружаем stories из Supabase...');
      
      // Сначала проверим, существует ли таблица stories
      try {
        const { data: tableCheck, error: tableError } = await supabase
          .from('stories')
          .select('id')
          .limit(1);
        
        if (tableError) {
          console.error('❌ Таблица stories не существует или недоступна:', tableError);
          setStories([]);
          setGroupedStories(new Map());
          setIsLoading(false);
          return;
        }
        
        console.log('✅ Таблица stories существует, продолжаем загрузку...');
      } catch (tableCheckError) {
        console.error('❌ Ошибка проверки таблицы stories:', tableCheckError);
        setStories([]);
        setGroupedStories(new Map());
        setIsLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('stories')
        .select(`*,
          sellers!inner(
            id,
            shop_name,
            telegram_url,
            vk_url,
            whatsapp_url,
            instagram_url
          )
        `)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('❌ Supabase error в StoriesFeed:', error);
        setStories([]);
        setGroupedStories(new Map());
      } else if (!data || data.length === 0) {
        console.log('ℹ️ Stories не найдены в Supabase - это нормально, если еще ни кто не создавал');
        setStories([]);
        setGroupedStories(new Map());
      } else {
        const storiesData = data || [];
        console.log('✅ StoriesFeed загружены:', storiesData.length, 'stories');
        setStories(storiesData);
        
        // Группируем истории по продавцам
        const grouped = groupStoriesBySeller(storiesData);
        setGroupedStories(grouped);
        console.log('📦 Stories сгруппированы по продавцам:', Array.from(grouped.entries()));
      }
    } catch (error) {
      console.error('❌ Критическая ошибка загрузки stories:', error);
      setStories([]);
      setGroupedStories(new Map());
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoryClick = (sellerId: string, storyIndex: number = 0) => {
    const sellerStories = groupedStories.get(sellerId);
    if (!sellerStories || sellerStories.length === 0) return;
    
    setCurrentIndex(storyIndex);
    setCurrentSellerId(sellerId);
    setIsModalOpen(true);
    setIsPaused(false);
    setProgress(0);
    haptics.impact('medium');
    modalOpen();
    setIsDraggingDown(false);
    setDragOffsetY(0);
    setTouchStartY(0);
    setTouchCurrentY(0);
    setTouchStart(0);
    setTouchEnd(0);
  };

  const handleCloseModal = () => {
    console.log('Stories handleCloseModal called - resetting all states');
    setIsModalOpen(false);
    setIsPaused(false);
    setProgress(0);
    modalClose();
    // Сбрасываем состояния перетаскивания
    setIsDraggingDown(false);
    setDragOffsetY(0);
    setTouchStartY(0);
    setTouchCurrentY(0);
    setTouchStart(0);
    setTouchEnd(0);
  };

  const handleNextStory = () => {
    if (!currentSellerId) return;
    
    const sellerStories = groupedStories.get(currentSellerId) || [];
    if (currentIndex < sellerStories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      // Сбрасываем состояния перетаскивания при смене story
      setIsDraggingDown(false);
      setDragOffsetY(0);
      setTouchStartY(0);
      setTouchCurrentY(0);
    } else {
      handleCloseModal();
    }
  };

  const handlePrevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      // Сбрасываем состояния перетаскивания при смене story
      setIsDraggingDown(false);
      setDragOffsetY(0);
      setTouchStartY(0);
      setTouchCurrentY(0);
    }
  };

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
  };

  // Свайп обработчики
  const handleTouchStart = (e: React.TouchEvent) => {
    console.log('Stories touch start - adding haptic feedback');
    setTouchStart(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setTouchCurrentY(e.touches[0].clientY);
    click();
    // Легкая вибрация при начале жеста
    haptics.impact('light');
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isModalOpen) {
      const currentX = e.targetTouches[0].clientX;
      const currentY = e.targetTouches[0].clientY;
      const deltaX = currentX - touchStart;
      const deltaY = currentY - touchStartY;
      
      // Свайп вниз для закрытия - только если движение по Y значительно больше движения по X
      if (deltaY > 40 && Math.abs(deltaY) > Math.abs(deltaX) * 2 && !isDraggingDown) {
        setIsDraggingDown(true);
        console.log('Stories drag down started - adding haptic feedback');
        haptics.impact('medium');
        swipe();
        e.preventDefault(); // Предотвращаем скролл только при начале жеста
      }
      
      if (isDraggingDown) {
        // Резиновый эффект - сопротивление при сильном перетаскивании
        const rubberBandFactor = deltaY > 200 ? 1 + (deltaY - 200) * 0.001 : 1;
        setDragOffsetY(Math.max(deltaY * rubberBandFactor, 0));
        setTouchCurrentY(currentY);
        e.preventDefault(); // Предотвращаем скролл во время перетаскивания
      } else {
        setTouchEnd(currentX);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isDraggingDown) {
      // Если перетащили достаточно далеко - закрываем
      if (dragOffsetY > 120) { // Увеличим порог закрытия
        console.log('Stories closing - adding haptic feedback');
        haptics.notification('success');
        modalClose();
        handleCloseModal();
        return;
      }
      
      // Сбрасываем состояние
      console.log('Stories drag cancelled - resetting drag states');
      setIsDraggingDown(false);
      setDragOffsetY(0);
      setTouchStartY(0);
      setTouchCurrentY(0);
      return;
    }
    
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 80; // Увеличим порог свайпа
    const isRightSwipe = distance < -80; // Увеличим порог свайпа

    if (isLeftSwipe) {
      handleNextStory();
      swipe();
    }
    if (isRightSwipe) {
      handlePrevStory();
      swipe();
    }
  };

  // Экспресс-заказ
  const handleExpressOrder = (story: Story) => {
    // Получаем продавца из связанной таблицы
    const seller = story.sellers;
    
    if (seller) {
      // Ищем первую доступную социальную сеть
      const socialUrl = seller.telegram_url || seller.vk_url || seller.whatsapp_url || seller.instagram_url;
      
      if (socialUrl) {
        window.open(socialUrl, '_blank');
        addToCart();
        setIsModalOpen(false);
        return;
      }
    }
    
    // Если нет соцсетей, ищем товар по названию
    const productName = story.title;
    window.open(`/?search=${encodeURIComponent(productName)}`, '_blank');
    addToCart();
    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl p-4 mb-2" style={{
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="shrink-0">
              <div className="w-16 h-16 rounded-full animate-pulse" style={{
                backgroundColor: 'var(--bg-tertiary)'
              }}></div>
              <div className="w-16 h-3 rounded mt-1 animate-pulse" style={{
                backgroundColor: 'var(--bg-tertiary)'
              }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stories || stories.length === 0) {
    return null;
  }

  return (
    <>
      {/* Stories Feed */}
      <div className="rounded-2xl p-4 mb-2" style={{
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {Array.from(groupedStories.entries()).map(([sellerId, sellerStories], sellerIndex) => {
            const firstStory = sellerStories[0];
            return (
              <div 
                key={sellerId} 
                className="shrink-0 cursor-pointer group"
                onClick={() => handleStoryClick(sellerId, 0)}
              >
                {/* Кружок с градиентной рамкой как в Instagram */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-full p-0.5" style={{
                    background: 'linear-gradient(to top right, #facc15, #ec4899, #9333ea)'
                  }}>
                    <div className="w-full h-full rounded-full p-0.5" style={{
                      backgroundColor: 'var(--bg-primary)'
                    }}>
                      <img
                        src={firstStory.image_url}
                        alt={firstStory.sellers?.shop_name || 'Seller'}
                        className="w-full h-full rounded-full object-cover transition-transform duration-200 group-hover:scale-110"
                      />
                    </div>
                  </div>
                  
                  {/* Индикатор количества историй */}
                  {sellerStories.length > 1 && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold border-2" style={{
                      borderColor: 'var(--bg-primary)'
                    }}>
                      {sellerStories.length}
                    </div>
                  )}
                </div>
                
                {/* Название продавца */}
                <p className="text-xs text-center mt-1 max-w-[64px] truncate" style={{
                  color: 'var(--text-secondary)'
                }}>
                  {firstStory.sellers?.shop_name || 'Seller'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Story Modal */}
      {isModalOpen && currentSellerId && groupedStories.get(currentSellerId) && (
        <div data-modal-open="true" className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{
          backgroundColor: 'rgba(0, 0, 0, 0.95)'
        }}>
          <div 
            className="relative w-full h-full transition-transform"
            style={{ 
              backgroundColor: 'black',
              maxHeight: '100vh',
              maxWidth: '100vw',
              transform: `translateY(${dragOffsetY}px) scale(${isDraggingDown ? 1 - dragOffsetY / 1000 : 1})`,
              opacity: isDraggingDown ? 1 - dragOffsetY / 500 : 1
            }}
          >
            {/* Close button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-12 right-4 z-10 text-2xl transition-colors duration-200" style={{
                color: 'white'
              }}
            >
              ×
            </button>

            {/* Progress bars */}
            <div className="absolute top-12 left-4 right-12 z-10 flex gap-1">
              {groupedStories.get(currentSellerId)?.map((_, index) => (
                <div
                  key={index}
                  className="flex-1 h-1 rounded-full overflow-hidden"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <div
                    className={`h-full transition-all duration-100 ${
                      index === currentIndex ? 'w-full' : index < currentIndex ? 'w-full' : 'w-0'
                    }`}
                    style={{
                      backgroundColor: 'white',
                      width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Story content */}
            <div 
              className="relative w-full h-full flex items-center justify-center"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handlePauseToggle}
              style={{
                maxHeight: '100vh',
                maxWidth: '100vw',
                overflow: 'hidden'
              }}
            >
              {groupedStories.get(currentSellerId)?.[currentIndex]?.image_url ? (
                <img
                  src={groupedStories.get(currentSellerId)?.[currentIndex].image_url}
                  alt={groupedStories.get(currentSellerId)?.[currentIndex].title || 'Story'}
                  className="max-w-full max-h-full object-contain"
                  style={{
                    maxHeight: 'calc(100vh - 100px)',
                    maxWidth: '100vw'
                  }}
                  onError={(e) => {
                    console.log('Story image failed to load:', groupedStories.get(currentSellerId)?.[currentIndex].image_url);
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('Story image loaded:', groupedStories.get(currentSellerId)?.[currentIndex].image_url);
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ 
                  backgroundColor: '#111827',
                  maxHeight: '100vh', 
                  maxWidth: '100vw' 
                }}>
                  <div className="text-center">
                    <div className="text-6xl mb-4" style={{ color: 'white' }}>📱</div>
                    <div className="text-xl" style={{ color: 'white' }}>Story #{currentIndex + 1}</div>
                    <div className="text-sm mt-2" style={{ 
                      color: 'rgba(255, 255, 255, 0.75)'
                    }}>{groupedStories.get(currentSellerId)?.[currentIndex]?.title || 'Loading...'}</div>
                  </div>
                </div>
              )}

              {/* Pause indicator */}
              {isPaused && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl" style={{
                  color: 'rgba(255, 255, 255, 0.75)'
                }}>
                  ⏸
                </div>
              )}

              {/* Story overlay */}
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent, transparent)'
              }}>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {groupedStories.get(currentSellerId)?.[currentIndex].discount && (
                      <span className="text-xs px-2 py-1 rounded-full font-bold" style={{
                        backgroundColor: '#dc2626',
                        color: 'white'
                      }}>
                        -{groupedStories.get(currentSellerId)?.[currentIndex].discount}%
                      </span>
                    )}
                    <span className="text-xs px-2 py-1 rounded-full backdrop-blur-sm" style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white'
                    }}>
                      {groupedStories.get(currentSellerId)?.[currentIndex].price}₽
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-lg mb-2" style={{
                    color: 'white'
                  }}>
                    {groupedStories.get(currentSellerId)?.[currentIndex].title}
                  </h3>
                  
                  {groupedStories.get(currentSellerId)?.[currentIndex].sellers?.shop_name && (
                    <p className="text-sm mb-2" style={{
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      📍 {groupedStories.get(currentSellerId)?.[currentIndex].sellers.shop_name}
                    </p>
                  )}
                  
                  {groupedStories.get(currentSellerId)?.[currentIndex].description && (
                    <p className="text-sm mb-3" style={{
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      {groupedStories.get(currentSellerId)?.[currentIndex].description}
                    </p>
                  )}

                  <div className="flex gap-2">
                    {/* Круглая кнопка "Купить" как в карточках */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExpressOrder(groupedStories.get(currentSellerId)?.[currentIndex]!);
                      }}
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95" style={{
                        backgroundColor: '#FF6B35',
                        color: 'white'
                      }}
                    >
                      🛒
                    </button>
                  </div>
                </div>
              </div>

              {/* Navigation areas */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevStory();
                }}
              />
              <div
                className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextStory();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
