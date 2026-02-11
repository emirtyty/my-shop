-- Добавляем недостающие колонки в таблицу product_market

-- Проверяем и добавляем колонку category если её нет
DO $$
BEGIN
    -- Добавляем колонку category
    ALTER TABLE product_market 
    ADD COLUMN IF NOT EXISTS category TEXT;
    
    -- Добавляем колонку discount если её нет  
    ALTER TABLE product_market 
    ADD COLUMN IF NOT EXISTS discount DECIMAL(5,2) DEFAULT 0;
    
    -- Добавляем колонку description если её нет
    ALTER TABLE product_market 
    ADD COLUMN IF NOT EXISTS description TEXT;
    
    -- Добавляем колонку stock если её нет
    ALTER TABLE product_market 
    ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
    
    -- Добавляем колонку image_url если её нет
    ALTER TABLE product_market 
    ADD COLUMN IF NOT EXISTS image_url TEXT;
    
    -- Добавляем колонку user_id если её нет
    ALTER TABLE product_market 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Добавляем колонку seller_id если её нет (для совместимости)
    ALTER TABLE product_market 
    ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Добавляем колонку created_at если её нет
    ALTER TABLE product_market 
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION
    WHEN duplicate_column THEN
        -- Колонка уже существует, это нормально
        NULL;
END $$;

-- Создаем индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_product_market_category ON product_market(category);
CREATE INDEX IF NOT EXISTS idx_product_market_user_id ON product_market(user_id);
CREATE INDEX IF NOT EXISTS idx_product_market_seller_id ON product_market(seller_id);
CREATE INDEX IF NOT EXISTS idx_product_market_created_at ON product_market(created_at);
