-- Добавление колонки количества товара в таблицу product_market
ALTER TABLE product_market 
ADD COLUMN stock_quantity INTEGER DEFAULT 0;

-- Опционально: добавим комментарий для документации
COMMENT ON COLUMN product_market.stock_quantity IS 'Количество товара на складе';
