-- Сначала проверяем и добавляем недостающие колонки

-- Для таблицы products
DO $$
BEGIN
    -- Проверяем существование колонки user_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE products ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Колонка user_id добавлена в таблицу products';
    END IF;
END $$;

-- Для таблицы social_links
DO $$
BEGIN
    -- Проверяем существование таблицы social_links
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'social_links'
    ) THEN
        CREATE TABLE social_links (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
            whatsapp TEXT,
            telegram TEXT,
            vk TEXT,
            instagram TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Таблица social_links создана';
    END IF;
    
    -- Проверяем существование колонки user_id в social_links
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'social_links' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE social_links ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE;
        RAISE NOTICE 'Колонка user_id добавлена в таблицу social_links';
    END IF;
END $$;

-- Теперь создаем политики RLS
-- Отключаем RLS временно
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE social_links DISABLE ROW LEVEL SECURITY;

-- Включаем RLS обратно
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON products;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON products;

DROP POLICY IF EXISTS "Enable read access for all users" ON social_links;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON social_links;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON social_links;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON social_links;

-- Создаем правильные политики
CREATE POLICY "Enable read access for all users" ON products
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on user_id" ON products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" ON products
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Enable read access for all users" ON social_links
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON social_links
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on user_id" ON social_links
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" ON social_links
  FOR DELETE USING (auth.uid() = user_id);
