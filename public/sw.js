// Service Worker для RA DELL Marketplace - оптимизирован для плохих соединений
const CACHE_NAME = 'ra-dell-marketplace-v3';
const STATIC_CACHE = 'static-v3';
const DYNAMIC_CACHE = 'dynamic-v3';
const IMAGE_CACHE = 'images-v3';
const CRITICAL_CACHE = 'critical-v3';

// Критические ресурсы для немедленной загрузки
const CRITICAL_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Статические ресурсы для кэширования
const STATIC_ASSETS = [
  ...CRITICAL_ASSETS,
  'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
];

// Network-first стратегии для критических ресурсов
const NETWORK_FIRST_ROUTES = [
  '/api/',
  '/admin',
  '/auth'
];

// Cache-first стратегии для статических ресурсов
const CACHE_FIRST_ROUTES = [
  '/_next/static/',
  '/images/',
  '/icons/',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.woff',
  '.woff2'
];

// Установка Service Worker с предзагрузкой
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CRITICAL_CACHE)
      .then((cache) => {
        console.log('📦 Preloading critical assets...');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        return caches.open(STATIC_CACHE);
      })
      .then((cache) => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker installed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Installation failed:', error);
      })
  );
});

// Активация с очисткой старых кэшей
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.includes('v3')) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
      .then(() => {
        // Предзагружаем популярные страницы
        return preloadPopularPages();
      })
  );
});

// Предзагрузка популярных страниц
async function preloadPopularPages() {
  const popularPages = [
    '/',
    '/admin',
    '/auth'
  ];

  const cache = await caches.open(DYNAMIC_CACHE);
  
  for (const page of popularPages) {
    try {
      const response = await fetch(page);
      if (response.ok) {
        await cache.put(page, response.clone());
        console.log(`📄 Preloaded page: ${page}`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to preload ${page}:`, error);
    }
  }
}

// Определение стратегии кэширования
function getCacheStrategy(request) {
  const url = new URL(request.url);
  
  // API запросы - Network First с таймаутом
  if (url.pathname.startsWith('/api/')) {
    return 'network-first';
  }
  
  // Статические ресурсы - Cache First
  if (CACHE_FIRST_ROUTES.some(route => url.pathname.includes(route))) {
    return 'cache-first';
  }
  
  // Изображения - Cache First с долгим хранением
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    return 'image-cache';
  }
  
  // Страницы - Stale While Revalidate
  return 'stale-while-revalidate';
}

// Network First стратегия с улучшенным retry
async function networkFirst(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    // Пробуем получить из сети с таймаутом
    const networkPromise = fetch(request, {
      signal: AbortSignal.timeout(3000) // Уменьшили до 3 секунд
    });
    
    const response = await networkPromise;
    
    if (response.ok) {
      // Кэшируем успешный ответ
      cache.put(request, response.clone());
      console.log('🌐 Network First - from network:', request.url);
      return response;
    }
  } catch (error) {
    console.log('🔍 Network failed, trying cache...');
  }
  
  // Если сеть недоступна - пробуем кэш
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    console.log('📋 Network First - from cache:', request.url);
    return cachedResponse;
  }
  
  // Если нет в кэше - возвращаем оффлайн страницу
  return new Response('Офлайн режим. Проверьте подключение к интернету.', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// Cache First стратегия с background update
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('📋 Cache First - from cache:', request.url);
    
    // Фоновое обновление
    updateInBackground(request, cache);
    
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log('🌐 Cache First - from network:', request.url);
    }
    return networkResponse;
  } catch (error) {
    console.error('❌ Cache First failed:', error);
    return new Response('Ресурс недоступен', { status: 404 });
  }
}

// Фоновое обновление кэша
async function updateInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse);
      console.log('🔄 Background update completed:', request.url);
    }
  } catch (error) {
    console.warn('⚠️ Background update failed:', error);
  }
}

// Image Cache стратегия с адаптивным качеством
async function imageCache(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('🖼️ Image Cache - from cache:', request.url);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log('🌐 Image Cache - from network:', request.url);
    }
    return networkResponse;
  } catch (error) {
    console.error('❌ Image Cache failed:', error);
    // Возвращаем плейсхолдер для изображений
    return new Response('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y0ZjRmNCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7QkdC10L3QtdGA0L7QstCwPC90ZXh0Pjwvc3ZnPg==', {
      headers: { 'Content-Type': 'image/svg+xml' }
    });
  }
}

// Stale While Revalidate стратегия
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Асинхронно обновляем кэш
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
      console.log('🔄 SWR - cache updated:', request.url);
    }
    return response;
  }).catch((error) => {
    console.error('❌ SWR update failed:', error);
  });
  
  if (cachedResponse) {
    console.log('📋 SWR - from cache:', request.url);
    return cachedResponse;
  }
  
  // Если нет в кэше - ждем сеть
  try {
    const networkResponse = await fetchPromise;
    console.log('🌐 SWR - from network:', request.url);
    return networkResponse;
  } catch (error) {
    return new Response('Страница недоступна в офлайн режиме', { status: 503 });
  }
}

// Обработка запросов с оптимизацией
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Пропускаем non-GET запросы и chrome-extension
  if (
    request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'moz-extension:'
  ) {
    return;
  }
  
  event.respondWith(
    (async () => {
      const strategy = getCacheStrategy(request);
      
      switch (strategy) {
        case 'network-first':
          return await networkFirst(request);
        case 'cache-first':
          return await cacheFirst(request);
        case 'image-cache':
          return await imageCache(request);
        case 'stale-while-revalidate':
        default:
          return await staleWhileRevalidate(request);
      }
    })()
  );
});

// Фоновая синхронизация
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-cart') {
    event.waitUntil(syncCart());
  }
  
  if (event.tag === 'background-sync-orders') {
    event.waitUntil(syncOrders());
  }
});

// Push уведомления
self.addEventListener('push', (event) => {
  console.log('📬 Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'У вас новое уведомление!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Посмотреть',
        icon: '/images/checkmark.png'
      },
      {
        action: 'close',
        title: 'Закрыть',
        icon: '/images/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('RA DELL Marketplace', options)
  );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Функции синхронизации
async function syncCart() {
  try {
    console.log('🛒 Syncing cart...');
    // Логика синхронизации корзины
  } catch (error) {
    console.error('❌ Cart sync failed:', error);
  }
}

async function syncOrders() {
  try {
    console.log('📦 Syncing orders...');
    // Логика синхронизации заказов
  } catch (error) {
    console.error('❌ Orders sync failed:', error);
  }
}

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  console.log('📨 Message received from client:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🚀 Service Worker v3 loaded successfully!');
