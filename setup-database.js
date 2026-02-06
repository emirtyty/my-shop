const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют переменные окружения Supabase');
  console.log('Добавьте в .env.local:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🚀 Начинаю настройку базы данных...');

  try {
    // Проверяем подключение
    const { data, error } = await supabase.from('products').select('count');
    
    if (error && error.code === 'PGRST116') {
      console.log('📋 Таблица products не существует, создаю...');
      
      // Создаем таблицы через SQL
      const fs = require('fs');
      const path = require('path');
      const sqlFile = path.join(__dirname, 'create-tables.sql');
      const sql = fs.readFileSync(sqlFile, 'utf8');
      
      // Для выполнения SQL нужен service role ключ
      console.log('⚠️  Для выполнения SQL нужен service role ключ');
      console.log('📝 Выполните SQL из create-tables.sql в Supabase Dashboard:');
      console.log('   1. Откройте https://supabase.com/dashboard');
      console.log('   2. Выберите ваш проект');
      console.log('   3. Перейдите в SQL Editor');
      console.log('   4. Скопируйте и выполните SQL из файла create-tables.sql');
      
    } else if (error) {
      console.error('❌ Ошибка проверки таблиц:', error.message);
    } else {
      console.log('✅ Таблица products уже существует');
    }

    // Проверяем social_links
    const { data: socialData, error: socialError } = await supabase.from('social_links').select('count');
    
    if (socialError && socialError.code === 'PGRST116') {
      console.log('📋 Таблица social_links не существует');
    } else if (socialError) {
      console.error('❌ Ошибка проверки social_links:', socialError.message);
    } else {
      console.log('✅ Таблица social_links уже существует');
    }

  } catch (error) {
    console.error('❌ Ошибка настройки базы:', error.message);
  }
}

setupDatabase();
