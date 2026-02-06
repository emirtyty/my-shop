// Проверяем ссылки в базе данных
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vklustrbpajwfuoldnxu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbHVzdHJicGFqd2Z1b2xkbnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk1NTgsImV4cCI6MjA4NDEzNTU1OH0.w7m-F-bHewTw9PnRpo1VICCIrDyefxHhn4yW2uJ9wIU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLinks() {
  try {
    console.log('🔍 Проверяем ссылки в базе данных...');
    
    // Получаем товары с продавцами
    const { data: products, error } = await supabase
      .from('product_market')
      .select('id, name, sellers(*)');
    
    if (error) {
      console.error('❌ Ошибка:', error);
      return;
    }
    
    console.log(`📦 Найдено товаров: ${products.length}`);
    
    products.forEach((product, index) => {
      console.log(`\n${index + 1}. Товар: ${product.name}`);
      console.log(`   ID: ${product.id}`);
      
      if (product.sellers) {
        console.log('   Продавец:');
        console.log(`   - shop_name: ${product.sellers.shop_name}`);
        console.log(`   - telegram_url: ${product.sellers.telegram_url || 'не указано'}`);
        console.log(`   - vk_url: ${product.sellers.vk_url || 'не указано'}`);
        console.log(`   - whatsapp_url: ${product.sellers.whatsapp_url || 'не указано'}`);
        console.log(`   - instagram_url: ${product.sellers.instagram_url || 'не указано'}`);
        console.log(`   - phone: ${product.sellers.phone || 'не указано'}`);
        
        // Проверяем валидность URL
        const urls = [
          product.sellers.telegram_url,
          product.sellers.vk_url,
          product.sellers.whatsapp_url,
          product.sellers.instagram_url
        ].filter(url => url);
        
        urls.forEach(url => {
          try {
            new URL(url);
            console.log(`   ✅ ${url} - валидный URL`);
          } catch {
            console.log(`   ❌ ${url} - невалидный URL`);
          }
        });
      } else {
        console.log('   ❌ Нет данных о продавце');
      }
    });
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

debugLinks();
