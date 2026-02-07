'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Package, Plus, Settings, Home, MessageCircle } from 'lucide-react';
import Link from 'next/link';

// Кастомные анимации
const customStyles = `
  @keyframes bounce-slow {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  .animate-bounce-slow {
    animation: bounce-slow 3s ease-in-out infinite;
  }
  
  .animate-shimmer {
    animation: shimmer 2s ease-in-out infinite;
  }
  
  .delay-75 {
    animation-delay: 75ms;
  }
  
  .delay-150 {
    animation-delay: 150ms;
  }
`;

if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = customStyles;
  document.head.appendChild(style);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('🎨 Admin layout loaded!');
  const pathname = usePathname();
  
  const [activeTab, setActiveTab] = useState<'products' | 'social' | 'settings'>('products');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Синхронизируем activeTab с текущим URL
  useEffect(() => {
    if (pathname === '/admin') {
      setActiveTab('products');
    } else if (pathname === '/admin/social') {
      setActiveTab('social');
    } else if (pathname === '/admin/settings') {
      setActiveTab('settings');
    }
    // Закрываем мобильную навигацию при смене страницы
    setIsMobileNavOpen(false);
  }, [pathname]);

  const menuItems = [
    { id: 'products', icon: Package, href: '/admin' },
    { id: 'social', icon: MessageCircle, href: '/admin/social' },
    { id: 'settings', icon: Settings, href: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Навбар */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Мобильный заголовок */}
              <div className="md:hidden flex items-center space-x-2">
                <Package className="w-6 h-6 text-gray-900" />
                <span className="text-lg font-semibold text-gray-900">Админ</span>
              </div>
              
              {/* Десктопная навигация */}
              <div className="hidden md:flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <Package className="w-6 h-6 text-gray-900" />
                  <span className="text-lg font-semibold text-gray-900">Админ</span>
                </div>
                
                <div className="hidden md:flex space-x-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          activeTab === item.id
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              {/* Мобильная кнопка домой */}
              <div className="md:hidden mr-2">
                <Link
                  href="/"
                  className="flex items-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  <Home className="w-5 h-5" />
                </Link>
              </div>
              
              {/* Десктопная кнопка домой */}
              <div className="hidden md:flex items-center">
                <Link
                  href="/"
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  <Home className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Основной контент */}
      <main 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8"
        onClick={() => setIsMobileNavOpen(false)} // Закрываем навигацию при клике на контент
      >
        {children}
      </main>

      {/* Область для открытия мобильной навигации */}
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 z-40"
        onClick={() => setIsMobileNavOpen(true)}
      />

      {/* Мобильная навигация внизу */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent z-50 transition-all duration-300 ${
        isMobileNavOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
      }`}>
        {/* Облако с градиентом и эффектами */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
          <div className="relative animate-bounce-slow">
            {/* Основное облако */}
            <div className="w-40 h-8 bg-gradient-to-b from-white to-gray-50 rounded-t-full shadow-xl border border-gray-100 backdrop-blur-sm">
              {/* Декоративные элементы облака */}
              <div className="absolute top-2 left-4 w-6 h-3 bg-gradient-to-br from-white to-blue-50 rounded-full opacity-80 animate-pulse"></div>
              <div className="absolute top-1 right-6 w-4 h-2 bg-gradient-to-br from-white to-purple-50 rounded-full opacity-60 animate-pulse delay-75"></div>
              <div className="absolute top-3 right-3 w-3 h-2 bg-gradient-to-br from-white to-pink-50 rounded-full opacity-70 animate-pulse delay-150"></div>
              {/* Радужный эффект */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/20 to-transparent rounded-t-full animate-shimmer"></div>
            </div>
          </div>
        </div>
        
        {/* Панель навигации с эффектами */}
        <div 
          className="bg-white/95 backdrop-blur-lg border-t border-gray-100 shadow-2xl"
          onClick={(e) => e.stopPropagation()} // Предотвращаем закрытие при клике на навигацию
        >
          <div className="flex justify-around items-center py-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex flex-col items-center p-2 rounded-xl transition-all duration-500 transform ${
                    isActive 
                      ? 'text-blue-600 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 scale-110 shadow-2xl ring-2 ring-blue-400/50' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 scale-100'
                  }`}
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                  onClick={() => {
                    setIsMobileNavOpen(false); // Закрываем навигацию после клика
                  }}
                >
                  <div className={`relative ${isActive ? 'animate-bounce-slow' : ''}`}>
                    <Icon className={`w-7 h-7 transition-all duration-500 ${isActive ? 'drop-shadow-2xl filter hue-rotate-15' : ''}`} />
                    {isActive && (
                      <>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full animate-ping"></div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full"></div>
                        {/* Свечение вокруг активной иконки */}
                        <div className="absolute inset-0 w-9 h-9 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full blur-md animate-pulse"></div>
                      </>
                    )}
                  </div>
                  <span className={`text-xs font-bold mt-1 transition-all duration-500 ${
                    isActive ? 'text-blue-700 drop-shadow-sm' : 'text-gray-600'
                  }`}>
                    {item.id === 'products' ? '📦' : 
                     item.id === 'social' ? '💬' : '⚙️'}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
