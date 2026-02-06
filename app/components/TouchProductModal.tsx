'use client';

import React from 'react';
import BuyIcon from './BuyIcon';

interface TouchProductModalProps {
  touchProductModal: any;
  setTouchProductModal: (product: any) => void;
  isDarkTheme: boolean;
  handleProductModalTouchMove: (e: React.TouchEvent) => void;
  handleProductModalTouchEnd: (e: React.TouchEvent) => void;
}

export default function TouchProductModal({
  touchProductModal,
  setTouchProductModal,
  isDarkTheme,
  handleProductModalTouchMove,
  handleProductModalTouchEnd
}: TouchProductModalProps) {
  if (!touchProductModal) return null;

  return (
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
        className="rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-hide animate-modal-content border relative"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-primary)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div 
          className="flex justify-center mb-4 py-2 -mx-2"
          onTouchMove={handleProductModalTouchMove}
          onTouchEnd={handleProductModalTouchEnd}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full transition-all duration-300 hover:bg-gray-400" />
        </div>

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{touchProductModal.name}</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{touchProductModal.category || 'Без категории'}</p>
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
              <div className="flex items-center gap-2 mb-1">
                <del className="text-sm" style={{ color: 'var(--text-secondary)' }}>{touchProductModal.price}₽</del>
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-bold">
                  -{touchProductModal.discount}%
                </span>
              </div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {Math.round(touchProductModal.price * (1 - touchProductModal.discount / 100))}₽
              </div>
            </>
          ) : (
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{touchProductModal.price}₽</div>
          )}
        </div>

        {/* Description */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Описание</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {touchProductModal.description || 'Описание отсутствует'}
          </p>
        </div>

        {/* Seller Info */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Продавец</h3>
          <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              {touchProductModal.sellers?.shop_name || 'Не указано'}
            </p>
            
            {/* Social Links */}
            <div className="flex flex-wrap gap-2">
              {touchProductModal.sellers?.telegram_url && (
                <button
                  onClick={() => {
                    let telegramUrl = touchProductModal.sellers.telegram_url;
                    // Если начинается с @, преобразуем в полный URL
                    if (telegramUrl.startsWith('@')) {
                      telegramUrl = `https://t.me/${telegramUrl.substring(1)}`;
                    }
                    const link = document.createElement('a');
                    link.href = telegramUrl;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 bg-blue-500 text-white hover:bg-blue-600 shadow-lg"
                >
                  📱
                </button>
              )}
              {touchProductModal.sellers?.vk_url && (
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = touchProductModal.sellers.vk_url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 bg-blue-600 text-white hover:bg-blue-700 shadow-lg"
                >
                  💬
                </button>
              )}
              {touchProductModal.sellers?.whatsapp_url && (
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = touchProductModal.sellers.whatsapp_url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 bg-green-500 text-white hover:bg-green-600 shadow-lg"
                >
                  💬
                </button>
              )}
              {touchProductModal.sellers?.instagram_url && (
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = touchProductModal.sellers.instagram_url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 bg-pink-500 text-white hover:bg-pink-600 shadow-lg"
                >
                  📷
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
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 bg-gray-500 text-white hover:bg-gray-600 shadow-lg"
                >
                  📞
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="absolute bottom-6 right-6">
          <BuyIcon
            sellerContacts={touchProductModal.sellers || {}}
            productName={touchProductModal.name}
            productId={touchProductModal.id}
          />
        </div>
      </div>
    </div>
  );
}
