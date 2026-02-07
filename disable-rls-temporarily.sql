-- Временно отключаем RLS для тестирования
ALTER TABLE product_market DISABLE ROW LEVEL SECURITY;

-- Проверяем что RLS отключен
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'product_market';
