'use client';

import { useState, useEffect } from 'react';
import { supabase, checkSupabaseConnection } from '../lib/supabase';

export default function DebugPage() {
  const [status, setStatus] = useState({
    supabase: 'checking',
    auth: 'checking',
    tables: 'checking',
    user: null
  });
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    addLog('🔍 Начинаем диагностику...');
    
    // 1. Проверка подключения к Supabase
    try {
      addLog('📡 Проверка подключения к Supabase...');
      const connectionResult = await checkSupabaseConnection();
      setStatus(prev => ({ ...prev, supabase: connectionResult.success ? 'ok' : 'error' }));
      addLog(connectionResult.success ? '✅ Подключение к Supabase успешно' : '❌ Ошибка подключения к Supabase');
    } catch (error) {
      setStatus(prev => ({ ...prev, supabase: 'error' }));
      addLog(`❌ Ошибка подключения: ${error.message}`);
    }

    // 2. Проверка аутентификации
    try {
      addLog('👤 Проверка аутентификации...');
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        setStatus(prev => ({ ...prev, auth: 'error' }));
        addLog(`❌ Ошибка аутентификации: ${error.message}`);
      } else {
        setStatus(prev => ({ ...prev, auth: user ? 'ok' : 'none', user }));
        addLog(user ? `✅ Пользователь авторизован: ${user.email}` : '⚠️ Пользователь не авторизован');
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, auth: 'error' }));
      addLog(`❌ Критическая ошибка аутентификации: ${error.message}`);
    }

    // 3. Проверка таблиц
    try {
      addLog('📊 Проверка таблиц...');
      const tables = ['product_market', 'sellers', 'stories', 'categories'];
      let allOk = true;
      
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('count', { count: 'exact' });
        if (error) {
          addLog(`❌ Таблица ${table}: ${error.message}`);
          allOk = false;
        } else {
          addLog(`✅ Таблица ${table}: ${data?.length || 0} записей`);
        }
      }
      
      setStatus(prev => ({ ...prev, tables: allOk ? 'ok' : 'error' }));
    } catch (error) {
      setStatus(prev => ({ ...prev, tables: 'error' }));
      addLog(`❌ Ошибка проверки таблиц: ${error.message}`);
    }

    addLog('🏁 Диагностика завершена');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'checking': return 'text-yellow-400';
      case 'none': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return '✅';
      case 'error': return '❌';
      case 'checking': return '⏳';
      case 'none': return '⚪';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔧 Диагностика системы</h1>
        
        {/* Статус */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Статус компонентов</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`flex items-center gap-3 ${getStatusColor(status.supabase)}`}>
              <span className="text-2xl">{getStatusIcon(status.supabase)}</span>
              <div>
                <div className="font-semibold">Supabase</div>
                <div className="text-sm opacity-75">Подключение к базе данных</div>
              </div>
            </div>
            
            <div className={`flex items-center gap-3 ${getStatusColor(status.auth)}`}>
              <span className="text-2xl">{getStatusIcon(status.auth)}</span>
              <div>
                <div className="font-semibold">Аутентификация</div>
                <div className="text-sm opacity-75">
                  {status.user ? `Пользователь: ${status.user.email}` : 'Не авторизован'}
                </div>
              </div>
            </div>
            
            <div className={`flex items-center gap-3 ${getStatusColor(status.tables)}`}>
              <span className="text-2xl">{getStatusIcon(status.tables)}</span>
              <div>
                <div className="font-semibold">Таблицы</div>
                <div className="text-sm opacity-75">Доступность таблиц БД</div>
              </div>
            </div>
          </div>
        </div>

        {/* Логи */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Логи диагностики</h2>
            <button
              onClick={runDiagnostics}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-2xl font-bold transition-colors"
            >
              🔄 Повторить
            </button>
          </div>
          
          <div className="bg-black/50 rounded-2xl p-4 h-64 overflow-y-auto font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Действия */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6">
          <h2 className="text-xl font-bold mb-4">Рекомендуемые действия</h2>
          <div className="space-y-3">
            {status.supabase === 'error' && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4">
                <div className="font-semibold text-red-300">Проблема с Supabase</div>
                <div className="text-sm mt-1">Проверьте переменные окружения и доступ к базе данных</div>
              </div>
            )}
            
            {status.auth === 'none' && (
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-2xl p-4">
                <div className="font-semibold text-yellow-300">Нет аутентификации</div>
                <div className="text-sm mt-1">
                  <a href="/auth" className="text-blue-400 hover:underline">Перейти к странице входа</a>
                </div>
              </div>
            )}
            
            {status.tables === 'error' && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4">
                <div className="font-semibold text-red-300">Проблема с таблицами</div>
                <div className="text-sm mt-1">Проверьте структуру базы данных и права доступа</div>
              </div>
            )}
            
            {status.supabase === 'ok' && status.auth === 'ok' && status.tables === 'ok' && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-4">
                <div className="font-semibold text-green-300">✅ Все системы работают</div>
                <div className="text-sm mt-1">
                  <a href="/admin" className="text-blue-400 hover:underline">Перейти в админку</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
