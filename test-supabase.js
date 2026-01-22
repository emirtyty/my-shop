// Тест подключения к Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vklustrbpajwfuoldnxu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbHVzdHJicGFqd2Z1b2xkbnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk1NTgsImV4cCI6MjA4NDEzNTU1OH0.w7m-F-bHewTw9PnRpo1VICCIrDyefxHhn4yW2uJ9wIU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔄 Тест подключения к Supabase...');
  console.log('🌐 URL:', supabaseUrl);
  
  try {
    // Тест 1: Проверка соединения
    const { data, error } = await supabase
      .from('sellers')
      .select('id, login, shop_name')
      .limit(1);
    
    if (error) {
      console.error('❌ Ошибка подключения:', error);
      return false;
    }
    
    console.log('✅ Подключение успешно');
    console.log('📊 Данные:', data);
    
    // Тест 2: Проверка таблицы product_market
    const { data: products, error: productError } = await supabase
      .from('product_market')
      .select('id, name')
      .limit(3);
    
    if (productError) {
      console.error('❌ Ошибка загрузки товаров:', productError);
    } else {
      console.log('✅ Товары:', products);
    }
    
    return true;
  } catch (err) {
    console.error('❌ Критическая ошибка:', err);
    return false;
  }
}

testConnection();
