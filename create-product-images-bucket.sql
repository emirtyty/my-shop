-- Создание бакета product-images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 
  'product-images', 
  true, 
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- Включение RLS для storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Создание политик доступа
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

-- Установка публичного доступа
UPDATE storage.buckets 
SET public = true 
WHERE id = 'product-images';
