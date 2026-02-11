-- Исправление прав доступа к бакету product-images

-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;

-- Создаем правильные политики для бакета product-images
CREATE POLICY "Allow image uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images' AND 
  (storage.foldername(name))[1] = 'product-images'
);

CREATE POLICY "Allow image updates" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'product-images' AND 
  (storage.foldername(name))[1] = 'product-images'
);

CREATE POLICY "Allow public image viewing" ON storage.objects
FOR SELECT USING (
  bucket_id = 'product-images'
);

-- Включаем RLS для storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Даем публичный доступ к бакету
UPDATE storage.buckets 
SET public = true 
WHERE name = 'product-images';
