-- Проверяем структуру таблицы product_market
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'product_market' 
AND table_schema = 'public' 
ORDER BY ordinal_position;

-- Показываем пример данных из product_market
SELECT * FROM product_market LIMIT 3;
