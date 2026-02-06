# Android API Интеграция

## 📱 Обзор

Android приложение теперь интегрировано с API маркетплейса и может загружать реальные данные с Supabase через Netlify API.

## 🌐 API Эндпоинты

**Базовый URL:** `https://peterka.netlify.app/api`

### Доступные эндпоинты:
- `GET /health` - Проверка работы API
- `GET /products` - Все товары
- `GET /search?q=запрос` - Поиск товаров
- `GET /stories` - Истории
- `GET /sellers` - Продавцы

## 🔧 Компоненты

### 1. ApiService.java
Основной класс для работы с API:
- HTTP запросы к серверу
- Парсинг JSON ответов
- Модели данных (Product, Story, Seller)
- Callback интерфейсы для асинхронных операций

### 2. MainActivity.java
Главная активность с тестированием API:
- Проверка здоровья API при запуске
- Загрузка товаров, историй, продавцов
- Логирование результатов в LogCat

### 3. ProductsActivity.java
Активность для отображения списка товаров:
- RecyclerView с адаптером
- Обработчик кликов на товары
- Показ детальной информации

### 4. ProductAdapter.java
Адаптер для RecyclerView:
- Отображение товаров в списке
- Форматирование цен и скидок
- Обработчик нажатий

## 📋 Использование

### Базовое использование:
```java
// Создаем API сервис
ApiService apiService = new ApiService();

// Загружаем товары
apiService.getProducts(new ApiService.ApiCallback<List<ApiService.Product>>() {
    @Override
    public void onSuccess(List<ApiService.Product> products) {
        // Обрабатываем успешную загрузку
        for (ApiService.Product product : products) {
            Log.d("Products", product.name + ": " + product.price);
        }
    }
    
    @Override
    public void onError(String error) {
        // Обрабатываем ошибку
        Log.e("Products", "Error: " + error);
    }
});
```

### Поиск товаров:
```java
apiService.searchProducts("iPhone", new ApiService.ApiCallback<List<ApiService.Product>>() {
    @Override
    public void onSuccess(List<ApiService.Product> results) {
        // Результаты поиска
    }
    
    @Override
    public void onError(String error) {
        // Ошибка поиска
    }
});
```

## 📊 Модели данных

### Product:
```java
public class Product {
    public String id;           // ID товара
    public String name;         // Название
    public String image_url;    // URL изображения
    public double price;         // Цена
    public Integer discount;    // Скидка в %
    public String category;     // Категория
    public Integer stock_quantity; // Количество на складе
    public String description;  // Описание
    public String seller_id;    // ID продавца
}
```

### Story:
```java
public class Story {
    public String id;           // ID истории
    public String title;        // Заголовок
    public String image_url;    // URL изображения
    public String link;         // Ссылка
    public String seller_id;    // ID продавца
    public String created_at;   // Дата создания
}
```

### Seller:
```java
public class Seller {
    public String id;           // ID продавца
    public String name;         // Название
    public String avatar_url;   // URL аватара
    public String telegram_url; // Telegram
    public String vk_url;       // VK
    public String whatsapp_url; // WhatsApp
    public String instagram_url; // Instagram
}
```

## 🔍 Логирование

Приложение логирует все операции API:
- `MainActivity` - основная загрузка данных
- `ApiService` - HTTP запросы и ответы
- `ProductsActivity` - операции с товарами

**Фильтры LogCat:**
- `MainActivity` - основная активность
- `ApiService` - API операции
- `ProductsActivity` - товары

## 🚀 Сборка и запуск

### Требования:
- Android Studio
- Min SDK: 21 (Android 5.0)
- Target SDK: 34 (Android 14)

### Сборка:
```bash
# Из корневой папки проекта
npm run build:android

# Или через Capacitor
npx cap sync
npx cap open android
```

### Запуск:
1. Откройте проект в Android Studio
2. Выберите устройство или эмулятор
3. Нажмите Run

## 📱 Тестирование

### Проверка API:
При запуске приложения проверьте LogCat:
```
D/MainActivity: Testing API connection...
D/MainActivity: API Health Check: API работает нормально
D/MainActivity: Products loaded successfully: 4 items
```

### Тестирование функций:
- **Товары:** Откройте ProductsActivity
- **Поиск:** Используйте метод searchProducts()
- **Истории:** Проверьте метод getStories()
- **Продавцы:** Проверьте метод getSellers()

## 🔧 Настройки

### Изменение API URL:
В `ApiService.java` измените:
```java
private static final String BASE_URL = "https://your-domain.com/api";
```

### Таймауты:
```java
connection.setConnectTimeout(10000); // 10 секунд
connection.setReadTimeout(10000);    // 10 секунд
```

## 🚨 Обработка ошибок

API обрабатывает следующие ошибки:
- Отсутствие интернет соединения
- Таймауты запросов
- Неверные ответы сервера
- Ошибки парсинга JSON

Все ошибки логируются и передаются в callback onError().

## 📈 Оптимизации

### Кэширование:
Можно добавить кэширование ответов для улучшения производительности.

### Изображения:
Для загрузки изображений рекомендуется использовать Picasso или Glide:
```gradle
implementation 'com.squareup.picasso:picasso:2.8'
```

### Пагинация:
Для большого количества товаров можно добавить пагинацию в API.

## 🔒 Безопасность

- Все запросы через HTTPS
- CORS настроен на сервере
- Нет хранения чувствительных данных в приложении

## 📞 Поддержка

При проблемах с API:
1. Проверьте интернет соединение
2. Посмотрите LogCat
3. Проверьте доступность https://peterka.netlify.app/api/health
