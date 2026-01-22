-- Создание таблицы для Stories
CREATE TABLE stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_url TEXT NOT NULL,
    title VARCHAR(255),
    price DECIMAL(10, 2),
    discount INTEGER,
    product_id UUID REFERENCES product_market(id) ON DELETE CASCADE,
    link_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX idx_stories_expires_at ON stories(expires_at);
CREATE INDEX idx_stories_is_active ON stories(is_active);
CREATE INDEX idx_stories_created_at ON stories(created_at DESC);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stories_updated_at 
    BEFORE UPDATE ON stories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Комментарии
COMMENT ON TABLE stories IS 'Stories для товаров с автоматическим удалением через 24 часа';
COMMENT ON COLUMN stories.expires_at IS 'Время истечения Story (автоматически +24 часа)';
COMMENT ON COLUMN stories.link_url IS 'Ссылка для кнопки "Купить" или товар';
COMMENT ON COLUMN stories.is_active IS 'Активность Story (вкл/выкл)';
