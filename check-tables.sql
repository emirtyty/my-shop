-- Проверяем существующие таблицы
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Проверяем структуру таблицы products (если существует)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND table_schema = 'public' 
ORDER BY ordinal_position;

-- Проверяем количество записей в таблицах
SELECT 
  'products' as table_name,
  COUNT(*) as record_count
FROM products
UNION ALL
SELECT 
  'product_market' as table_name,
  COUNT(*) as record_count
FROM product_market
UNION ALL
SELECT 
  'social_links' as table_name,
  COUNT(*) as record_count
FROM social_links;
