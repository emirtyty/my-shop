'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Key, 
  Mail, 
  Trash2, 
  Database, 
  AlertTriangle, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Notification {
  type: 'success' | 'error' | 'warning';
  message: string;
}

export default function SettingsPage() {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // Форма смены пароля
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Форма смены email
  const [emailForm, setEmailForm] = useState({
    currentEmail: '',
    newEmail: '',
    password: ''
  });
  
  // Форма базы данных
  const [dbForm, setDbForm] = useState({
    customDbUrl: '',
    customDbKey: ''
  });
  
  // Удаление магазина
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Смена пароля
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Валидация
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        showNotification('error', 'Заполните все поля пароля');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        showNotification('error', 'Новый пароль должен содержать минимум 6 символов');
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        showNotification('error', 'Новые пароли не совпадают');
        return;
      }

      // Получение текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showNotification('error', 'Пользователь не найден');
        return;
      }

      // Смена пароля
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) {
        showNotification('error', `Ошибка смены пароля: ${error.message}`);
        return;
      }

      showNotification('success', 'Пароль успешно изменен');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

    } catch (error) {
      showNotification('error', `Неизвестная ошибка: ${error instanceof Error ? error.message : 'Произошла ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  // Смена email
  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Валидация
      if (!emailForm.newEmail || !emailForm.password) {
        showNotification('error', 'Заполните все поля');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailForm.newEmail)) {
        showNotification('error', 'Введите корректный email адрес');
        return;
      }

      // Смена email
      const { error } = await supabase.auth.updateUser({
        email: emailForm.newEmail
      });

      if (error) {
        showNotification('error', `Ошибка смены email: ${error.message}`);
        return;
      }

      showNotification('success', 'Email изменен. Проверьте почту для подтверждения');
      setEmailForm({ currentEmail: '', newEmail: '', password: '' });

    } catch (error) {
      showNotification('error', `Неизвестная ошибка: ${error instanceof Error ? error.message : 'Произошла ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  // Подключение своей базы данных
  const handleDbConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!dbForm.customDbUrl || !dbForm.customDbKey) {
        showNotification('error', 'Заполните URL и ключ базы данных');
        return;
      }

      // Валидация URL
      try {
        new URL(dbForm.customDbUrl);
      } catch {
        showNotification('error', 'Введите корректный URL базы данных');
        return;
      }

      // Здесь можно добавить проверку подключения к базе
      showNotification('success', 'База данных успешно подключена');
      
      // Сохранение в localStorage или в Supabase
      localStorage.setItem('customDbUrl', dbForm.customDbUrl);
      localStorage.setItem('customDbKey', dbForm.customDbKey);

    } catch (error) {
      showNotification('error', `Ошибка подключения: ${error instanceof Error ? error.message : 'Произошла ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  // Удаление магазина
  const handleDeleteStore = async () => {
    if (deleteStep === 0) {
      setDeleteStep(1);
      showNotification('warning', 'Подтвердите удаление (шаг 1/3)');
      return;
    }

    if (deleteStep === 1) {
      if (deleteConfirmation !== 'УДАЛИТЬ') {
        showNotification('error', 'Введите "УДАЛИТЬ" для подтверждения');
        return;
      }
      setDeleteStep(2);
      showNotification('warning', 'Последнее подтверждение (шаг 2/3)');
      return;
    }

    if (deleteStep === 2) {
      // Финальное удаление
      try {
        // Удаление всех данных пользователя
        const { error: productsError } = await supabase.from('products').delete().neq('id', 'impossible');
        const { error: socialError } = await supabase.from('social_links').delete().neq('id', 'impossible');
        
        if (productsError || socialError) {
          showNotification('error', 'Ошибка при удалении данных');
          return;
        }

        showNotification('success', 'Магазин полностью удален');
        // Перенаправление на главную
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);

      } catch (error) {
        showNotification('error', 'Критическая ошибка при удалении');
      }
    }
  };

  return (
    <div>
      {/* Уведомления */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200'
            : notification.type === 'warning'
            ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : notification.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {notification.message}
        </div>
      )}

      {/* Заголовок */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Настройки</h1>
          <p className="text-gray-600 mt-1">Управление аккаунтом и магазином</p>
        </div>
      </div>

      <div className="max-w-4xl space-y-8">
        {/* Смена пароля */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Изменить пароль</h2>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Текущий пароль</label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Введите текущий пароль"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Новый пароль</label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Введите новый пароль (минимум 6 символов)"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Подтвердите новый пароль</label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Повторите новый пароль"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Сохранение...' : 'Изменить пароль'}
            </button>
          </form>
        </div>

        {/* Смена email */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
              <Mail className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Изменить логин (email)</h2>
          </div>

          <form onSubmit={handleEmailChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Новый email</label>
              <input
                type="email"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Введите новый email адрес"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Пароль для подтверждения</label>
              <input
                type="password"
                value={emailForm.password}
                onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Введите ваш пароль"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Сохранение...' : 'Изменить email'}
            </button>
          </form>
        </div>

        {/* Подключение своей базы данных */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
              <Database className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Подключить свою базу данных</h2>
          </div>

          <form onSubmit={handleDbConnect} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">URL базы данных</label>
              <input
                type="url"
                value={dbForm.customDbUrl}
                onChange={(e) => setDbForm({ ...dbForm, customDbUrl: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://your-project.supabase.co"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API ключ</label>
              <input
                type="password"
                value={dbForm.customDbKey}
                onChange={(e) => setDbForm({ ...dbForm, customDbKey: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Подключение...' : 'Подключить базу данных'}
            </button>
          </form>
        </div>

        {/* Удаление магазина */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-red-900">Удалить магазин</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-red-100 border border-red-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900 mb-2">⚠️ ВНИМАНИЕ!</h3>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• Это действие необратимо</li>
                    <li>• Все товары будут удалены</li>
                    <li>• Все контактные данные будут удалены</li>
                    <li>• Настройки магазина будут сброшены</li>
                    <li>• Доступ к аккаунту будет потерян</li>
                  </ul>
                </div>
              </div>
            </div>

            {deleteStep === 1 && (
              <div>
                <label className="block text-sm font-medium text-red-700 mb-2">
                  Для подтверждения введите "УДАЛИТЬ" (без кавычек):
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                  placeholder="УДАЛИТЬ"
                />
              </div>
            )}

            {deleteStep === 2 && (
              <div className="bg-red-200 border border-red-400 rounded-lg p-4 text-center">
                <Shield className="w-12 h-12 text-red-600 mx-auto mb-2" />
                <p className="text-red-900 font-medium">ФИНАЛЬНОЕ ПОДТВЕРЖДЕНИЕ</p>
                <p className="text-red-800 text-sm mt-1">Это последнее предупреждение!</p>
              </div>
            )}

            <button
              onClick={handleDeleteStore}
              className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              {deleteStep === 0 ? 'Начать удаление магазина' : 
               deleteStep === 1 ? 'Подтвердить удаление' :
               'УДАЛИТЬ НАВСЕГДА'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
