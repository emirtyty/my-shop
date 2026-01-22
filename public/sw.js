// Service Worker для RA DELL Marketplace
const CACHE_NAME = 'ra-dell-marketplace-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Статические ресурсы для кэширования
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main-app.js',
  '/_next/static/chunks/app/_app-client.js',
  '/_next/static/chunks/app/page-client.js'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker installed');
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
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
  );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем non-GET запросы и external запросы
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/static/chunks/webpack')
  ) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Если в кэше - возвращаем
        if (response) {
          console.log('📋 Serving from cache:', request.url);
          return response;
        }

        // Если нет в кэше - делаем запрос
        return fetch(request)
          .then((response) => {
            // Проверяем что ответ успешный
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Кэшируем ответ
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                console.log('💾 Caching dynamic resource:', request.url);
                cache.put(request, responseClone);
              });

            return response;
          })
          .catch(() => {
            // Если ошибка сети - пробуем найти в кэше
            console.log('🔍 Network failed, trying cache...');
            return caches.match(request);
          });
      })
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
    // Получаем корзину из localStorage
    const cart = await getFromLocalStorage('cart');
    
    if (cart && cart.length > 0) {
      console.log('🛒 Syncing cart to server...');
      
      // Здесь логика синхронизации с сервером
      const response = await fetch('/api/sync-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cart })
      });
      
      if (response.ok) {
        console.log('✅ Cart synced successfully');
        await removeFromLocalStorage('cart');
        
        // Показываем уведомление
        self.registration.showNotification('Корзина синхронизирована', {
          body: `${cart.length} товаров добавлено в корзину`,
          icon: '/icon-192x192.png'
        });
      }
    }
  } catch (error) {
    console.error('❌ Cart sync failed:', error);
  }
}

async function syncOrders() {
  try {
    // Получаем ордера из localStorage
    const orders = await getFromLocalStorage('pending-orders');
    
    if (orders && orders.length > 0) {
      console.log('📦 Syncing orders to server...');
      
      for (const order of orders) {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(order)
        });
        
        if (response.ok) {
          console.log('✅ Order synced:', order.id);
        }
      }
      
      await removeFromLocalStorage('pending-orders');
      
      self.registration.showNotification('Заказы синхронизированы', {
        body: `${orders.length} заказов отправлено`,
        icon: '/icon-192x192.png'
      });
    }
  } catch (error) {
    console.error('❌ Orders sync failed:', error);
  }
}

// Вспомогательные функции для localStorage
async function getFromLocalStorage(key) {
  return new Promise((resolve) => {
    // В реальном приложении здесь будет логика работы с IndexedDB
    resolve(null);
  });
}

async function removeFromLocalStorage(key) {
  return new Promise((resolve) => {
    // В реальном приложении здесь будет логика работы с IndexedDB
    resolve();
  });
}

// Periodic background sync - реже
self.addEventListener('periodicsync', (event) => {
  console.log('⏰ Periodic sync triggered:', event.tag);
  
  if (event.tag === 'periodic-sync') {
    event.waitUntil(
      Promise.all([
        syncCart(),
        syncOrders(),
        updateCache()
      ])
    );
  }
});

// Обновление кэша - реже
async function updateCache() {
  try {
    console.log('🔄 Updating cache...');
    
    const cache = await caches.open(DYNAMIC_CACHE);
    const requests = await cache.keys();
    
    // Удаляем старые записи (старше 7 дней)
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    let deletedCount = 0;
    for (const request of requests) {
      const response = await cache.match(request);
      const date = response.headers.get('date');
      
      if (date && (now - new Date(date).getTime()) > sevenDays) {
        await cache.delete(request);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🗑️ Deleted ${deletedCount} old cache entries`);
    }
    
    console.log('✅ Cache updated');
  } catch (error) {
    console.error('❌ Cache update failed:', error);
  }
}

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  console.log('📨 Message received from client:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'SYNC_CART') {
    syncCart();
  }
  
  if (event.data && event.data.type === 'SYNC_ORDERS') {
    syncOrders();
  }
});

console.log('🚀 Service Worker loaded successfully!');
