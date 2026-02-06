-- Создание таблицы stories, если она не существует
CREATE TABLE IF NOT EXISTS stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES product_market(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  discount INTEGER DEFAULT 0,
  description TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  view_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_stories_seller_id ON stories(seller_id);
CREATE INDEX IF NOT EXISTS idx_stories_product_id ON stories(product_id);
CREATE INDEX IF NOT EXISTS idx_stories_is_active ON stories(is_active);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at);

-- Включаем RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Политика для публичного чтения активных stories
DROP POLICY IF EXISTS "Enable read access for active stories" ON stories;
CREATE POLICY "Enable read access for active stories" ON stories
  FOR SELECT USING (is_active = true AND expires_at > NOW());

-- Политика для вставки (авторизованные пользователи)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON stories;
CREATE POLICY "Enable insert for authenticated users" ON stories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Политика для обновления (только свои stories)
DROP POLICY IF EXISTS "Enable update for own stories" ON stories;
CREATE POLICY "Enable update for own stories" ON stories
  FOR UPDATE USING (auth.uid() = seller_id);

-- Политика для удаления (только свои stories)
DROP POLICY IF EXISTS "Enable delete for own stories" ON stories;
CREATE POLICY "Enable delete for own stories" ON stories
  FOR DELETE USING (auth.uid() = seller_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_stories_updated_at ON stories;
CREATE TRIGGER update_stories_updated_at
    BEFORE UPDATE ON stories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
