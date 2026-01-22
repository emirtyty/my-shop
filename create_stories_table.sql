-- Создание таблицы Stories для маркетплейса
CREATE TABLE stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES product_market(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  price INTEGER,
  discount INTEGER,
  description TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  view_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации
CREATE INDEX idx_stories_active ON stories(is_active, expires_at);
CREATE INDEX idx_stories_product ON stories(product_id);
CREATE INDEX idx_stories_created ON stories(created_at DESC);

-- RLS политики для безопасности
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view active stories" ON stories FOR SELECT USING (is_active = true);
CREATE POLICY "Users can create stories" ON stories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own stories" ON stories FOR UPDATE USING (auth.uid() IN (SELECT seller_id FROM product_market WHERE id = product_id));
CREATE POLICY "Users can delete own stories" ON stories FOR DELETE USING (auth.uid() IN (SELECT seller_id FROM product_market WHERE id = product_id));
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
