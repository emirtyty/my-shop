'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Package, Plus, Settings, Home, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('🎨 Admin layout loaded!');
  const pathname = usePathname();
  
  const [activeTab, setActiveTab] = useState<'products' | 'social' | 'settings'>('products');

  // Синхронизируем activeTab с текущим URL
  useEffect(() => {
    if (pathname === '/admin') {
      setActiveTab('products');
    } else if (pathname === '/admin/social') {
      setActiveTab('social');
    } else if (pathname === '/admin/settings') {
      setActiveTab('settings');
    }
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
        {children}
      </main>

      {/* Мобильная навигация внизу */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        {/* Облако */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
          <div className="w-32 h-6 bg-white rounded-t-full border-t border-l border-r border-gray-200"></div>
        </div>
        
        <div className="flex justify-around items-center py-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">
                  {item.id === 'products' ? 'Товары' : 
                   item.id === 'social' ? 'Соцсети' : 'Настройки'}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
