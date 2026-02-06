// Диагностика проблем с доступом к Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vklustrbpajwfuoldnxu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbHVzdHJicGFqd2Z1b2xkbnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk1NTgsImV4cCI6MjA4NDEzNTU1OH0.w7m-F-bHewTw9PnRpo1VICCIrDyefxHhn4yW2uJ9wIU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAccess() {
  try {
    console.log('🔍 Диагностика доступа к Supabase...');
    console.log(`🔗 URL: ${supabaseUrl}`);
    console.log(`🔑 Key: ${supabaseKey.substring(0, 20)}...`);
    
    // Проверяем доступ к product_market
    console.log('\n📦 Проверка product_market:');
    const { data: products, error: productsError } = await supabase
      .from('product_market')
      .select('*')
      .limit(1);
    
    if (productsError) {
      console.error('❌ Ошибка product_market:', productsError);
      console.error('Код ошибки:', productsError.code);
      console.error('Сообщение:', productsError.message);
      console.error('Детали:', productsError.details);
    } else {
      console.log('✅ product_market доступен');
      console.log('Данные:', products);
    }
    
    // Проверяем доступ к categories
    console.log('\n📂 Проверка categories:');
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .limit(1);
    
    if (categoriesError) {
      console.error('❌ Ошибка categories:', categoriesError);
      console.error('Код ошибки:', categoriesError.code);
      console.error('Сообщение:', categoriesError.message);
      console.error('Детали:', categoriesError.details);
    } else {
      console.log('✅ categories доступен');
      console.log('Данные:', categories);
    }
    
    // Проверяем доступ к sellers
    console.log('\n👤 Проверка sellers:');
    const { data: sellers, error: sellersError } = await supabase
      .from('sellers')
      .select('*')
      .limit(1);
    
    if (sellersError) {
      console.error('❌ Ошибка sellers:', sellersError);
      console.error('Код ошибки:', sellersError.code);
      console.error('Сообщение:', sellersError.message);
      console.error('Детали:', sellersError.details);
    } else {
      console.log('✅ sellers доступен');
      console.log('Данные:', sellers);
    }
    
    // Проверяем соединение с sellers
    console.log('\n🔗 Проверка связи product_market -> sellers:');
    const { data: joinedData, error: joinError } = await supabase
      .from('product_market')
      .select('*, sellers(shop_name, id)')
      .limit(1);
    
    if (joinError) {
      console.error('❌ Ошибка связи с sellers:', joinError);
      console.error('Код ошибки:', joinError.code);
      console.error('Сообщение:', joinError.message);
      console.error('Детали:', joinError.details);
    } else {
      console.log('✅ Связь с sellers работает');
      console.log('Данные:', joinedData);
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

debugAccess();
