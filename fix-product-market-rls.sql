-- Настройка RLS политик для таблицы product_market

-- Включаем RLS для product_market
ALTER TABLE product_market ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если они есть
DROP POLICY IF EXISTS "Enable read access for all users" ON product_market;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON product_market;
DROP POLICY IF EXISTS "Enable update for users based on seller_id" ON product_market;
DROP POLICY IF EXISTS "Enable delete for users based on seller_id" ON product_market;

-- Создаем правильные политики для product_market
CREATE POLICY "Enable read access for all users" ON product_market
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON product_market
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on seller_id" ON product_market
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Enable delete for users based on seller_id" ON product_market
  FOR DELETE USING (auth.uid() = seller_id);
