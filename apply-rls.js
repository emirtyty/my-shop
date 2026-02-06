// Скрипт для применения RLS политик к Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vklustrbpajwfuoldnxu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbHVzdHJicGFqd2Z1b2xkbnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk1NTgsImV4cCI6MjA4NDEzNTU1OH0.w7m-F-bHewTw9PnRpo1VICCIrDyefxHhn4yW2uJ9wIU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyRLSPolicies() {
  try {
    console.log('🔧 Применяем RLS политики для публичного доступа...');

    // Политика для product_market
    console.log('📦 Настраиваем product_market...');
    const { error: productError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Enable read access for all users" ON product_market;
        CREATE POLICY "Enable read access for all users" ON product_market
          FOR SELECT USING (true);
        ALTER TABLE product_market ENABLE ROW LEVEL SECURITY;
      `
    });

    if (productError) {
      console.error('❌ Ошибка product_market:', productError);
    } else {
      console.log('✅ product_market настроен');
    }

    // Политика для categories
    console.log('📂 Настраиваем categories...');
    const { error: categoriesError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Enable read access for all users" ON categories;
        CREATE POLICY "Enable read access for all users" ON categories
          FOR SELECT USING (true);
        ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
      `
    });

    if (categoriesError) {
      console.error('❌ Ошибка categories:', categoriesError);
    } else {
      console.log('✅ categories настроен');
    }

    // Политика для stories
    console.log('📖 Настраиваем stories...');
    const { error: storiesError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Enable read access for all users" ON stories;
        CREATE POLICY "Enable read access for all users" ON stories
          FOR SELECT USING (true);
        ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
      `
    });

    if (storiesError) {
      console.error('❌ Ошибка stories:', storiesError);
    } else {
      console.log('✅ stories настроен');
    }

    console.log('🎉 RLS политики применены!');
    
    // Тестируем доступ
    console.log('🧪 Тестируем доступ...');
    const { data: testData, error: testError } = await supabase
      .from('product_market')
      .select('count', { count: 'exact' });
    
    if (testError) {
      console.error('❌ Тест не пройден:', testError);
    } else {
      console.log(`✅ Тест пройден! Товаров доступно: ${testData[0]?.count || 0}`);
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

applyRLSPolicies();
