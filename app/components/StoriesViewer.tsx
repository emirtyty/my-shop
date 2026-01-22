'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface Story {
  id: string;
  product_id: string;
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
  product?: {
    name: string;
    price: number;
    image_url: string;
    category: string;
    discount: number;
    stock_quantity: number;
    sellers?: {
      shop_name: string;
      id: string;
      telegram_url?: string;
      vk_url?: string;
      whatsapp_url?: string;
      instagram_url?: string;
    };
  };
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function StoriesViewer() {
  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    fetchStories();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isPaused && stories.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % stories.length);
      }, 5000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isPaused, stories.length]);

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          product (
            name,
            price,
            category,
            discount,
            stock_quantity,
            sellers (
              shop_name,
              id,
              telegram_url,
              vk_url,
              whatsapp_url,
              instagram_url
            )
          )
        `)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setStories(data || []);
    } catch (error) {
      console.error('Error loading stories:', error);
      addToast('Ошибка загрузки Stories', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = async (storyId: string) => {
    try {
      await supabase.rpc('increment_story_view', { story_id: storyId });
      setStories(prev => 
        prev.map(story => 
          story.id === storyId 
            ? { ...story, view_count: story.view_count + 1 }
            : story
        )
      );
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const handleClick = async (storyId: string, linkUrl?: string) => {
    try {
      await supabase.rpc('increment_story_click', { story_id: storyId });
      setStories(prev => 
        prev.map(story => 
          story.id === storyId 
            ? { ...story, click_count: story.click_count + 1 }
            : story
        )
      );
      
      if (linkUrl) {
        window.open(linkUrl, '_blank');
      }
    } catch (error) {
      console.error('Error incrementing click count:', error);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEndX(e.changedTouches[0].clientX);
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < stories.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    }
    
    setTimeout(() => setIsPaused(false), 1000);
  };

  const handleMouseWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setIsPaused(true);
    
    if (e.deltaY > 0 && currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
    
    setTimeout(() => setIsPaused(false), 1000);
  };

  const handleStoryClick = (story: Story) => {
    if (story.link_url) {
      handleClick(story.id, story.link_url);
    } else if (story.product_id) {
      window.open(`/product/${story.product_id}`, '_blank');
    }
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const createStory = async (productId: string) => {
    try {
      const product = stories.find(s => s.product_id === productId)?.product;
      if (!product) return;

      const { error } = await supabase
        .from('stories')
        .insert({
          product_id: productId,
          image_url: product.image_url,
          title: product.name,
          price: product.price,
          discount: product.discount,
          description: `Отличный товар из категории ${product.category}`,
          link_url: `/product/${productId}`
        });

      if (error) throw error;
      
      await fetchStories();
      addToast('Story успешно создан', 'success');
    } catch (error) {
      console.error('Error creating story:', error);
      addToast('Ошибка при создании Story', 'error');
    }
  };

  const deleteStory = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;
      
      await fetchStories();
      addToast('Story удален', 'info');
    } catch (error) {
      console.error('Error deleting story:', error);
      addToast('Ошибка при удалении Story', 'error');
    }
  };

  const currentStory = stories[currentIndex];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 p-4 flex justify-between items-center">
        <h2 className="text-white font-bold text-lg">Stories</h2>
        <button 
          onClick={() => window.history.back()}
          className="text-white text-2xl hover:scale-110 transition-transform"
        >
          ×
        </button>
      </div>

      {/* Stories Container */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 border-4 border-white rounded-full animate-spin"></div>
          </div>
        ) : stories.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-white/60 text-lg">Нет активных Stories</div>
          </div>
        ) : (
          <div 
            ref={containerRef}
            className="flex h-full overflow-x-hidden overflow-y-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onWheel={handleMouseWheel}
          >
            <div 
              className="flex transition-transform duration-300 ease-out h-full"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {stories.map((story, index) => (
                <div
                  key={story.id}
                  className="w-full h-full flex-shrink-0 relative"
                  onClick={() => handleStoryClick(story)}
                  onMouseEnter={() => handleView(story.id)}
                >
                  <div className="relative w-full h-full bg-black flex items-center justify-center">
                    <img
                      src={story.image_url}
                      alt={story.title}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {story.discount && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                              -{story.discount}%
                            </span>
                          )}
                          <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                            {story.price}₽
                          </span>
                        </div>
                        
                        <h3 className="text-white font-bold text-sm line-clamp-2 mb-1">
                          {story.title}
                        </h3>
                        
                        <div className="flex items-center gap-2 text-xs text-white/80">
                          <span>👁 {story.view_count}</span>
                          <span>👆 {story.click_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Indicators */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {stories.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex 
                  ? 'bg-white scale-125' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div 
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / stories.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm border animate-pulse ${
              toast.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-100' :
              toast.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-100' :
              'bg-blue-500/20 border-blue-500/30 text-blue-100'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
