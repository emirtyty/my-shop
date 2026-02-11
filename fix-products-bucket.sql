-- Создаем политики для бакета products если их нет

-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Allow image uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow image updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public image viewing" ON storage.objects;
DROP POLICY IF EXISTS "Allow image deletion" ON storage.objects;

-- Включаем RLS если выключен
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Создаем политики для бакета products
CREATE POLICY "Allow image uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'products'
);

CREATE POLICY "Allow image updates" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'products'
);

CREATE POLICY "Allow public image viewing" ON storage.objects
FOR SELECT USING (
  bucket_id = 'products'
);

-- Убедимся что бакет публичный
UPDATE storage.buckets 
SET public = true 
WHERE id = 'products';
