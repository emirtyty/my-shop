-- Простое исправление RLS для product_market

-- Сначала отключаем RLS
ALTER TABLE product_market DISABLE ROW LEVEL SECURITY;

-- Затем включаем RLS
ALTER TABLE product_market ENABLE ROW LEVEL SECURITY;

-- Создаем простую политику для чтения
DROP POLICY IF EXISTS "Public read access" ON product_market;
CREATE POLICY "Public read access" ON product_market
  FOR SELECT USING (true);

-- Политика для вставки (только для авторизованных)
DROP POLICY IF EXISTS "Authenticated insert" ON product_market;
CREATE POLICY "Authenticated insert" ON product_market
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Политика для обновления (все могут обновлять)
DROP POLICY IF EXISTS "All update" ON product_market;
CREATE POLICY "All update" ON product_market
  FOR UPDATE USING (true);

-- Политика для удаления (все могут удалять)
DROP POLICY IF EXISTS "All delete" ON product_market;
CREATE POLICY "All delete" ON product_market
  FOR DELETE USING (true);
