-- Создаем RLS политики для таблиц, чтобы разрешить публичный доступ на чтение

-- Политика для таблицы products
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
CREATE POLICY "Enable read access for all users" ON products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON products;
CREATE POLICY "Enable insert for authenticated users" ON products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for users based on user_id" ON products;
CREATE POLICY "Enable update for users based on user_id" ON products
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON products;
CREATE POLICY "Enable delete for users based on user_id" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- Включаем RLS для products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Политика для таблицы social_links
DROP POLICY IF EXISTS "Enable read access for all users" ON social_links;
CREATE POLICY "Enable read access for all users" ON social_links
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON social_links;
CREATE POLICY "Enable insert for authenticated users" ON social_links
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for users based on user_id" ON social_links;
CREATE POLICY "Enable update for users based on user_id" ON social_links
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON social_links;
CREATE POLICY "Enable delete for users based on user_id" ON social_links
  FOR DELETE USING (auth.uid() = user_id);

-- Включаем RLS для social_links
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;

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
