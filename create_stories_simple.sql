-- Создание таблицы Stories (упрощенная версия)
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

-- Базовая RLS политика (без связи с products)
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view active stories" ON stories FOR SELECT USING (is_active = true);
CREATE POLICY "Users can create stories" ON stories FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Комментарии
COMMENT ON TABLE stories IS 'Stories для товаров с автоматическим удалением через 24 часа';
