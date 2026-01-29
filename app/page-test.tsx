'use client';

import { useState } from 'react';

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Поиск товаров..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 placeholder-gray-500" 
            />
            <button
              onClick={() => setShowModal(!showModal)}
              onTouchStart={(e) => {
                const button = e.currentTarget;
                button.style.transform = 'translateY(2px) scale(0.95)';
                button.style.transition = 'transform 0.1s ease-out';
              }}
              onTouchMove={(e) => {
                const button = e.currentTarget;
                const touch = e.touches[0];
                const rect = button.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const distance = Math.sqrt(
                  Math.pow(touch.clientX - centerX, 2) + 
                  Math.pow(touch.clientY - centerY, 2)
                );
                
                // 3D Touch эффект - чем сильнее нажатие, тем больше эффект
                const maxDistance = Math.max(rect.width, rect.height) / 2;
                const pressure = Math.max(0, 1 - distance / maxDistance);
                const scale = 0.95 - (pressure * 0.1); // от 0.95 до 0.85
                const translateY = 2 + (pressure * 3); // от 2px до 5px
                
                button.style.transform = `translateY(${translateY}px) scale(${scale})`;
                button.style.filter = `brightness(${1 - pressure * 0.2})`; // затемнение
              }}
              onTouchEnd={(e) => {
                const button = e.currentTarget;
                button.style.transform = '';
                button.style.filter = '';
                button.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), filter 0.3s ease-out';
              }}
              onMouseDown={(e) => {
                const button = e.currentTarget;
                button.style.transform = 'translateY(1px) scale(0.98)';
                button.style.filter = 'brightness(0.9)';
              }}
              onMouseUp={(e) => {
                const button = e.currentTarget;
                button.style.transform = '';
                button.style.filter = '';
              }}
              onMouseLeave={(e) => {
                const button = e.currentTarget;
                button.style.transform = '';
                button.style.filter = '';
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-lg transition-all duration-300 text-gray-400 hover:text-gray-600 hover:scale-110"
              style={{
                animation: 'pulse-subtle 2s infinite',
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none'
              }}
            >
              {showModal ? '✕' : '⊞'}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🛍️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">3D Touch работает!</h1>
          <p className="text-gray-600 mb-8">Нажми на кнопку ⊞ чтобы увидеть 3D Touch эффект</p>
          
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div 
              className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-200 p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105"
              onTouchStart={(e) => {
                const card = e.currentTarget;
                card.style.transform = 'translateY(2px) scale(0.98)';
                card.style.transition = 'transform 0.1s ease-out';
              }}
              onTouchMove={(e) => {
                const card = e.currentTarget;
                const touch = e.touches[0];
                const rect = card.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const distance = Math.sqrt(
                  Math.pow(touch.clientX - centerX, 2) + 
                  Math.pow(touch.clientY - centerY, 2)
                );
                
                const maxDistance = Math.max(rect.width, rect.height) / 2;
                const pressure = Math.max(0, 1 - distance / maxDistance);
                const scale = 0.98 - (pressure * 0.08);
                const translateY = 2 + (pressure * 2);
                
                card.style.transform = `translateY(${translateY}px) scale(${scale})`;
                card.style.filter = `brightness(${1 - pressure * 0.15})`;
              }}
              onTouchEnd={(e) => {
                const card = e.currentTarget;
                card.style.transform = '';
                card.style.filter = '';
                card.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), filter 0.3s ease-out';
              }}
              onMouseDown={(e) => {
                const card = e.currentTarget;
                card.style.transform = 'translateY(1px) scale(0.99)';
                card.style.filter = 'brightness(0.95)';
              }}
              onMouseUp={(e) => {
                const card = e.currentTarget;
                card.style.transform = '';
                card.style.filter = '';
              }}
              onMouseLeave={(e) => {
                const card = e.currentTarget;
                card.style.transform = '';
                card.style.filter = '';
              }}
            >
              <div className="w-full h-32 bg-gray-100 rounded-lg mb-4"></div>
              <h3 className="font-semibold text-gray-900">Тестовый товар 1</h3>
              <p className="text-orange-500 font-bold">1000₽</p>
            </div>
            <div 
              className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-200 p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105"
              onTouchStart={(e) => {
                const card = e.currentTarget;
                card.style.transform = 'translateY(2px) scale(0.98)';
                card.style.transition = 'transform 0.1s ease-out';
              }}
              onTouchMove={(e) => {
                const card = e.currentTarget;
                const touch = e.touches[0];
                const rect = card.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const distance = Math.sqrt(
                  Math.pow(touch.clientX - centerX, 2) + 
                  Math.pow(touch.clientY - centerY, 2)
                );
                
                const maxDistance = Math.max(rect.width, rect.height) / 2;
                const pressure = Math.max(0, 1 - distance / maxDistance);
                const scale = 0.98 - (pressure * 0.08);
                const translateY = 2 + (pressure * 2);
                
                card.style.transform = `translateY(${translateY}px) scale(${scale})`;
                card.style.filter = `brightness(${1 - pressure * 0.15})`;
              }}
              onTouchEnd={(e) => {
                const card = e.currentTarget;
                card.style.transform = '';
                card.style.filter = '';
                card.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), filter 0.3s ease-out';
              }}
              onMouseDown={(e) => {
                const card = e.currentTarget;
                card.style.transform = 'translateY(1px) scale(0.99)';
                card.style.filter = 'brightness(0.95)';
              }}
              onMouseUp={(e) => {
                const card = e.currentTarget;
                card.style.transform = '';
                card.style.filter = '';
              }}
              onMouseLeave={(e) => {
                const card = e.currentTarget;
                card.style.transform = '';
                card.style.filter = '';
              }}
            >
              <div className="w-full h-32 bg-gray-100 rounded-lg mb-4"></div>
              <h3 className="font-semibold text-gray-900">Тестовый товар 2</h3>
              <p className="text-orange-500 font-bold">2000₽</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'spring-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
            }}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">📂 Категории</h2>
            <p className="text-gray-600 mb-6">3D Touch и Spring анимация работают!</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-4 text-white">
                <div className="text-2xl mb-2">📱</div>
                <div className="font-semibold">Смартфоны</div>
              </div>
              <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl p-4 text-white">
                <div className="text-2xl mb-2">💻</div>
                <div className="font-semibold">Ноутбуки</div>
              </div>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="mt-6 w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              ✖ Закрыть
            </button>
          </div>
        </div>
      )}

      {/* CSS */}
      <style jsx>{`
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
      `}</style>
    </div>
  );
}
