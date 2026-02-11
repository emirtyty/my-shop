-- Полностью отключаем RLS для storage объектов
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Убедимся что бакет products публичный
UPDATE storage.buckets 
SET public = true 
WHERE id = 'products';
