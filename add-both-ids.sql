-- Добавляем обе колонки seller_id и user_id в таблицу product_market
ALTER TABLE product_market 
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE product_market 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
