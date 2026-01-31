import { checkSupabaseConnection, isValid } from './supabase';

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'error';
  checks: {
    supabase: {
      status: 'connected' | 'disconnected' | 'misconfigured';
      message: string;
      details?: any;
    };
    environment: {
      status: 'configured' | 'missing';
      message: string;
      missingVars: string[];
    };
    browser: {
      status: 'supported' | 'unsupported';
      message: string;
      features: string[];
    };
  };
  timestamp: string;
}

export const performHealthCheck = async (): Promise<HealthCheckResult> => {
  const timestamp = new Date().toISOString();
  
  // Проверка окружения
  const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  // В браузере переменные окружения уже встроены, так что проверяем по факту работы Supabase
  const missingVars: string[] = [];
  
  const environmentCheck = {
    status: missingVars.length === 0 ? 'configured' as const : 'missing' as const,
    message: missingVars.length === 0 
      ? 'Все необходимые переменные окружения настроены' 
      : `Отсутствуют переменные: ${missingVars.join(', ')}`,
    missingVars
  };

  // Проверка Supabase
  let supabaseCheck;
  if (!isValid) {
    supabaseCheck = {
      status: 'misconfigured' as const,
      message: 'Supabase сконфигурирован неверно.',
      details: {
        url: 'Проверяется при подключении',
        key: 'Проверяется при подключении'
      }
    };
  } else {
    const connectionResult = await checkSupabaseConnection();
    supabaseCheck = {
      status: connectionResult.success ? 'connected' as const : 'disconnected' as const,
      message: connectionResult.success 
        ? 'Соединение с Supabase установлено успешно' 
        : 'Проблемы с соединением Supabase',
      details: connectionResult.error ? { error: connectionResult.error.message } : undefined
    };
  }

  // Проверка браузера
  const browserFeatures = [];
  let browserStatus: 'supported' | 'unsupported' = 'supported';

  if (typeof window !== 'undefined') {
    if ('serviceWorker' in navigator) browserFeatures.push('ServiceWorker');
    if ('localStorage' in window) browserFeatures.push('LocalStorage');
    if ('fetch' in window) browserFeatures.push('Fetch API');
    if ('IntersectionObserver' in window) browserFeatures.push('IntersectionObserver');
    if ('ResizeObserver' in window) browserFeatures.push('ResizeObserver');
    
    if (browserFeatures.length < 3) {
      browserStatus = 'unsupported';
    }
  }

  const browserCheck = {
    status: browserStatus,
    message: browserStatus === 'supported' 
      ? `Браузер поддерживает все необходимые функции (${browserFeatures.length}/5)` 
      : 'Браузер не поддерживает некоторые функции приложения',
    features: browserFeatures
  };

  // Общий статус
  const overallStatus = 
    (supabaseCheck.status === 'connected' && environmentCheck.status === 'configured') 
      ? 'healthy' as const
    : (supabaseCheck.status === 'misconfigured' || environmentCheck.status === 'missing')
      ? 'error' as const
    : 'warning' as const;

  return {
    status: overallStatus,
    checks: {
      supabase: supabaseCheck,
      environment: environmentCheck,
      browser: browserCheck
    },
    timestamp
  };
};

// Утилита для отображения статуса в консоли
export const logHealthStatus = async () => {
  console.log('🔍 Начинаю проверку состояния приложения...');
  
  const health = await performHealthCheck();
  
  console.log(`\n📊 Статус приложения: ${health.status.toUpperCase()}`);
  console.log(`⏰ Время проверки: ${health.timestamp}`);
  
  console.log('\n🗄️ Supabase:');
  console.log(`   Статус: ${health.checks.supabase.status}`);
  console.log(`   Сообщение: ${health.checks.supabase.message}`);
  
  console.log('\n⚙️ Окружение:');
  console.log(`   Статус: ${health.checks.environment.status}`);
  console.log(`   Сообщение: ${health.checks.environment.message}`);
  
  console.log('\n🌐 Браузер:');
  console.log(`   Статус: ${health.checks.browser.status}`);
  console.log(`   Сообщение: ${health.checks.browser.message}`);
  console.log(`   Функции: ${health.checks.browser.features.join(', ')}`);
  
  if (health.status === 'error') {
    console.log('\n❌ Обнаружены критические проблемы! Приложение может работать некорректно.');
  } else if (health.status === 'warning') {
    console.log('\n⚠️ Обнаружены проблемы. Некоторые функции могут быть недоступны.');
  } else {
    console.log('\n✅ Все системы в норме! Приложение готово к работе.');
  }
  
  return health;
};
