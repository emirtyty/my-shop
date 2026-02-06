'use client';

import { useState } from 'react';
import { logger } from '../lib/logger';

interface SellerContacts {
  telegram?: string;
  whatsapp?: string;
  viber?: string;
  instagram?: string;
  vk?: string;
  email?: string;
}

interface BuyButtonProps {
  sellerContacts: SellerContacts;
  productName: string;
  productId: string;
  className?: string;
}

export default function BuyButton({ 
  sellerContacts, 
  productName, 
  productId, 
  className = "" 
}: BuyButtonProps) {
  const [showModal, setShowModal] = useState(false);

  // Получаем иконку для мессенджера
  const getMessengerIcon = (messenger: string): string => {
    const icons = {
      telegram: '📱',
      whatsapp: '💬',
      viber: '💜',
      instagram: '📷',
      vk: '💙',
      email: '✉️'
    };
    return icons[messenger as keyof typeof icons] || '💬';
  };

  // Получаем название мессенджера
  const getMessengerName = (messenger: string): string => {
    const names = {
      telegram: 'Telegram',
      whatsapp: 'WhatsApp',
      viber: 'Viber',
      instagram: 'Instagram',
      vk: 'ВКонтакте',
      email: 'Email'
    };
    return names[messenger as keyof typeof names] || messenger;
  };

  // Получаем URL для мессенджера
  const getMessengerUrl = (messenger: string, contact: string): string => {
    switch (messenger) {
      case 'telegram':
        return `https://t.me/${contact.replace('@', '')}`;
      case 'whatsapp':
        return `https://wa.me/${contact.replace(/[^\d]/g, '')}`;
      case 'viber':
        return `viber://chat?number=${contact.replace(/[^\d]/g, '')}`;
      case 'instagram':
        return `https://instagram.com/${contact.replace('@', '')}`;
      case 'vk':
        return `https://vk.com/${contact}`;
      case 'email':
        return `mailto:${contact}`;
      default:
        return '#';
    }
  };

  // Переход в мессенджер
  const handleMessengerClick = (messenger: string, contact: string) => {
    try {
      const url = getMessengerUrl(messenger, contact);
      
      // Открываем в новой вкладке
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      logger.log(`Redirected to ${messenger}: ${contact}`);
    } catch (error) {
      logger.error('Error redirecting to messenger:', error);
    }
  };

  // Получаем доступные мессенджеры
  const getAvailableMessengers = () => {
    return Object.entries(sellerContacts)
      .filter(([_, value]) => value && value.trim() !== '')
      .map(([key, value]) => ({ messenger: key, contact: value }));
  };

  const availableMessengers = getAvailableMessengers();

  // Если нет контактов, показываем неактивную кнопку
  if (availableMessengers.length === 0) {
    return (
      <button
        className={`w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center cursor-not-allowed ${className}`}
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-tertiary)'
        }}
        title="Продавец не указал контакты"
      >
        <span className="text-xs">🛒</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center text-white hover:shadow-lg hover:scale-110 ${className}`}
        style={{
          backgroundColor: '#FF6B35'
        }}
        title="Купить"
      >
        <span className="text-xs">🛒</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Связаться с продавцом</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Вы можете связаться с продавцом через один из мессенджеров:
            </p>

            <div className="space-y-2">
              {availableMessengers.map(({ messenger, contact }) => (
                <button
                  key={messenger}
                  onClick={() => {
                    handleMessengerClick(messenger, contact);
                    setShowModal(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-2xl">{getMessengerIcon(messenger)}</span>
                  <div className="text-left">
                    <div className="font-medium">{getMessengerName(messenger)}</div>
                    <div className="text-sm text-gray-600">{contact}</div>
                  </div>
                  <div className="ml-auto">
                    <span className="text-green-500">→</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Совет:</strong> После связи с продавцом вы сможете обсудить детали покупки и оплатить через выбранный мессенджер.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
