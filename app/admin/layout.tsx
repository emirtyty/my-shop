'use client';

import { useState } from 'react';
import { Package, Plus, Settings, Home, MessageCircle } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('🎨 Admin layout loaded!');
  
  const [activeTab, setActiveTab] = useState<'products' | 'social' | 'settings'>('products');

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
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <Package className="w-6 h-6 text-gray-900" />
                  <span className="text-lg font-semibold text-gray-900">Админ</span>
                </div>
                
                <div className="hidden md:flex space-x-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          activeTab === item.id
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab(item.id as any);
                          window.history.pushState({}, '', item.href);
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <a
                href="/"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <Home className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Основной контент */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
