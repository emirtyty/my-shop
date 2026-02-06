-- Добавляем колонку user_id в существующие таблицы

-- Для таблицы products (если колонки нет)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Для таблицы social_links (если колонки нет)
ALTER TABLE social_links 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Создаем уникальный индекс для social_links.user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_links_user_id_unique ON social_links(user_id);

-- Обновляем существующие записи (если user_id NULL)
UPDATE products SET user_id = auth.uid() WHERE user_id IS NULL;
UPDATE social_links SET user_id = auth.uid() WHERE user_id IS NULL;
