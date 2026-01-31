'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Проверяем, есть ли уже активная сессия
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Ошибка проверки сессии:', error);
        } else if (session) {
          console.log('Найдена активная сессия, перенаправляем в админку...');
          window.location.href = '/admin';
          return;
        }
        
        setCheckingSession(false);
      } catch (error) {
        console.error('Критическая ошибка проверки сессии:', error);
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Вход - пробуем оба варианта
        let emailToUse = email;
        
        // Если ввели просто "admin", преобразуем в email
        if (email === 'admin') {
          emailToUse = 'admin@marketplace.com';
        }

        console.log('Пробуем войти с:', emailToUse, password);

        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        });

        console.log('Результат входа:', { data, error });

        if (error) {
          console.log('Ошибка входа:', error.message);
          
          // Если пользователь не существует, пробуем создать его
          if (error.message.includes('Invalid login credentials')) {
            console.log('Пробуем создать пользователя...');
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: emailToUse,
              password,
            });

            console.log('Регистрация:', { signUpData, signUpError });

            if (signUpError) {
              console.log('Ошибка регистрации:', signUpError.message);
              throw new Error(`Ошибка регистрации: ${signUpError.message}`);
            }

            if (signUpData.user) {
              console.log('Пользователь создан, добавляем в sellers...');
              
              // Создаем запись продавца
              const { error: sellerError } = await supabase
                .from('sellers')
                .insert({
                  id: signUpData.user.id,
                  login: email === 'admin' ? 'admin' : email,
                  shop_name: shopName || 'My Store',
                });

              if (sellerError) {
                console.log('Ошибка добавления в sellers:', sellerError.message);
                throw new Error(`Ошибка создания профиля: ${sellerError.message}`);
              }

              console.log('Профиль создан, пробуем войти...');
              
              // Пробуем войти снова
              const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email: emailToUse,
                password,
              });

              if (loginError) {
                throw new Error(`Ошибка повторного входа: ${loginError.message}`);
              }

              console.log('Вход успешен!');
            }
          } else {
            throw error;
          }
        }

        // Перенаправляем в админку
        window.location.href = '/admin';
      } else {
        // Регистрация
        console.log('Регистрация нового пользователя:', email);
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        console.log('Результат регистрации:', { data, error });

        if (error) {
          throw new Error(`Ошибка регистрации: ${error.message}`);
        }

        // Создаем запись продавца
        if (data.user) {
          console.log('Создаем профиль продавца...');
          
          const { error: sellerError } = await supabase
            .from('sellers')
            .insert({
              id: data.user.id,
              login: email,
              shop_name: shopName,
            });

          if (sellerError) {
            console.log('Ошибка создания профиля:', sellerError.message);
            throw new Error(`Ошибка создания профиля: ${sellerError.message}`);
          }
        }

        alert('Регистрация успешна! Теперь войдите.');
        setIsLogin(true);
      }
    } catch (error: any) {
      console.error('Ошибка аутентификации:', error);
      setError(error.message || 'Произошла ошибка при аутентификации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-4">
      {checkingSession ? (
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-white mb-2">Проверка сессии...</h2>
          <p className="text-gray-300">Проверяем наличие активной сессии</p>
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-white mb-8 text-center">
            {isLogin ? 'Вход в админку' : 'Регистрация продавца'}
          </h1>

        <div className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-cyan-300 mb-2">
                Название магазина
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white placeholder-white/50"
                placeholder="My Store"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white placeholder-white/50"
              placeholder="admin или admin@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white placeholder-white/50"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-100 px-4 py-3 rounded-2xl">
              {error}
            </div>
          )}

          <button
            onClick={handleAuth}
            disabled={loading || !email || !password || (!isLogin && !shopName)}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all duration-300"
          >
            {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>

          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-cyan-300 hover:text-cyan-200 transition-colors"
            >
              {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
            </button>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
