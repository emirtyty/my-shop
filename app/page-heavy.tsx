'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { logger } from './lib/logger';
import StoriesFeed from './components/StoriesFeed';
import { useFavorites } from './hooks/useFavorites';
import { logHealthStatus } from './lib/healthCheck';
import TouchProductModal from './components/TouchProductModal';
import FastLoader from './components/FastLoader';
import VoiceSearch from './components/VoiceSearch';
import NotificationManager from './lib/notifications';
import AIRecommendationEngine from './lib/aiRecommendations';
import ProductMessengerButton from './components/ProductMessengerButton';
import BuyButton from './components/BuyButton';
import BuyIcon from './components/BuyIcon';

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
      }
    } catch (error) {
      console.log('Haptics error:', error);
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
      console.log('Haptics selection error:', error);
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
      console.log('Haptics notification error:', error);
    }
  }
};

// Детекция системной темы
const useSystemTheme = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
    };

    updateTheme();
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateTheme);
    
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, []);

  return isDark;
};

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  discount: number;
  category: string;
  seller_id: string;
  description?: string;
  rating?: number;
  reviews?: number;
  sellers?: { 
    id: string; 
    shop_name: string;
    contact?: string;
    telegram?: string;
    vk?: string;
    whatsapp?: string;
    phone?: string;
    instagram?: string;
    website?: string;
    telegram_url?: string;
    vk_url?: string;
    whatsapp_url?: string;
    instagram_url?: string;
  };
}

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

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingSeller, setViewingSeller] = useState<any>(null);
  
  // Используем системную тему
  const isDarkTheme = useSystemTheme();
  
  // Используем избранное
  const { 
    favoriteIds, 
    favoritesCount, 
    toggleFavorite, 
    isFavorite, 
    getFavoriteProducts 
  } = useFavorites();
  
  // Состояния для категорий
  const [showCategoryCloud, setShowCategoryCloud] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [cloudPosition, setCloudPosition] = useState({ x: 0, y: 0 });
  const [isCloudOpening, setIsCloudOpening] = useState(false);
  
  // Состояния для свайпа облачка
  const [cloudTouchStart, setCloudTouchStart] = useState(0);
  const [cloudIsDragging, setCloudIsDragging] = useState(false);
  const [cloudIsDraggingHandle, setCloudIsDraggingHandle] = useState(false);
  const [cloudDragOffset, setCloudDragOffset] = useState(0);
  
  // Состояния для свайпа модального окна товара
  const [productTouchStart, setProductTouchStart] = useState(0);
  const [productIsDragging, setProductIsDragging] = useState(false);
  const [productDragOffset, setProductDragOffset] = useState(0);
  const [productDragStartY, setProductDragStartY] = useState(0);
  
  // Состояние для модального окна товара при 3D Touch
  const [touchProductModal, setTouchProductModal] = useState<Product | null>(null);
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [touchHoldTimer, setTouchHoldTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Состояние для полноэкранного просмотра картинок
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  // Pull-to-refresh состояния
  const [isPullToRefresh, setIsPullToRefresh] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  
  // Lazy loading для изображений
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  
  const handleImageLoad = (imageId: string) => {
    setLoadedImages(prev => new Set(prev).add(imageId));
  };

  useEffect(() => {
    fetchData();
    
    // Проверяем состояние приложения при загрузке
    if (typeof window !== 'undefined') {
      logHealthStatus().catch(error => {
        console.warn('Ошибка проверки состояния приложения:', error);
      });
      
      // Запрашиваем разрешение на уведомления
      NotificationManager.requestPermission();
    }
  }, []);

  // Блокировка скролла при открытом модальном окне
  useEffect(() => {
    if (showCategoryCloud || touchProductModal) {
      // Сохраняем текущую позицию скролла
      const scrollY = window.scrollY;
      
      // Блокируем скролл body
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      
      return () => {
        // Возвращаем скролл при закрытии
        const scrollY = document.body.style.top;
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      };
    }
  }, [showCategoryCloud, touchProductModal]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      logger.log('📡 Making requests to Supabase...');
      
      // Try to fetch only products first
      const productsResponse = await supabase.from('product_market').select('*, sellers(shop_name, id, telegram_url, vk_url, whatsapp_url, instagram_url)');
      
      console.log('📦 Raw products response:', productsResponse);
      console.log('📦 Products data:', productsResponse.data);
      console.log('📦 Products error:', productsResponse.error);
      
      if (productsResponse.error) {
        throw new Error(productsResponse.error.message);
      }

      logger.log('📦 Received data from Supabase');
      
      // Обработка товаров
      const productsData = productsResponse.data || [];
      logger.log(`📦 Loaded ${productsData.length} products`);
      console.log('📦 Processed products data:', productsData);
      
      // Set products and other states as empty for now
      setProducts(productsData);
      setStories([]);
      setCategories([]);
      setActiveCategory(null); // Reset active category
      
      console.log('🔄 States updated - products:', productsData.length);
      
      logger.log('✅ All data loaded successfully');
      
    } catch (error) {
      console.error('❌ Fetch error:', error);
      logger.error('❌ Error fetching data:', error);
      
      // Устанавливаем пустые состояния при ошибке
      setProducts([]);
      setStories([]);
      setCategories([]);
      
      // Показываем ошибку пользователю
      if (error instanceof Error && error.message === 'Timeout') {
        setError('Превышено время ожидания. Проверьте подключение к интернету.');
      } else if (error instanceof Error) {
        setError(`Не удалось загрузить данные: ${error.message}. Пожалуйста, попробуйте позже.`);
      } else {
        setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
      }
    } finally {
      setLoading(false);
      console.log('🏁 Loading set to false');
    }
  }

  const getSocialUrl = (seller: any) => {
    // Приоритет: telegram_url > vk_url > whatsapp_url > instagram_url
    const telegramUrl = seller?.telegram_url || seller?.telegram;
    const vkUrl = seller?.vk_url || seller?.vk;
    const whatsappUrl = seller?.whatsapp_url || seller?.whatsapp;
    const instagramUrl = seller?.instagram_url || seller?.instagram;
    
    if (telegramUrl) {
      // Если начинается с @, преобразуем в полный URL
      if (telegramUrl.startsWith('@')) {
        return `https://t.me/${telegramUrl.substring(1)}`;
      }
      return telegramUrl;
    }
    if (vkUrl) return vkUrl;
    if (whatsappUrl) return whatsappUrl;
    if (instagramUrl) {
      // Если начинается с @, преобразуем в полный URL
      if (instagramUrl.startsWith('@')) {
        return `https://instagram.com/${instagramUrl.substring(1)}`;
      }
      return instagramUrl;
    }
    return null;
  };

  const getSocialIcon = (url: string) => {
    if (url?.includes('t.me') || url?.includes('telegram')) return '📱';
    if (url?.includes('vk.com') || url?.includes('vkontakte')) return '💬';
    if (url?.includes('wa.me') || url?.includes('whatsapp')) return '💬';
    if (url?.includes('instagram')) return '📷';
    return '🔗';
  };

  const handleBuyClick = (product: Product) => {
    // Трекинг действия пользователя
    AIRecommendationEngine.trackUserAction({
      productId: product.id,
      action: 'view',
      timestamp: Date.now(),
      category: product.category,
      priceRange: [product.price * 0.8, product.price * 1.2]
    });
    
    // Показываем уведомление о скидке если есть
    if (product.discount && product.discount > 10) {
      NotificationManager.notifyDiscount(product.name, product.discount, product.price);
    }
    
    const socialUrl = getSocialUrl(product.sellers);
    if (socialUrl) {
      // Используем window.open с правильными параметрами чтобы избежать перезагрузки
      const link = document.createElement('a');
      link.href = socialUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Показываем уведомление вместо alert
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      notification.textContent = 'Социальные сети продавца не настроены';
      document.body.appendChild(notification);
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
    }
  };

  // Функции для 3D Touch модального окна товара
  const handleProductTouchStart = (product: Product, e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Сохраняем начальные координаты для определения скролла
    setTouchStartTime(Date.now());
    setProductDragStartY(touch.clientY);
    setProductTouchStart(touch.clientY);
    
    // НЕ устанавливаем touchProductModal сразу - только после удержания
    // Так не будет мигания при скролле
    
    // Запускаем таймер для определения удержания (увеличим до 500мс)
    const timer = setTimeout(() => {
      // Проверяем что пользователь все еще на том же элементе
      const currentTouch = e.touches[0];
      const movement = Math.abs(currentTouch.clientY - touch.clientY);
      
      // Только если движение минимальное - открываем модальное окно
      if (movement < 10) {
        setTouchProductModal(product);
        haptics.notification('success');
      }
    }, 500);
    
    setTouchHoldTimer(timer);
  };

  const handleProductTouchEnd = () => {
    // Очищаем таймер
    if (touchHoldTimer) {
      clearTimeout(touchHoldTimer);
      setTouchHoldTimer(null);
    }
    
    // Проверяем было ли это удержание или просто касание (теперь 500мс)
    const holdDuration = Date.now() - touchStartTime;
    if (holdDuration < 500) {
      // Просто касание - не открываем модальное окно
      setTouchProductModal(null);
    }
  };

  const handleProductTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const touchStartY = productDragStartY;
    const currentY = touch.clientY;
    
    // Проверяем на скролл - если движение больше 10px, отменяем 3D Touch
    const movement = Math.abs(currentY - touchStartY);
    if (movement > 10) {
      // Отменяем открытие модального окна
      if (touchHoldTimer) {
        clearTimeout(touchHoldTimer);
        setTouchHoldTimer(null);
      }
      // Не открываем модальное окно при скролле
      setTouchProductModal(null);
      return;
    }
    
    // Если модальное окно открыто, обрабатываем свайп
    if (touchProductModal) {
      const deltaY = currentY - touchStartY;
      
      // Если тянем вниз, начинаем свайп
      if (deltaY > 20) {
        setProductIsDragging(true);
        setProductDragOffset(deltaY);
        
        // Добавляем сопротивление при свайпе
        const resistance = Math.max(0, deltaY - 100) * 0.3;
        setProductDragOffset(deltaY + resistance);
      }
    }
  };

  // Функции для свайпа модального окна товара
  const handleProductModalTouchMove = (e: React.TouchEvent) => {
    if (!productIsDragging) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - productDragStartY;
    
    // Только свайп вниз
    if (deltaY > 0) {
      setProductDragOffset(deltaY);
      
      // Добавляем сопротивление
      const resistance = deltaY > 100 ? 1.5 : 1;
      const adjustedDelta = deltaY / resistance;
      
      const modal = document.querySelector('[data-product-modal]') as HTMLElement;
      if (modal) {
        modal.style.transform = `translateY(${adjustedDelta}px)`;
        modal.style.opacity = `${1 - (deltaY / 300)}`;
      }
    }
  };

  const handleProductModalTouchEnd = () => {
    if (!productIsDragging) return;
    
    // Если перетащили достаточно далеко - закрываем мгновенно
    if (productDragOffset > 120) {
      haptics.notification('success');
      setTouchProductModal(null);
      setProductDragOffset(0);
    } else {
      // Возвращаем на место
      const modal = document.querySelector('[data-product-modal]') as HTMLElement;
      if (modal) {
        modal.style.transition = 'transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)';
        modal.style.transform = 'scale(1) rotateX(0deg)';
        modal.style.opacity = '1';
        modal.style.filter = 'blur(0px)';
        
        setTimeout(() => {
          modal.style.transition = '';
        }, 200);
      }
      
      setProductDragOffset(0);
    }
    
    setProductIsDragging(false);
  };

  // Открытие облачка категорий
  const openCategoryCloud = () => {
    // Пружинная анимация при открытии
    setIsCloudOpening(true);
    setCloudPosition({ x: window.innerWidth / 2, y: 100 });
    setShowCategoryCloud(true);
    haptics.notification('success');
    
    setTimeout(() => {
      setIsCloudOpening(false);
    }, 600);
  };

  const allCategories = useMemo(() => {
  const categoryMap = new Map();
  
  // Сначала извлекаем категории из товаров
  products.forEach(product => {
    if (product.category) {
      if (!categoryMap.has(product.category)) {
        categoryMap.set(product.category, {
          id: categoryMap.size + 1,
          name: product.category,
          count: 0,
          icon: '📦', // Иконка по умолчанию
          color: 'from-blue-400 to-blue-600' // Цвет по умолчанию
        });
      }
      categoryMap.get(product.category).count++;
    }
  });
  
  // Затем добавляем данные из Supabase для известных категорий
  categories.forEach(supabaseCat => {
    if (categoryMap.has(supabaseCat.name)) {
      const existingCat = categoryMap.get(supabaseCat.name);
      categoryMap.set(supabaseCat.name, {
        ...existingCat,
        icon: supabaseCat.icon || existingCat.icon,
        color: supabaseCat.color || existingCat.color,
        sort_order: supabaseCat.sort_order || 999
      });
    }
  });
  
  // Сортируем по количеству товаров (сначала самые популярные)
  return Array.from(categoryMap.values())
    .filter(cat => cat.count > 0) // Только категории с товарами
    .sort((a, b) => b.count - a.count);
}, [products, categories]);

  // Pull-to-refresh handlers
  const handlePullStart = (e: React.TouchEvent) => {
    // Блокируем pull-to-refresh если открыто модальное окно
    if (touchProductModal) return;
    
    const touch = e.touches[0];
    if (window.scrollY === 0 && touch.clientY < 100) {
      setIsPullToRefresh(true);
      setPullDistance(0);
    }
  };

  const handlePullMove = (e: React.TouchEvent) => {
    // Блокируем pull-to-refresh если открыто модальное окно
    if (touchProductModal || !isPullToRefresh) return;
    
    const touch = e.touches[0];
    // Обновляем только если тянем вниз
    if (touch.clientY > 0) {
      setPullDistance(Math.min(touch.clientY / 3, 120)); // Уменьшаем чувствительность
    }
  };

  const handlePullEnd = () => {
    // Блокируем pull-to-refresh если открыто модальное окно
    if (touchProductModal || !isPullToRefresh) return;
    
    // Обновляем только если потянули достаточно сильно
    if (pullDistance > 60) {
      haptics.notification('success');
      fetchData();
    }
    setIsPullToRefresh(false);
    setPullDistance(0);
  };

  // Skeleton loader component
  const ProductSkeleton = () => (
    <div className="rounded-lg overflow-hidden shadow-sm border" style={{
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

  // Добавляем отладку в начале рендера
  console.log('🎨 Render state:', { 
    productsLength: products.length, 
    categoriesLength: categories.length, 
    loading, 
    error, 
    activeCategory 
  });

  // Если есть ошибка сети, показываем fallback
  if (error && error.includes('Failed to fetch')) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-300" style={{
        backgroundColor: 'var(--bg-primary)'
      }}>
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🌐</div>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Проблема с сетью</h2>
          <p style={{ color: 'var(--text-secondary)' }} className="mb-6">
            Не удалось подключиться к серверу. Проверьте интернет-соединение.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center transition-colors duration-300" style={{
        backgroundColor: 'var(--bg-primary)'
      }}>
        <div className="text-center">
          <div className="text-6xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>RA DELL</div>
          <div className="w-64 h-2 rounded-full overflow-hidden" style={{
            backgroundColor: 'var(--bg-tertiary)'
          }}>
            <div className="h-full animate-loading-bar" style={{
              background: 'linear-gradient(to right, #FF6B35, #FF8C42)'
            }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <FastLoader delay={100}>
      <div className="min-h-screen transition-colors duration-300" style={{
      // Safe area для edge-to-edge
      paddingTop: 'env(safe-area-inset-top)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      // Умная подстройка под систему
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)'
    }}
    onTouchStart={handlePullStart}
    onTouchMove={handlePullMove}
    onTouchEnd={handlePullEnd}
    >
      {/* Pull-to-refresh indicator */}
      {isPullToRefresh && (
        <div 
          className="fixed top-0 left-0 right-0 z-40 flex justify-center items-center transition-all duration-300"
          style={{
            height: `${Math.min(pullDistance, 120)}px`,
            opacity: pullDistance / 120,
            background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)'
          }}
        >
          <div className="text-center">
            <div className="text-2xl mb-2 text-white" style={{
              transform: `rotate(${pullDistance * 2}deg)`,
              transition: 'transform 0.3s ease-out'
            }}>
              🔄
            </div>
            <div className="text-sm text-white">
              {pullDistance > 80 ? 'Отпустите для обновления' : 'Тяните для обновления'}
            </div>
          </div>
        </div>
      )}
      
      {/* Header с учетом safe area */}
      <header className="sticky top-0 z-50 p-4 backdrop-blur-md border-b transition-colors duration-300" style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-primary)',
        // Компенсируем safe area для sticky header
        paddingTop: 'calc(1rem + env(safe-area-inset-top))',
        paddingLeft: 'calc(1rem + env(safe-area-inset-left))',
        paddingRight: 'calc(1rem + env(safe-area-inset-right))'
      }}>
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="Поиск товаров..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full pl-4 pr-12 py-3 rounded-lg outline-none transition-all duration-300 placeholder-gray-500" style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <VoiceSearch onSearch={setSearchQuery} />
            </div>
          </div>
          <button
            onClick={openCategoryCloud}
            onTouchStart={(e) => {
              const button = e.currentTarget;
              button.style.transform = 'translateY(2px) scale(0.95)';
              button.style.transition = 'transform 0.1s ease-out';
            }}
            onTouchEnd={(e) => {
              const button = e.currentTarget;
              button.style.transform = '';
              button.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg" style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-tertiary)'
            }}
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-4 h-0.5 bg-current rounded-full"></div>
              <div className="w-4 h-0.5 bg-current rounded-full"></div>
              <div className="w-4 h-0.5 bg-current rounded-full"></div>
            </div>
          </button>
          
          <button
            onClick={() => {
              // Фильтр по избранным
              setActiveCategory(activeCategory === 'favorites' ? null : 'favorites');
            }}
            onTouchStart={(e) => {
              const button = e.currentTarget;
              button.style.transform = 'translateY(2px) scale(0.95)';
              button.style.transition = 'transform 0.1s ease-out';
            }}
            onTouchEnd={(e) => {
              const button = e.currentTarget;
              button.style.transform = '';
              button.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg relative" style={{
              backgroundColor: activeCategory === 'favorites' ? '#FF6B35' : 'var(--bg-secondary)',
              color: activeCategory === 'favorites' ? 'white' : 'var(--text-tertiary)'
            }}
          >
            <span className="text-lg" style={{ 
              filter: activeCategory === 'favorites' ? 'none' : 'grayscale(1)',
              opacity: activeCategory === 'favorites' ? 1 : 0.7
            }}>❤️</span>
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {favoritesCount > 99 ? '99+' : favoritesCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Проверка на отсутствие товаров */}
        {!loading && products.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Товары не найдены</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Не удалось загрузить товары. Пожалуйста, проверьте подключение к базе данных.
            </p>
          </div>
        )}
        
        {/* Активная категория */}
        {activeCategory && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {activeCategory === 'favorites' ? 'Избранное:' : 'Категория:'}
              </span>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {activeCategory === 'favorites' ? `${favoritesCount} товаров` : activeCategory}
              </span>
            </div>
            <button
              onClick={() => setActiveCategory(null)}
              className="text-sm px-3 py-1 rounded-full transition-colors"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)'
              }}
            >
              ✕ Сбросить
            </button>
          </div>
        )}
        
        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 pb-32">
          {loading && products.length === 0 ? (
            // Показываем skeleton loaders при загрузке
            Array.from({ length: 8 }).map((_, index) => (
              <ProductSkeleton key={index} />
            ))
          ) : (
            products.filter(p => {
              const matchesSearch = searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase());
              const matchesCategory = !activeCategory || activeCategory === 'favorites' 
                ? activeCategory === 'favorites' ? isFavorite(p.id) : true
                : p.category === activeCategory;
              return matchesSearch && matchesCategory;
            }).map(p => {
              const hasDiscount = p.discount > 0;
              const displayPrice = hasDiscount ? Math.round(p.price * (1 - p.discount / 100)) : p.price;
              const socialUrl = getSocialUrl(p.sellers);
              
              return (
                <div key={p.id} className="rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border hover:scale-[1.02]" style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)'
                }}>
                  <div className="relative aspect-3/4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    {!loadedImages.has(p.id) && (
                      <div className="absolute inset-0 animate-pulse" style={{
                        background: 'linear-gradient(to right, var(--bg-tertiary), var(--bg-secondary), var(--bg-tertiary))'
                      }} />
                    )}
                    <img 
                      src={p.image_url} 
                      className={`w-full h-full object-cover cursor-pointer transition-all duration-300 hover:scale-105 ${
                        loadedImages.has(p.id) ? 'opacity-100' : 'opacity-0'
                      } ${
                        // Убираем hover эффект при скролле
                        touchProductModal === p ? '' : 'active:scale-95'
                      }`} 
                      alt={p.name} 
                      loading="lazy"
                      onClick={() => setFullscreenImage(p.image_url)}
                      onLoad={() => handleImageLoad(p.id)}
                      onTouchStart={(e) => {
                        handleProductTouchStart(p, e);
                      }}
                      onTouchMove={(e) => {
                        handleProductTouchMove(e);
                      }}
                      onTouchEnd={(e) => {
                        handleProductTouchEnd();
                      }}
                      style={{
                        // Убираем визуальные эффекты при скролле
                        touchAction: touchProductModal === p ? 'none' : 'auto'
                      }}
                    />
                    
                    {/* Рейтинг на фото */}
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-lg backdrop-blur-sm" style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.6)'
                    }}>
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span 
                            key={star} 
                            className={`text-xs ${
                              star <= (p.rating || 4) 
                                ? 'text-yellow-400' 
                                : 'text-gray-400'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {hasDiscount && (
                      <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold" style={{
                        backgroundColor: '#dc2626',
                        color: 'white'
                      }}>
                        -{p.discount}%
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => setViewingSeller(p.sellers)} 
                      className="text-xs font-medium mb-1 block w-full text-center transition-colors duration-200 hover:underline" style={{
                        color: 'var(--accent)'
                      }}
                    >
                      {p.sellers?.shop_name || 'Магазин'}
                    </button>
                    <div className="mb-1">
                      <h3 className="text-xs font-medium line-clamp-2 h-6 transition-colors duration-200" style={{
                        color: 'var(--text-primary)'
                      }}>{p.name}</h3>
                    </div>
                    
                    {/* Цена */}
                    <div className="mb-2">
                      {hasDiscount ? (
                        <div className="flex items-center gap-1">
                          <del className="text-xs line-through" style={{ color: 'var(--text-tertiary)' }}>{p.price}₽</del>
                          <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{displayPrice}₽</div>
                        </div>
                      ) : (
                        <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{p.price}₽</div>
                      )}
                    </div>
                    
                    {/* Кнопки действий */}
                    <div className="flex justify-between items-center">
                      <button 
                        onClick={() => {
                          toggleFavorite(p.id);
                          haptics.selection();
                        }}
                        className="w-8 h-8 rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center"
                        style={{
                          backgroundColor: isFavorite(p.id) ? '#FF6B35' : 'var(--bg-tertiary)',
                          color: isFavorite(p.id) ? 'white' : 'var(--text-tertiary)'
                        }}
                        title={isFavorite(p.id) ? 'Убрать из избранного' : 'Добавить в избранное'}
                      >
                        <span className="text-xs">{isFavorite(p.id) ? '❤️' : '🤍'}</span>
                      </button>
                      
                      <BuyIcon
                        sellerContacts={p.sellers || {}}
                        productName={p.name}
                        productId={p.id}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Seller Modal */}
      {viewingSeller && (
        <div className="fixed inset-0 z-50 flex flex-col animate-modal-backdrop" style={{
          backgroundColor: isDarkTheme ? '#0f172a' : '#ffffff'
        }}>
          <header className="border-b p-6 flex justify-between items-center animate-seller-modal" style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)',
            paddingTop: 'calc(1.5rem + env(safe-area-inset-top))'
          }}>
            <button 
              onClick={() => {
                setViewingSeller(null);
              }} 
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg" style={{
                backgroundColor: '#FF6B35',
                color: 'white'
              }}
            >
              <span className="text-xl">←</span>
            </button>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{viewingSeller.shop_name}</h2>
          </header>
          <div data-seller-modal className="flex-1 overflow-y-auto p-6 pb-20 animate-modal-content" style={{
            animation: 'seller-modal-in 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.filter(p => p.seller_id === viewingSeller.id).map(p => {
                const hasDiscount = p.discount > 0;
                const displayPrice = hasDiscount ? Math.round(p.price * (1 - p.discount / 100)) : p.price;
                const socialUrl = getSocialUrl(viewingSeller);
                
                return (
                  <div key={p.id} className="rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border hover:scale-[1.02]" style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}>
                    <div className="relative aspect-square" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <img 
                        src={p.image_url} 
                        className="w-full h-full object-cover" 
                        alt={p.name} 
                      />
                      {hasDiscount && (
                        <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold" style={{
                          backgroundColor: '#dc2626',
                          color: 'white'
                        }}>
                          -{p.discount}%
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium mb-2 line-clamp-2 h-10" style={{
                        color: 'var(--text-primary)'
                      }}>{p.name}</h3>
                      <div className="mb-2">
                        {hasDiscount ? (
                          <>
                            <del className="text-xs block" style={{ color: 'var(--text-tertiary)' }}>{p.price}₽</del>
                            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{displayPrice}₽</div>
                          </>
                        ) : (
                          <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{p.price}₽</div>
                        )}
                      </div>
                      <BuyIcon
                        sellerContacts={p.sellers || {}}
                        productName={p.name}
                        productId={p.id}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Category Cloud Modal */}
      {showCategoryCloud && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center p-4 animate-modal-backdrop"
          style={{
            background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
          }}
          onClick={(e) => {
            // Плавное закрытие при клике вне окна
            const modal = document.querySelector('[data-category-modal]') as HTMLElement;
            if (modal && !modal.contains(e.target as Node)) {
              setShowCategoryCloud(false);
              setCloudDragOffset(0);
              setCategorySearchQuery('');
            } else {
              setShowCategoryCloud(false);
              setCategorySearchQuery('');
            }
          }}
        >
          <div 
            className={`rounded-3xl p-6 max-w-4xl w-full shadow-2xl relative max-h-[70vh] overflow-y-auto scrollbar-hide ${
              isCloudOpening ? 'animate-spring-in' : ''
            }`}
            style={{
              backgroundColor: isDarkTheme ? '#1f2937' : '#ffffff',
              position: 'absolute',
              top: `${cloudPosition.y}px`,
              left: `${cloudPosition.x}px`,
              transform: `translate(-50%, ${cloudDragOffset}px) scale(${Math.max(0.8, 1 - cloudDragOffset / 1000)})`,
              transition: cloudIsDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              transformOrigin: 'top center',
              opacity: isCloudOpening ? 0 : (cloudIsDragging ? Math.max(0, 1 - cloudDragOffset / 500) : 1)
            }}
            data-category-modal="true"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              setCloudTouchStart(touch.clientY);
              setCloudIsDragging(false);
              setCloudIsDraggingHandle(false);
              setCloudDragOffset(0);
              
              // Проверяем, касается ли пользователь черточки
              const swipeIndicator = document.getElementById('swipeIndicator');
              if (swipeIndicator) {
                const rect = swipeIndicator.getBoundingClientRect();
                const handleArea = {
                  left: rect.left - 30,
                  right: rect.right + 30,
                  top: rect.top - 15,
                  bottom: rect.bottom + 15
                };
                
                if (touch.clientX >= handleArea.left && touch.clientX <= handleArea.right &&
                    touch.clientY >= handleArea.top && touch.clientY <= handleArea.bottom) {
                  setCloudIsDraggingHandle(true);
                  // Активируем черточку
                  swipeIndicator.style.width = '40px';
                  swipeIndicator.style.height = '4px';
                  swipeIndicator.style.background = '#6b7280';
                  haptics.impact('light');
                }
              }
            }}
            onTouchMove={(e) => {
              if (!cloudIsDraggingHandle) return;
              e.preventDefault();
              
              const touch = e.touches[0];
              const deltaY = touch.clientY - cloudTouchStart;
              
              if (deltaY > 10 && !cloudIsDragging) {
                setCloudIsDragging(true);
                haptics.impact('medium');
              }
              
              if (cloudIsDragging) {
                const rubberBandFactor = deltaY > 150 ? 1 + (deltaY - 150) * 0.003 : 1;
                setCloudDragOffset(Math.min(deltaY * rubberBandFactor, 300));
              }
            }}
            onTouchEnd={(touchEvent) => {
              if (cloudIsDragging && cloudDragOffset > 100) {
                // Закрываем модальное окно мгновенно
                haptics.notification('success');
                setShowCategoryCloud(false);
                setCloudDragOffset(0);
                setCategorySearchQuery('');
              } else {
                // Возвращаем на место с плавной анимацией
                const modal = touchEvent.currentTarget as HTMLElement;
                modal.style.transition = 'transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)';
                setCloudDragOffset(0);
                
                setTimeout(() => {
                  modal.style.transition = '';
                }, 200);
              }
              
              // Сбрасываем состояния
              setCloudIsDragging(false);
              setCloudIsDraggingHandle(false);
              setCloudTouchStart(0);
              
              // Возвращаем черточку
              const swipeIndicator = document.getElementById('swipeIndicator');
              if (swipeIndicator) {
                swipeIndicator.style.transition = 'width 0.2s cubic-bezier(0.4, 0.0, 0.2, 1), height 0.2s cubic-bezier(0.4, 0.0, 0.2, 1), background 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)';
                swipeIndicator.style.width = '48px';
                swipeIndicator.style.height = '4px';
                swipeIndicator.style.background = '#d1d5db';
                
                setTimeout(() => {
                  swipeIndicator.style.transition = '';
                }, 200);
              }
            }}
          >
            {/* Swipe Indicator */}
            <div 
              id="swipeIndicator"
              className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-300 rounded-full transition-all duration-300"
            />
            
            <h3 className="text-xl font-bold mb-4 text-center mt-2" style={{ color: 'var(--text-primary)' }}>📂 Все категории</h3>
            
            {/* Поиск категорий */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="🔍 Поиск категорий..."
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border transition-colors duration-200"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-category-scroll>
              {allCategories
                .filter(category => 
                  categorySearchQuery === '' || 
                  category.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
                )
                .map((category, index) => (
                <button
                  key={category.id}
                  onClick={() => {
                    haptics.selection();
                    setActiveCategory(category.name);
                    setShowCategoryCloud(false);
                    setCategorySearchQuery('');
                  }}
                  className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-xl category-scroll`}
                  style={{
                    background: (() => {
                      if (isDarkTheme) {
                        // Темная тема - используем темные градиенты
                        const darkColors = [
                          'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', // dark blue
                          'linear-gradient(135deg, #581c87 0%, #6b21a8 100%)', // dark purple
                          'linear-gradient(135deg, #14532d 0%, #166534 100%)', // dark green
                          'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)', // dark red
                          'linear-gradient(135deg, #312e81 0%, #3730a3 100%)', // dark indigo
                          'linear-gradient(135deg, #831843 0%, #9f1239 100%)', // dark pink
                          'linear-gradient(135deg, #713f12 0%, #854d0e 100%)', // dark yellow
                          'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)', // dark orange
                          'linear-gradient(135deg, #374151 0%, #4b5563 100%)', // dark gray
                          'linear-gradient(135deg, #881337 0%, #9f1239 100%)', // dark rose
                          'linear-gradient(135deg, #164e63 0%, #0e7490 100%)', // dark cyan
                          'linear-gradient(135deg, #78350f 0%, #92400e 100%)', // dark amber
                          'linear-gradient(135deg, #134e4a 0%, #115e59 100%)', // dark teal
                          'linear-gradient(135deg, #581c87 0%, #6b21a8 100%)', // dark violet
                          'linear-gradient(135deg, #44403c 0%, #57534e 100%)', // dark stone
                          'linear-gradient(135deg, #18181b 0%, #27272a 100%)', // dark zinc
                        ];
                        return darkColors[index % darkColors.length];
                      } else {
                        // Светлая тема - используем яркие градиенты
                        const lightColors = [
                          'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // blue
                          'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', // purple
                          'linear-gradient(135deg, #10b981 0%, #059669 100%)', // green
                          'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', // red
                          'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', // indigo
                          'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', // pink
                          'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', // yellow
                          'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', // orange
                          'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', // gray
                          'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', // rose
                          'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', // cyan
                          'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // amber
                          'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', // teal
                          'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', // violet
                          'linear-gradient(135deg, #92400e 0%, #78350f 100%)', // brown
                          'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)', // lime
                          'linear-gradient(135deg, #10b981 0%, #059669 100%)', // emerald
                          'linear-gradient(135deg, #d946ef 0%, #c026d3 100%)', // fuchsia
                        ];
                        return lightColors[index % lightColors.length];
                      }
                    })(),
                    animation: !isCloudOpening ? `cloud-item-in 0.4s ease-out ${index * 0.05}s both` : 'none'
                  }}
                >
                  {/* Фоновое изображение */}
                  <div className="absolute inset-0">
                    <img 
                      src={category.image || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop'}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Градиентный оверлей для читаемости текста */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/40 to-transparent" />
                  </div>
                  
                  <div className="relative z-10 flex items-end h-32">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl bg-white/20 backdrop-blur-sm rounded-lg p-2">
                          {category.icon || '📦'}
                        </div>
                        <div className="text-left">
                          <h4 className="text-white font-bold text-lg mb-1">{category.name}</h4>
                          <p className="text-white/90 text-sm">{category.count || 0} товаров</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-white/80 bg-white/10 backdrop-blur-sm rounded-full p-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowCategoryCloud(false);
                setCategorySearchQuery('');
              }}
              className="mt-6 w-full py-3 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: isDarkTheme ? '#374151' : '#f3f4f6',
                color: 'var(--text-primary)',
                animation: !isCloudOpening ? 'cloud-item-in 0.4s ease-out 0.5s both' : 'none'
              }}
            >
              ✖ Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4 animate-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setFullscreenImage(null);
            }
          }}
        >
          <div className="relative max-w-6xl max-h-full animate-modal-content">
            <img 
              src={fullscreenImage} 
              className="max-w-full max-h-full object-contain" 
              alt="Fullscreen view"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenImage(null);
              }}
              className="absolute top-4 right-4 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 3D Touch Product Modal */}
      <TouchProductModal
        touchProductModal={touchProductModal}
        setTouchProductModal={setTouchProductModal}
        isDarkTheme={isDarkTheme}
        handleProductModalTouchMove={handleProductModalTouchMove}
        handleProductModalTouchEnd={handleProductModalTouchEnd}
      />
      </div>
    </FastLoader>
  );
}
