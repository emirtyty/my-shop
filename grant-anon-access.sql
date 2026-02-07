-- Даем права на чтение для anon и authenticated ролей
GRANT SELECT ON public.product_market TO anon;
GRANT SELECT ON public.product_market TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Проверяем привилегии после назначения
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'product_market' 
AND table_schema = 'public';
