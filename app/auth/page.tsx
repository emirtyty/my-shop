'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Mail, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  // Временно для тестирования
  throw new Error('Отсутствуют переменные окружения Supabase. Настройте их в Vercel Dashboard.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Notification {
  type: 'success' | 'error';
  message: string;
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Вход
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (error) {
          showNotification('error', `Ошибка входа: ${error.message}`);
          return;
        }

        showNotification('success', 'Вход выполнен успешно');
        
        // Проверяем сессию перед редиректом
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setTimeout(() => {
            router.push('/admin');
          }, 1000);
        } else {
          showNotification('error', 'Сессия не установлена');
        }

      } else {
        // Регистрация
        if (!formData.email || !formData.password || !formData.confirmPassword) {
          showNotification('error', 'Заполните все поля');
          return;
        }

        if (formData.password.length < 6) {
          showNotification('error', 'Пароль должен содержать минимум 6 символов');
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          showNotification('error', 'Пароли не совпадают');
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`
          }
        });

        if (error) {
          showNotification('error', `Ошибка регистрации: ${error.message}`);
          return;
        }

        showNotification('success', 'Регистрация успешна. Проверьте почту для подтверждения.');
        setFormData({ email: '', password: '', confirmPassword: '' });
        setIsLogin(true);
      }

    } catch (error) {
      showNotification('error', `Неизвестная ошибка: ${error instanceof Error ? error.message : 'Произошла ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
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

      <div className="max-w-md w-full space-y-8">
        {/* Заголовок */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            {isLogin ? 'Вход в админку' : 'Регистрация'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin 
              ? 'Войдите для управления вашим магазином' 
              : 'Создайте аккаунт для вашего магазина'
            }
          </p>
        </div>

        {/* Форма */}
        <div className="bg-white py-8 px-6 shadow-lg rounded-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            {/* Пароль */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Пароль
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="•••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Подтверждение пароля (только для регистрации) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Подтвердите пароль
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="•••••••••"
                    required
                  />
                </div>
              </div>
            )}

            {/* Кнопка отправки */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                'Загрузка...'
              ) : (
                isLogin ? 'Войти' : 'Зарегистрироваться'
              )}
            </button>
          </form>

          {/* Переключение между входом и регистрацией */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ email: '', password: '', confirmPassword: '' });
              }}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {isLogin 
                ? 'Нет аккаунта? Зарегистрируйтесь' 
                : 'Уже есть аккаунт? Войдите'
              }
            </button>
          </div>
        </div>

        {/* Информация */}
        <div className="text-center text-sm text-gray-500 space-y-2">
          <p>
            {isLogin 
              ? 'Войдите для доступа к панели управления' 
              : 'После регистрации проверьте почту для подтверждения'
            }
          </p>
          <div className="text-xs text-gray-400">
            <p>Supabase URL: {supabaseUrl ? '✅' : '❌'}</p>
            <p>Supabase Key: {supabaseKey ? '✅' : '❌'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
