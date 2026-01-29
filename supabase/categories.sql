-- Создание таблицы категорий
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(10) NOT NULL DEFAULT '📦',
  color VARCHAR(50) NOT NULL DEFAULT 'from-gray-400 to-gray-600',
  count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Создание триггера для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Политика безопасности (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Политика для чтения категорий (все могут читать)
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (is_active = true);

-- Политика для управления категориями (только админы)
CREATE POLICY "Only admins can manage categories" ON categories
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Вставка категорий по умолчанию
INSERT INTO categories (name, icon, color, sort_order, count) VALUES
('Смартфоны', '📱', 'from-blue-400 to-blue-600', 1, 156),
('Ноутбуки', '💻', 'from-purple-400 to-purple-600', 2, 89),
('Планшеты', '📋', 'from-green-400 to-green-600', 3, 67),
('Телевизоры', '📺', 'from-red-400 to-red-600', 4, 45),
('Наушники', '🎧', 'from-indigo-400 to-indigo-600', 5, 234),
('Часы', '⌚', 'from-pink-400 to-pink-600', 6, 78),
('Фотоаппараты', '📷', 'from-yellow-400 to-yellow-600', 7, 34),
('Игровые консоли', '🎮', 'from-orange-400 to-orange-600', 8, 56),
('Мужская одежда', '👔', 'from-gray-600 to-gray-800', 9, 189),
('Женская одежда', '👗', 'from-rose-400 to-rose-600', 10, 267),
('Детская одежда', '👶', 'from-cyan-400 to-cyan-600', 11, 145),
('Обувь', '👟', 'from-amber-400 to-amber-600', 12, 198),
('Сумки и аксессуары', '👜', 'from-teal-400 to-teal-600', 13, 123),
('Украшения', '💍', 'from-violet-400 to-violet-600', 14, 89),
('Мебель', '🪑', 'from-brown-400 to-brown-600', 15, 67),
('Кухня', '🍳', 'from-lime-400 to-lime-600', 16, 234),
('Спорт', '⚽', 'from-emerald-400 to-emerald-600', 17, 156),
('Красота', '💄', 'from-fuchsia-400 to-fuchsia-600', 18, 178),
('Автотовары', '🚗', 'from-slate-400 to-slate-600', 19, 92),
('Книги', '📚', 'from-stone-400 to-stone-600', 20, 445),
('Домашние животные', '🐾', 'from-zinc-400 to-zinc-600', 21, 167),
('Сад', '🌱', 'from-green-500 to-green-700', 22, 78),
('Инструменты', '🔧', 'from-gray-500 to-gray-700', 23, 134),
('Продукты', '🍎', 'from-red-500 to-red-700', 24, 0)
ON CONFLICT (name) DO NOTHING;

-- Обновление таблицы продуктов для связи с категориями
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id),
ADD COLUMN IF NOT EXISTS category_name VARCHAR(100);

-- Создание индекса для связи продуктов с категориями
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_category_name ON products(category_name);

-- Функция для обновления счетчика товаров в категории
CREATE OR REPLACE FUNCTION update_category_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE categories 
        SET count = (
            SELECT COUNT(*) 
            FROM products 
            WHERE category_id = NEW.category_id OR category_name = NEW.category_name
        )
        WHERE id = NEW.category_id OR name = NEW.category_name;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE categories 
        SET count = (
            SELECT COUNT(*) 
            FROM products 
            WHERE category_id = OLD.category_id OR category_name = OLD.category_name
        )
        WHERE id = OLD.category_id OR name = OLD.category_name;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления счетчиков
CREATE TRIGGER update_category_count_on_insert
    AFTER INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_category_count();

CREATE TRIGGER update_category_count_on_update
    AFTER UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_category_count();

CREATE TRIGGER update_category_count_on_delete
    AFTER DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_category_count();
