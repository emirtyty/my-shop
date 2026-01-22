-- Добавление колонок для контактов продавца в таблицу product_market
ALTER TABLE product_market 
ADD COLUMN contact_type VARCHAR(20) DEFAULT 'telegram',
ADD COLUMN contact_value VARCHAR(255);

-- Добавление индексов для оптимизации
CREATE INDEX idx_product_market_contact_type ON product_market(contact_type);
CREATE INDEX idx_product_market_contact_value ON product_market(contact_value);

-- Комментарии для документации
COMMENT ON COLUMN product_market.contact_type IS 'Тип контакта: telegram, whatsapp, phone';
COMMENT ON COLUMN product_market.contact_value IS 'Значение контакта: @username, номер телефона и т.д.';
