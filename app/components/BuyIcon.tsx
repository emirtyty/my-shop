'use client';

import { useState } from 'react';
import { logger } from '../lib/logger';

interface SellerContacts {
  telegram?: string;
  telegram_url?: string;
  whatsapp?: string;
  whatsapp_url?: string;
  viber?: string;
  viber_url?: string;
  instagram?: string;
  instagram_url?: string;
  vk?: string;
  vk_url?: string;
  email?: string;
  phone?: string;
  shop_name?: string;
  id?: string;
}

interface BuyIconProps {
  sellerContacts: SellerContacts;
  productName: string;
  productId: string;
  className?: string;
}

export default function BuyIcon({ 
  sellerContacts, 
  productName, 
  productId, 
  className = "" 
}: BuyIconProps) {
  const [showModal, setShowModal] = useState(false);

  // Получаем иконку для мессенджера
  const getMessengerIcon = (messenger: string): string => {
    const icons = {
      telegram: '📱',
      whatsapp: '💬',
      viber: '💜',
      instagram: '📷',
      vk: '💙',
      email: '✉️',
      phone: '📞'
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
      email: 'Email',
      phone: 'Телефон'
    };
    return names[messenger as keyof typeof names] || messenger;
  };

  // Получаем URL для мессенджера
  const getMessengerUrl = (messenger: string, contact: string): string => {
    switch (messenger) {
      case 'telegram':
        // Если контакт уже является URL, используем его
        if (contact.startsWith('http')) {
          return contact;
        }
        // Если контакт начинается с @, убираем @ и добавляем https://t.me/
        if (contact.startsWith('@')) {
          return `https://t.me/${contact.substring(1)}`;
        }
        // Иначе добавляем https://t.me/
        return `https://t.me/${contact.replace('@', '').replace('https://t.me/', '')}`;
      case 'whatsapp':
        // Если контакт уже является URL, используем его
        if (contact.startsWith('http')) {
          return contact;
        }
        return `https://wa.me/${contact.replace(/[^\d]/g, '')}`;
      case 'viber':
        // Если контакт уже является URL, используем его
        if (contact.startsWith('viber://')) {
          return contact;
        }
        return `viber://chat?number=${contact.replace(/[^\d]/g, '')}`;
      case 'instagram':
        // Если контакт уже является URL, используем его
        if (contact.startsWith('http')) {
          return contact;
        }
        // Если контакт начинается с @, убираем @ и добавляем https://instagram.com/
        if (contact.startsWith('@')) {
          return `https://instagram.com/${contact.substring(1)}`;
        }
        return `https://instagram.com/${contact.replace('@', '').replace('https://instagram.com/', '')}`;
      case 'vk':
        // Если контакт уже является URL, используем его
        if (contact.startsWith('http')) {
          return contact;
        }
        return `https://vk.com/${contact.replace('https://vk.com/', '')}`;
      case 'email':
        return `mailto:${contact}`;
      case 'phone':
        return `tel:${contact}`;
      default:
        return '#';
    }
  };

  // Переход в мессенджер
  const handleMessengerClick = (messenger: string, contact: string) => {
    try {
      const url = getMessengerUrl(messenger, contact);
      console.log(`Attempting to redirect to ${messenger}:`, { contact, url });
      
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
      console.error('Error redirecting to messenger:', error);
      logger.error('Error redirecting to messenger:', error);
    }
  };

  // Получаем доступные мессенджеры
  const getAvailableMessengers = () => {
    return Object.entries(sellerContacts)
      .filter(([key, value]) => {
        // Пропускаем служебные поля
        if (key === 'shop_name' || key === 'id') return false;
        
        // Проверяем значение
        return value && value.trim() !== '';
      })
      .map(([key, value]) => {
        // Если поле с _url, убираем суффикс для имени мессенджера
        const messenger = key.replace('_url', '');
        return { messenger, contact: value };
      });
  };

  const availableMessengers = getAvailableMessengers();

  // Отладочная информация
  console.log('BuyIcon - sellerContacts:', sellerContacts);
  console.log('BuyIcon - availableMessengers:', availableMessengers);
  
  // Временно добавляем тестовые контакты для демонстрации
  const testContacts = {
    telegram: '@test_user',
    whatsapp: '+79991234567',
    vk: 'test_user'
  };
  
  const finalContacts = availableMessengers.length === 0 ? testContacts : sellerContacts;
  const finalMessengers = availableMessengers.length === 0 
    ? Object.entries(testContacts).map(([key, value]) => ({ messenger: key, contact: value }))
    : availableMessengers;

  // Если нет контактов, показываем неактивную иконку (только если нет и тестовых данных)
  if (finalMessengers.length === 0) {
    return (
      <div
        className={`w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center cursor-not-allowed ${className}`}
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-tertiary)'
        }}
        title="Продавец не указал контакты"
      >
        <span className="text-xs">🛒</span>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className={`w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center text-white hover:shadow-lg hover:scale-110 cursor-pointer ${className}`}
        style={{
          backgroundColor: '#FF6B35'
        }}
        title="Купить"
      >
        <span className="text-xs">🛒</span>
      </div>

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
              {finalMessengers.map(({ messenger, contact }) => (
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
