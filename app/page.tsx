'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from './lib/supabase';
import StoriesFeed from './components/StoriesFeed';

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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingSeller, setViewingSeller] = useState<any>(null);
  
  // Используем системную тему
  const isDarkTheme = useSystemTheme();
  
  // Состояния для категорий
  const [showCategoryCloud, setShowCategoryCloud] = useState(false);
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
    try {
      console.log('🔄 Starting data fetch from Supabase...');
      
      // Добавляем таймаут для запросов
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 10000); // 10 секунд таймаут
      });

      console.log('📡 Making requests to Supabase...');
      const dataPromise = Promise.all([
        supabase.from('product_market').select('*, sellers(shop_name, id, telegram_url, vk_url, whatsapp_url, instagram_url)'),
        supabase
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
          .limit(10)
      ]);

      const [prodRes, storyRes] = await Promise.race([dataPromise, timeoutPromise]) as any;
      
      console.log('📦 Products response:', prodRes);
      console.log('📖 Stories response:', storyRes);
      
      setProducts(prodRes.data || []);
      setStories(storyRes.data || []);
      
      if (prodRes.error) {
        console.error('❌ Products error:', prodRes.error.message);
      }
      if (storyRes.error) {
        console.error('❌ Stories error:', storyRes.error.message);
      }
      
      console.log('✅ Data loaded successfully!');
    } catch (err) {
      console.error('💥 Error loading data:', err);
      // В случае ошибки просто показываем пустые данные
      setProducts([]);
      setStories([]);
    } finally {
      setLoading(false);
    }
  }

  const getSocialUrl = (seller: any) => {
    return seller?.telegram || seller?.vk || seller?.whatsapp || seller?.instagram || seller?.telegram_url || seller?.vk_url || seller?.whatsapp_url || seller?.instagram_url;
  };

  const getSocialIcon = (url: string) => {
    if (url?.includes('t.me') || url?.includes('telegram')) return '📱';
    if (url?.includes('vk.com') || url?.includes('vkontakte')) return '💬';
    if (url?.includes('wa.me') || url?.includes('whatsapp')) return '💬';
    if (url?.includes('instagram')) return '📷';
    return '🔗';
  };

  const handleBuyClick = (product: Product) => {
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
    
    // Если перетащили достаточно далеко - закрываем
    if (productDragOffset > 120) {
      haptics.notification('success');
      
      const modal = document.querySelector('[data-product-modal]') as HTMLElement;
      if (modal) {
        modal.style.transition = 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), filter 0.3s ease-out';
        modal.style.transform = 'scale(0.8) rotateX(15deg)';
        modal.style.opacity = '0';
        modal.style.filter = 'blur(8px)';
        
        setTimeout(() => {
          setTouchProductModal(null);
          setProductDragOffset(0);
          modal.style.transition = '';
          modal.style.transform = '';
          modal.style.opacity = '';
          modal.style.filter = '';
        }, 400);
      }
    } else {
      // Возвращаем на место
      const modal = document.querySelector('[data-product-modal]') as HTMLElement;
      if (modal) {
        modal.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), filter 0.3s ease-out';
        modal.style.transform = 'scale(1) rotateX(0deg)';
        modal.style.opacity = '1';
        modal.style.filter = 'blur(0px)';
        
        setTimeout(() => {
          modal.style.transition = '';
        }, 300);
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

  const allCategories = [
    { id: 1, name: 'Смартфоны', icon: '📱', count: 156, color: 'from-blue-400 to-blue-600' },
    { id: 2, name: 'Ноутбуки', icon: '💻', count: 89, color: 'from-purple-400 to-purple-600' },
    { id: 3, name: 'Планшеты', icon: '📋', count: 67, color: 'from-green-400 to-green-600' },
    { id: 4, name: 'Телевизоры', icon: '📺', count: 45, color: 'from-red-400 to-red-600' },
    { id: 5, name: 'Наушники', icon: '🎧', count: 234, color: 'from-indigo-400 to-indigo-600' },
    { id: 6, name: 'Часы', icon: '⌚', count: 78, color: 'from-pink-400 to-pink-600' },
    { id: 7, name: 'Фотоаппараты', icon: '📷', count: 34, color: 'from-yellow-400 to-yellow-600' },
    { id: 8, name: 'Игровые консоли', icon: '🎮', count: 56, color: 'from-orange-400 to-orange-600' },
    { id: 9, name: 'Мужская одежда', icon: '👔', count: 189, color: 'from-gray-600 to-gray-800' },
    { id: 10, name: 'Женская одежда', icon: '👗', count: 267, color: 'from-rose-400 to-rose-600' },
    { id: 11, name: 'Детская одежда', icon: '👶', count: 145, color: 'from-cyan-400 to-cyan-600' },
    { id: 12, name: 'Обувь', icon: '👟', count: 198, color: 'from-amber-400 to-amber-600' },
    { id: 13, name: 'Сумки и аксессуары', icon: '👜', count: 123, color: 'from-teal-400 to-teal-600' },
    { id: 14, name: 'Украшения', icon: '💍', count: 89, color: 'from-violet-400 to-violet-600' },
    { id: 15, name: 'Мебель', icon: '🪑', count: 67, color: 'from-brown-400 to-brown-600' },
    { id: 16, name: 'Кухня', icon: '🍳', count: 234, color: 'from-lime-400 to-lime-600' },
    { id: 17, name: 'Спорт', icon: '⚽', count: 156, color: 'from-emerald-400 to-emerald-600' },
    { id: 18, name: 'Красота', icon: '💄', count: 178, color: 'from-fuchsia-400 to-fuchsia-600' },
    { id: 19, name: 'Автотовары', icon: '🚗', count: 92, color: 'from-slate-400 to-slate-600' },
    { id: 20, name: 'Книги', icon: '📚', count: 445, color: 'from-stone-400 to-stone-600' },
    { id: 21, name: 'Домашние животные', icon: '🐾', count: 167, color: 'from-zinc-400 to-zinc-600' },
    { id: 22, name: 'Сад', icon: '🌱', count: 78, color: 'from-green-500 to-green-700' },
    { id: 23, name: 'Инструменты', icon: '🔧', count: 134, color: 'from-gray-500 to-gray-700' },
    { id: 24, name: 'Продукты', icon: '🍎', count: 0, color: 'from-red-500 to-red-700' }
  ];

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
        <div className="max-w-6xl mx-auto">
          <div className="relative">
            <input 
              type="text" 
              placeholder={showCategoryCloud ? "Поиск по категориям..." : "Поиск товаров..."} 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full pl-12 pr-20 py-3 rounded-lg outline-none transition-all duration-300 placeholder-gray-500" style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            />
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
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200" style={{
                color: 'var(--text-tertiary)'
              }}
            >
              ☁️
            </button>
          </div>
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
        
        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 pb-32">
          {loading && products.length === 0 ? (
            // Показываем skeleton loaders при загрузке
            Array.from({ length: 8 }).map((_, index) => (
              <ProductSkeleton key={index} />
            ))
          ) : (
            products.filter(p => 
              searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase())
            ).map(p => {
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
                    
                    {/* Иконка покупки */}
                    <div className="flex justify-end">
                      <button 
                        onClick={() => handleBuyClick(p)}
                        className={`p-1.5 rounded-lg transition-all duration-300 ${
                          socialUrl 
                            ? 'text-white hover:shadow-lg hover:scale-110' 
                            : 'cursor-not-allowed'
                        }`}
                        style={{
                          backgroundColor: socialUrl ? '#FF6B35' : 'var(--bg-tertiary)',
                          color: socialUrl ? 'white' : 'var(--text-tertiary)'
                        }}
                        title={socialUrl ? 'Купить' : 'Нет в наличии'}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </button>
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
              onClick={() => setViewingSeller(null)} 
              className="w-10 h-10 rounded-full font-bold transition-colors duration-300" style={{
                backgroundColor: '#FF6B35',
                color: 'white'
              }}
            >
              ←
            </button>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{viewingSeller.shop_name}</h2>
          </header>
          <div className="flex-1 overflow-y-auto p-6 pb-20 animate-modal-content">
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
                      <button 
                        onClick={() => handleBuyClick(p)}
                        className={`p-1.5 rounded-lg transition-all duration-300 ${
                          socialUrl 
                            ? 'text-white hover:shadow-lg hover:scale-110' 
                            : 'cursor-not-allowed'
                        }`}
                        style={{
                          backgroundColor: socialUrl ? '#FF6B35' : 'var(--bg-tertiary)',
                          color: socialUrl ? 'white' : 'var(--text-tertiary)'
                        }}
                        title={socialUrl ? 'Купить' : 'Нет в наличии'}
                      >
                        {getSocialIcon(socialUrl)}
                      </button>
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
              modal.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
              modal.style.transform = `translate(-50%, 50px) scale(0.98)`;
              modal.style.opacity = '0';
              
              setTimeout(() => {
                setShowCategoryCloud(false);
                setCloudDragOffset(0);
                modal.style.transition = '';
                modal.style.transform = '';
                modal.style.opacity = '';
              }, 300);
            } else {
              setShowCategoryCloud(false);
            }
          }}
        >
          <div 
            className={`bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl relative max-h-[70vh] overflow-y-auto scrollbar-hide ${
              isCloudOpening ? 'animate-spring-in' : ''
            }`}
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
                // Закрываем модальное окно с плавной анимацией
                haptics.notification('success');
                
                // Плавная анимация закрытия
                const modal = touchEvent.currentTarget as HTMLElement;
                modal.style.transition = 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)';
                modal.style.transform = `translate(-50%, 100px) scale(0.95)`;
                modal.style.opacity = '0';
                
                setTimeout(() => {
                  setShowCategoryCloud(false);
                  setCloudDragOffset(0);
                  // Сбрасываем стили для следующего открытия
                  modal.style.transition = '';
                  modal.style.transform = '';
                  modal.style.opacity = '';
                }, 400);
              } else {
                // Возвращаем на место с плавной анимацией
                const modal = touchEvent.currentTarget as HTMLElement;
                modal.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
                setCloudDragOffset(0);
                
                setTimeout(() => {
                  modal.style.transition = '';
                }, 300);
              }
              
              // Сбрасываем состояния
              setCloudIsDragging(false);
              setCloudIsDraggingHandle(false);
              setCloudTouchStart(0);
              
              // Возвращаем черточку
              const swipeIndicator = document.getElementById('swipeIndicator');
              if (swipeIndicator) {
                swipeIndicator.style.transition = 'width 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), background 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
                swipeIndicator.style.width = '48px';
                swipeIndicator.style.height = '4px';
                swipeIndicator.style.background = '#d1d5db';
                
                setTimeout(() => {
                  swipeIndicator.style.transition = '';
                }, 300);
              }
            }}
            style={{
              position: 'absolute',
              top: `${cloudPosition.y}px`,
              left: `${cloudPosition.x}px`,
              transform: `translate(-50%, ${cloudDragOffset}px) scale(${Math.max(0.8, 1 - cloudDragOffset / 1000)})`,
              transition: cloudIsDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              transformOrigin: 'top center',
              opacity: isCloudOpening ? 0 : (cloudIsDragging ? Math.max(0, 1 - cloudDragOffset / 500) : 1)
            }}
          >
            {/* Swipe Indicator */}
            <div 
              id="swipeIndicator"
              className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-300 rounded-full transition-all duration-300"
            />
            
            <h3 className="text-xl font-bold mb-6 text-gray-900 text-center mt-2">📂 Все категории</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allCategories.map((category, index) => (
                <button
                  key={category.id}
                  onClick={() => {
                    haptics.selection();
                    // setActiveCategory(category.name);
                    setShowCategoryCloud(false);
                  }}
                  className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-xl`}
                  style={{
                    background: (() => {
                      if (!category.color) {
                        return 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
                      }
                      const colors = category.color.split(' ');
                      if (colors.length >= 3 && colors[0] && colors[2]) {
                        const fromColor = colors[0].replace('from-', '').replace('400', 'a78bfa');
                        const toColor = colors[2].replace('to-', '').replace('600', '7c3aed');
                        return `linear-gradient(135deg, #${fromColor} 0%, #${toColor} 100%)`;
                      }
                      return 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
                    })(),
                    animation: !isCloudOpening ? `cloud-item-in 0.4s ease-out ${index * 0.05}s both` : 'none'
                  }}
                >
                  <div className="relative z-10">
                    <div className="text-3xl mb-2">{category.icon || '📦'}</div>
                    <h4 className="text-white font-semibold text-sm mb-1">{category.name}</h4>
                    <p className="text-white/80 text-xs">{category.count || 0} товаров</p>
                  </div>
                  
                  {/* Декоративный фон */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                  <div className="absolute -top-2 -right-2 w-12 h-12 bg-white/10 rounded-full blur-xl" />
                  <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-white/5 rounded-full blur-lg" />
                  
                  {/* Hover эффект */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCategoryCloud(false)}
              className="mt-6 w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              style={{
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
      {touchProductModal && (
        <div 
          className="fixed inset-0 z-50 backdrop-blur-lg flex items-center justify-center p-4 animate-modal-backdrop"
          style={{
            backgroundColor: isDarkTheme ? 'rgba(15, 23, 42, 0.8)' : 'rgba(0, 0, 0, 0.5)'
          }}
          onClick={(e) => {
            // Закрываем только при клике на фон, не на модальное окно
            if (e.target === e.currentTarget) {
              const modal = document.querySelector('[data-product-modal]') as HTMLElement;
              if (modal) {
                modal.style.transition = 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), filter 0.3s ease-out';
                modal.style.transform = 'scale(0.8) rotateX(15deg)';
                modal.style.opacity = '0';
                modal.style.filter = 'blur(8px)';
                
                setTimeout(() => {
                  setTouchProductModal(null);
                }, 300);
              }
            }
          }}
        >
          <div 
            data-product-modal
            className="rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-hide animate-modal-content border"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)'
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              setProductTouchStart(touch.clientY);
              setProductDragStartY(touch.clientY);
              setProductIsDragging(true);
            }}
            onTouchMove={handleProductModalTouchMove}
            onTouchEnd={handleProductModalTouchEnd}
          >
            {/* Drag Handle */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full transition-all duration-300 hover:bg-gray-400" />
            </div>

            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{touchProductModal.name}</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{touchProductModal.category || 'Без категории'}</p>
              </div>
              <button
                onClick={() => setTouchProductModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Product Image */}
            <div className="relative aspect-square rounded-xl mb-4 overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <img 
                src={touchProductModal.image_url} 
                className="w-full h-full object-cover"
                alt={touchProductModal.name}
              />
              {touchProductModal.discount > 0 && (
                <div className="absolute top-2 left-2 bg-yellow-400 text-gray-900 px-2 py-1 rounded text-xs font-bold">
                  -{touchProductModal.discount}%
                </div>
              )}
            </div>

            {/* Price */}
            <div className="mb-4">
              {touchProductModal.discount > 0 ? (
                <>
                  <div className="bg-yellow-400 text-gray-900 text-xs px-2 py-1 rounded inline-block mb-1">
                    <del className="font-medium">{touchProductModal.price}₽</del>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round(touchProductModal.price * (1 - touchProductModal.discount / 100))}₽
                  </div>
                </>
              ) : (
                <div className="text-2xl font-bold text-gray-900">{touchProductModal.price}₽</div>
              )}
            </div>

            {/* Description */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Описание</h3>
              <p className="text-sm text-gray-600">
                {touchProductModal.description || 'Описание отсутствует'}
              </p>
            </div>

            {/* Seller Info */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Продавец</h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-900 mb-2">
                  {touchProductModal.sellers?.shop_name || 'Не указано'}
                </p>
                
                {/* Social Links */}
                <div className="flex flex-wrap gap-2">
                  {touchProductModal.sellers?.telegram && (
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = touchProductModal.sellers.telegram;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      📱 Telegram
                    </button>
                  )}
                  {touchProductModal.sellers?.vk && (
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = touchProductModal.sellers.vk;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      💬 VK
                    </button>
                  )}
                  {touchProductModal.sellers?.whatsapp && (
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = touchProductModal.sellers.whatsapp;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      💬 WhatsApp
                    </button>
                  )}
                  {touchProductModal.sellers?.instagram && (
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = touchProductModal.sellers.instagram;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600 transition-colors"
                    >
                      📷 Instagram
                    </button>
                  )}
                  {touchProductModal.sellers?.phone && (
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = `tel:${touchProductModal.sellers.phone}`;
                        link.rel = 'noopener noreferrer';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                    >
                      📞 Позвонить
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pb-8">
              <button
                onClick={() => handleBuyClick(touchProductModal)}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
              >
                Купить
              </button>
              <button
                onClick={() => setFullscreenImage(touchProductModal.image_url)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                🖼️ Фото
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes ios-3d-touch-modal {
          0% {
            opacity: 0;
            transform: scale(0.3) rotateX(25deg) translateZ(-50px);
            filter: blur(10px);
          }
          20% {
            opacity: 0.3;
            transform: scale(0.5) rotateX(15deg) translateZ(-30px);
            filter: blur(5px);
          }
          40% {
            opacity: 0.6;
            transform: scale(0.7) rotateX(8deg) translateZ(-15px);
            filter: blur(2px);
          }
          60% {
            opacity: 0.85;
            transform: scale(0.85) rotateX(3deg) translateZ(-5px);
            filter: blur(1px);
          }
          80% {
            opacity: 0.95;
            transform: scale(0.95) rotateX(1deg) translateZ(-2px);
            filter: blur(0.5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotateX(0deg) translateZ(0px);
            filter: blur(0px);
          }
        }
        
        @keyframes card-to-modal {
          0% {
            opacity: 0;
            transform: scale(0.8) rotateX(15deg);
            filter: blur(8px);
          }
          20% {
            opacity: 0.2;
            transform: scale(0.85) rotateX(10deg);
            filter: blur(6px);
          }
          40% {
            opacity: 0.4;
            transform: scale(0.9) rotateX(5deg);
            filter: blur(4px);
          }
          60% {
            opacity: 0.7;
            transform: scale(0.95) rotateX(2deg);
            filter: blur(2px);
          }
          75% {
            opacity: 0.85;
            transform: scale(0.98) rotateX(1deg);
            filter: blur(1px);
          }
          85% {
            opacity: 0.92;
            transform: scale(0.99) rotateX(0.5deg);
            filter: blur(0.5px);
          }
          92% {
            opacity: 0.96;
            transform: scale(0.998) rotateX(0.2deg);
            filter: blur(0.2px);
          }
          96% {
            opacity: 0.98;
            transform: scale(0.999) rotateX(0.1deg);
            filter: blur(0.1px);
          }
          98% {
            opacity: 0.99;
            transform: scale(0.999) rotateX(0.05deg);
            filter: blur(0.05px);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotateX(0deg);
            filter: blur(0px);
          }
        }
        
        @keyframes spring-in {
          0% {
            opacity: 0;
            transform: translate(-50%, -50px) scale(0.3);
          }
          50% {
            opacity: 0.8;
            transform: translate(-50%, 10px) scale(1.1);
          }
          70% {
            opacity: 0.9;
            transform: translate(-50%, -5px) scale(0.95);
          }
          85% {
            opacity: 0.95;
            transform: translate(-50%, 2px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
        
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(0.95);
          }
        }
        
        @keyframes cloud-item-in {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
          overflow: -moz-scrollbars-none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
