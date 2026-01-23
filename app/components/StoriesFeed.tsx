'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    console.log('=== StoriesFeed useEffect called ===');
    fetchStories();
  }, []);

  // Автопереход и прогресс-бар
  useEffect(() => {
    if (!isModalOpen || isPaused || !stories.length) return;

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
  }, [isModalOpen, isPaused, currentIndex, stories.length]);

  // Сброс прогресса при смене story
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  const fetchStories = async () => {
    try {
      console.log('=== StoriesFeed fetchStories called ===');
      
      // Check if Supabase is properly configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn('Supabase environment variables are missing in StoriesFeed');
        setStories([]);
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
        .order('created_at', { ascending: false })
        .limit(10);

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error in StoriesFeed:', error);
        setStories([]);
      } else {
        const storiesData = data || [];
        console.log('StoriesFeed fetched stories:', storiesData);
        console.log('Stories count:', storiesData.length);
        setStories(storiesData);
      }
    } catch (error) {
      console.error('Error loading stories in StoriesFeed:', error);
      setStories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoryClick = (story: Story, index: number) => {
    setCurrentIndex(index);
    setIsModalOpen(true);
    setIsPaused(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsPaused(false);
    setProgress(0);
  };

  const handleNextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsModalOpen(false);
      setProgress(0);
    }
  };

  const handlePrevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
  };

  // Свайп обработчики
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNextStory();
    }
    if (isRightSwipe) {
      handlePrevStory();
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
        setIsModalOpen(false);
        return;
      }
    }
    
    // Если нет соцсетей, ищем товар по названию
    const productName = story.title;
    window.open(`/?search=${encodeURIComponent(productName)}`, '_blank');
    setIsModalOpen(false);
  };

  const handleStoryLinkClick = (linkUrl?: string) => {
    if (linkUrl) {
      // Ищем товар по ID и открываем его социальные сети
      const product = stories.find(s => s.product_id === linkUrl);
      if (product) {
        // Здесь можно добавить логику для открытия товара или перехода по ссылке
        window.open(`/#product-${linkUrl}`, '_blank');
      } else {
        window.open(linkUrl, '_blank');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl p-4 mb-2">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse"></div>
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
      <div className="rounded-2xl p-4 mb-2">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stories.map((story, index) => (
            <div 
              key={story.id} 
              className="flex-shrink-0 cursor-pointer group"
              onClick={() => handleStoryClick(story, index)}
            >
              {/* Кружок с градиентной рамкой как в Instagram */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
                  <div className="w-full h-full rounded-full bg-white p-0.5">
                    <img
                      src={story.image_url}
                      alt={story.title}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                </div>
              </div>
              
              {/* Название сторис */}
              <p className="text-xs text-gray-600 text-center mt-1 max-w-[64px] truncate">
                {story.title}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Story Modal */}
      {isModalOpen && stories[currentIndex] && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <div className="relative w-full max-w-md h-full max-h-[85vh] bg-black">
            {/* Close button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-10 text-white text-2xl hover:text-gray-300"
            >
              ×
            </button>

            {/* Progress bars */}
            <div className="absolute top-4 left-4 right-12 z-10 flex gap-1">
              {stories.map((_, index) => (
                <div
                  key={index}
                  className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                >
                  <div
                    className={`h-full bg-white transition-all duration-100 ${
                      index === currentIndex ? 'w-full' : index < currentIndex ? 'w-full' : 'w-0'
                    }`}
                    style={{
                      width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Story content */}
            <div 
              className="relative w-full h-full"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handlePauseToggle}
            >
              <img
                src={stories[currentIndex].image_url}
                alt={stories[currentIndex].title}
                className="w-full h-full object-contain"
              />

              {/* Pause indicator */}
              {isPaused && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-4xl opacity-75">
                  ⏸
                </div>
              )}

              {/* Story overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {stories[currentIndex].discount && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                        -{stories[currentIndex].discount}%
                      </span>
                    )}
                    <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                      {stories[currentIndex].price}₽
                    </span>
                  </div>
                  
                  <h3 className="text-white font-bold text-lg mb-2">
                    {stories[currentIndex].title}
                  </h3>
                  
                  {stories[currentIndex].sellers?.shop_name && (
                    <p className="text-white/90 text-sm mb-2">
                      📍 {stories[currentIndex].sellers.shop_name}
                    </p>
                  )}
                  
                  {stories[currentIndex].description && (
                    <p className="text-white/80 text-sm mb-3">
                      {stories[currentIndex].description}
                    </p>
                  )}

                  <div className="flex gap-2">
                    {stories[currentIndex].link_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStoryLinkClick(stories[currentIndex].link_url);
                        }}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        Перейти →
                      </button>
                    )}
                    
                    {/* Экспресс-заказ */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExpressOrder(stories[currentIndex]);
                      }}
                      className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-2"
                    >
                      🛒 Купить сейчас
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
