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
