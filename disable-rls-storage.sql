-- Временно отключаем RLS для storage чтобы бакет был доступен
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Убедимся что бакет публичный
UPDATE storage.buckets 
SET public = true 
WHERE id = 'product-images';
