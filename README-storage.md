# Настройка хранилища изображений в Supabase

## Проблема
Ошибка "bucket not found" возникает когда в Supabase не создан бакет для хранения изображений товаров.

## Решение 1: Создание бакета через SQL

Выполните следующий SQL код в Supabase Dashboard → SQL Editor:

```sql
-- Создание бакета для изображений товаров
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products', 
  'products', 
  true, 
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Включение публичного доступа к бакету
CREATE POLICY "Public Access" ON storage.objects
FOR ALL USING (bucket_id = 'products');

-- Разрешение на загрузку файлов
CREATE POLICY "Users can upload images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'products');

-- Разрешение на обновление файлов
CREATE POLICY "Users can update images" ON storage.objects
FOR UPDATE USING (bucket_id = 'products');

-- Разрешение на чтение файлов
CREATE POLICY "Anyone can view images" ON storage.objects
FOR SELECT USING (bucket_id = 'products');
```

## Решение 2: Создание бакета через интерфейс

1. Зайдите в Supabase Dashboard
2. Перейдите в раздел "Storage"
3. Нажмите "Create bucket"
4. Введите имя бакета: `products`
5. Установите "Public bucket"
6. Ограничение размера файла: 5MB
7. Разрешенные типы файлов: image/jpeg, image/png, image/gif, image/webp

## Решение 3: Альтернативный бакет

Если первый бакет не работает, создайте бакет с именем `product-images` и обновите код.

## Fallback в коде

Приложение автоматически пробует несколько вариантов:
1. Сначала пробует бакет `products`
2. Если не найден, пробует `product-images`
3. Если оба не найдены, добавляет товар без изображения с предупреждением

## Проверка

После создания бакета:
1. Перезагрузите приложение
2. Попробуйте добавить товар с изображением
3. Проверьте что изображение загрузилось и отображается

## Ошибки

- **"bucket not found"** - бакет не существует
- **"permission denied"** - нет прав на загрузку файлов
- **"file too large"** - размер файла превышает лимит

В случае ошибок проверьте:
1. Правильность имени бакета
2. Настройки политик доступа (RLS)
3. Лимит размера файлов
