-- Создаем правильные RLS политики для таблицы product_market

-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON product_market;
DROP POLICY IF EXISTS "Enable select for all users" ON product_market;
DROP POLICY IF EXISTS "Enable update for owner" ON product_market;
DROP POLICY IF EXISTS "Enable delete for owner" ON product_market;

-- Включаем RLS
ALTER TABLE product_market ENABLE ROW LEVEL SECURITY;

-- Создаем политики для всех пользователей (публичный доступ на чтение)
CREATE POLICY "Enable select for all users" ON product_market
    FOR SELECT USING (true);

-- Создаем политики для вставки (только аутентифицированные)
CREATE POLICY "Enable insert for authenticated users" ON product_market
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Создаем политики для обновления (только владелец)
CREATE POLICY "Enable update for owner" ON product_market
    FOR UPDATE USING (auth.uid() = user_id);

-- Создаем политики для удаления (только владелец)
CREATE POLICY "Enable delete for owner" ON product_market
    FOR DELETE USING (auth.uid() = user_id);
