'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MessageCircle, Phone, Send, Instagram, CheckCircle, AlertCircle, Save } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SocialLinks {
  id?: string;
  whatsapp: string;
  telegram: string;
  vk: string;
  instagram: string;
  created_at?: string;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

export default function SocialPage() {
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    whatsapp: '',
    telegram: '',
    vk: '',
    instagram: ''
  });
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSocialLinks();
  }, []);

  const loadSocialLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('social_links')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Ошибка загрузки соцсетей:', error);
        return;
      }
      
      if (data && data.length > 0) {
        setSocialLinks(data[0]);
      }
    } catch (error) {
      console.error('Ошибка загрузки соцсетей:', error);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Валидация
      const links = [socialLinks.whatsapp, socialLinks.telegram, socialLinks.vk, socialLinks.instagram];
      const hasAtLeastOneLink = links.some(link => link.trim() !== '');
      
      if (!hasAtLeastOneLink) {
        showNotification('error', 'Заполните хотя бы одно поле для контактов');
        return;
      }

      // Проверка формата ссылок
      const urlPattern = /^https?:\/\/.+/;
      for (const [key, value] of Object.entries(socialLinks)) {
        if (value && !urlPattern.test(value)) {
          showNotification('error', `Ссылка для ${key} должна начинаться с http:// или https://`);
          return;
        }
      }

      // Сохранение или обновление
      let error;
      if (socialLinks.id) {
        // Обновление существующей записи
        const result = await supabase
          .from('social_links')
          .update({
            whatsapp: socialLinks.whatsapp.trim(),
            telegram: socialLinks.telegram.trim(),
            vk: socialLinks.vk.trim(),
            instagram: socialLinks.instagram.trim(),
          })
          .eq('id', socialLinks.id);
        error = result.error;
      } else {
        // Создание новой записи
        const result = await supabase
          .from('social_links')
          .insert({
            whatsapp: socialLinks.whatsapp.trim(),
            telegram: socialLinks.telegram.trim(),
            vk: socialLinks.vk.trim(),
            instagram: socialLinks.instagram.trim(),
          });
        error = result.error;
      }

      if (error) {
        showNotification('error', `Ошибка сохранения: ${error.message}`);
        return;
      }

      // Успешное сохранение
      showNotification('success', 'Контактные данные успешно сохранены');
      
      // Перезагружаем данные для получения ID
      await loadSocialLinks();

    } catch (error) {
      showNotification('error', `Неизвестная ошибка: ${error instanceof Error ? error.message : 'Произошла ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof SocialLinks, value: string) => {
    setSocialLinks(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div>
      {/* Уведомления */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {notification.message}
        </div>
      )}

      {/* Заголовок */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Мои соц сети</h1>
          <p className="text-gray-600 mt-1">Управление контактными данными для связи с вами</p>
        </div>
      </div>

      {/* Форма */}
      <div className="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          {/* WhatsApp */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <label className="text-lg font-medium text-gray-900">WhatsApp</label>
            </div>
            <input
              type="url"
              value={socialLinks.whatsapp}
              onChange={(e) => handleInputChange('whatsapp', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="https://wa.me/79991234567"
            />
            <p className="text-sm text-gray-500 mt-2">Формат: https://wa.me/номер_телефона</p>
          </div>

          {/* Telegram */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <label className="text-lg font-medium text-gray-900">Telegram</label>
            </div>
            <input
              type="url"
              value={socialLinks.telegram}
              onChange={(e) => handleInputChange('telegram', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://t.me/username"
            />
            <p className="text-sm text-gray-500 mt-2">Формат: https://t.me/имя_пользователя</p>
          </div>

          {/* VK */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <label className="text-lg font-medium text-gray-900">VK</label>
            </div>
            <input
              type="url"
              value={socialLinks.vk}
              onChange={(e) => handleInputChange('vk', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://vk.com/username"
            />
            <p className="text-sm text-gray-500 mt-2">Формат: https://vk.com/имя_пользователя</p>
          </div>

          {/* Instagram */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-pink-100 rounded-lg">
                <Instagram className="w-5 h-5 text-pink-600" />
              </div>
              <label className="text-lg font-medium text-gray-900">Instagram</label>
            </div>
            <input
              type="url"
              value={socialLinks.instagram}
              onChange={(e) => handleInputChange('instagram', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="https://instagram.com/username"
            />
            <p className="text-sm text-gray-500 mt-2">Формат: https://instagram.com/имя_пользователя</p>
          </div>

          {/* Кнопка сохранения */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? (
                'Сохранение...'
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Сохранить
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Информация */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <MessageCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 mb-2">Как это работает?</h3>
            <p className="text-blue-800 text-sm">
              После сохранения контактных данных, клиенты смогут связаться с вами через иконку корзины 
              на карточке товара. Укажите хотя бы один способ связи для удобства клиентов.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
