-- Проверяем настройки таблицы для API доступа
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'product_market';

-- Проверяем RLS статус
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  forcerlspolicy
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'product_market';

-- Показываем все политики для product_market
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'product_market';
