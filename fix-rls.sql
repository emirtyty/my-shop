-- Создаем RLS политики для таблиц, чтобы разрешить публичный доступ на чтение

-- Политика для таблицы product_market
DROP POLICY IF EXISTS "Enable read access for all users" ON product_market;
CREATE POLICY "Enable read access for all users" ON product_market
  FOR SELECT USING (true);

-- Включаем RLS для product_market
ALTER TABLE product_market ENABLE ROW LEVEL SECURITY;

-- Политика для таблицы categories
DROP POLICY IF EXISTS "Enable read access for all users" ON categories;
CREATE POLICY "Enable read access for all users" ON categories
  FOR SELECT USING (true);

-- Включаем RLS для categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Политика для таблицы stories
DROP POLICY IF EXISTS "Enable read access for all users" ON stories;
CREATE POLICY "Enable read access for all users" ON stories
  FOR SELECT USING (true);

-- Включаем RLS для stories
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Политика для таблицы sellers (если нужно для связей)
DROP POLICY IF EXISTS "Enable read access for all users" ON sellers;
CREATE POLICY "Enable read access for all users" ON sellers
  FOR SELECT USING (true);

-- Включаем RLS для sellers
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
