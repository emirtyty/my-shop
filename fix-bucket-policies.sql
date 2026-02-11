-- Проверяем существующие политики и создаем недостающие для бакета product-images

-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Allow image uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow image updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public image viewing" ON storage.objects;
DROP POLICY IF EXISTS "Allow image deletion" ON storage.objects;

-- Создаем правильные политики для бакета product-images
CREATE POLICY "Allow image uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images'
);

CREATE POLICY "Allow image updates" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'product-images'
);

CREATE POLICY "Allow public image viewing" ON storage.objects
FOR SELECT USING (
  bucket_id = 'product-images'
);

CREATE POLICY "Allow image deletion" ON storage.objects
FOR DELETE USING (
  bucket_id = 'product-images'
);

-- Убедимся что бакет публичный
UPDATE storage.buckets 
SET public = true 
WHERE id = 'product-images';
