import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

// Валидация и логирование конфигурации
const validateSupabaseConfig = () => {
  if (!supabaseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL не найден в .env.local');
    console.error('📝 Добавьте в .env.local:');
    console.error('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    return false;
  }

  if (!supabaseKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY не найден в .env.local');
    console.error('📝 Добавьте в .env.local:');
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
    return false;
  }

  // Проверка формата URL
  try {
    new URL(supabaseUrl);
  } catch {
    console.error('❌ Неверный формат NEXT_PUBLIC_SUPABASE_URL');
    return false;
  }

  // Проверка формата ключа
  if (!supabaseKey.startsWith('eyJ')) {
    console.warn('⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY может быть неверным (обычно начинается с eyJ)');
  }

  console.log('✅ Supabase конфигурация валидна');
  console.log(`🔗 URL: ${supabaseUrl}`);
  console.log(`🔑 Key: ${supabaseKey.substring(0, 20)}...`);
  return true;
};

// Валидация при импорте
const isValid = validateSupabaseConfig();

export const supabase = isValid ? createClient(
  supabaseUrl || 'https://vklustrbpajwfuoldnxu.supabase.co',
  supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbHVzdHJicGFqd2Z1b2xkbnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk1NTgsImV4cCI6MjA4NDEzNTU1OH0.w7m-F-bHewTw9PnRpo1VICCIrDyefxHhn4yW2uJ9wIU',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'X-Client-Info': 'ra-dell-marketplace/2.0.1'
      }
    }
  }
) : null;

// Утилиты для проверки соединения
export const checkSupabaseConnection = async () => {
  try {
    console.log('🔍 Проверка соединения с Supabase...');
    
    // Сначала проверяем сессию
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Ошибка сессии:', sessionError);
      return { success: false, error: sessionError, type: 'session_error' };
    }
    
    if (!session) {
      console.warn('⚠️ Нет активной сессии');
      return { success: false, error: new Error('No active session'), type: 'no_session' };
    }
    
    console.log('✅ Сессия активна для пользователя:', session.user.email);
    
    // Простой ping запрос
    const { error } = await supabase.from('product_market').select('count', { count: 'exact' });
    
    if (error) {
      console.error('❌ Ошибка соединения с Supabase:', error);
      return { success: false, error, type: 'connection_error' };
    }
    
    console.log('✅ Соединение с Supabase установлено');
    return { success: true, session };
  } catch (error) {
    console.error('❌ Критическая ошибка Supabase:', error);
    return { success: false, error, type: 'critical_error' };
  }
};

// Функция для проверки текущего пользователя
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Ошибка получения пользователя:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('❌ Критическая ошибка получения пользователя:', error);
    return null;
  }
};

// Функция для обновления сессии
export const refreshSession = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('❌ Ошибка обновления сессии:', error);
      return null;
    }
    
    console.log('✅ Сессия обновлена');
    return data.session;
  } catch (error) {
    console.error('❌ Критическая ошибка обновления сессии:', error);
    return null;
  }
};

// Экспорт валидации для использования в компонентах
export { isValid };
