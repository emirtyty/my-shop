-- Проверяем настройки API доступа
-- 1. Проверяем что таблица в правильной схеме
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'product_market';

-- 2. Проверяем привилегии для anon роли
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'product_market' 
AND table_schema = 'public';

-- 3. Прямой тест запроса
SELECT COUNT(*) as total_products FROM product_market;
