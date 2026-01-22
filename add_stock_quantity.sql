-- Добавление поля stock_quantity в таблицу product_market
ALTER TABLE product_market 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;

-- Обновление существующих записей со значением по умолчанию
UPDATE product_market 
SET stock_quantity = 10 
WHERE stock_quantity IS NULL;

-- Создание индекса для оптимизации запросов по остаткам
CREATE INDEX IF NOT EXISTS idx_product_market_stock_quantity 
ON product_market(stock_quantity);
