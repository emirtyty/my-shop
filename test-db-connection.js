// Тест подключения к Supabase
import { createClient } from '@supabase/supabase-js';

// Используем те же данные, что и в supabase.ts
const supabaseUrl = 'https://vklustrbpajwfuoldnxu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbHVzdHJicGFqd2Z1b2xkbnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk1NTgsImV4cCI6MjA4NDEzNTU1OH0.w7m-F-bHewTw9PnRpo1VICCIrDyefxHhn4yW2uJ9wIU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔍 Тест подключения к Supabase...');
    console.log(`🔗 URL: ${supabaseUrl}`);
    
    // Проверяем таблицу product_market
    const { data: products, error: productsError } = await supabase
      .from('product_market')
      .select('count', { count: 'exact' });
    
    if (productsError) {
      console.error('❌ Ошибка product_market:', productsError);
      return;
    }
    
    console.log(`✅ Товары в базе: ${products[0]?.count || 0}`);
    
    // Проверяем таблицу categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('count', { count: 'exact' });
    
    if (categoriesError) {
      console.error('❌ Ошибка categories:', categoriesError);
      return;
    }
    
    console.log(`✅ Категорий в базе: ${categories[0]?.count || 0}`);
    
    // Проверяем таблицу stories
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select('count', { count: 'exact' });
    
    if (storiesError) {
      console.error('❌ Ошибка stories:', storiesError);
      return;
    }
    
    console.log(`️ Историй в базе: ${stories[0]?.count || 0}`);
    
    // Если есть товары, получаем несколько для примера
    if (products[0]?.count > 0) {
      const { data: sampleProducts, error: sampleError } = await supabase
        .from('product_market')
        .select('*, sellers(shop_name, id, telegram_url, vk_url, whatsapp_url, instagram_url)')
        .limit(3);
      
      if (sampleError) {
        console.error('❌ Ошибка выборки товаров:', sampleError);
      } else {
        console.log('📦 Пример товаров:');
        sampleProducts.forEach((product, index) => {
          console.log(`  ${index + 1}. ${product.name} - ${product.price}₽`);
          console.log(`     Продавец: ${product.sellers?.shop_name || 'Не указано'}`);
        });
      }
    }
    
    console.log('✅ Подключение к Supabase работает корректно!');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

testConnection();
