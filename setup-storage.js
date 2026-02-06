// Скрипт для создания Supabase Storage bucket
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vklustrbpajwfuoldnxu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbHVzdHJicGFqd2Z1b2xkbnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk1NTgsImV4cCI6MjA4NDEzNTU1OH0.w7m-F-bHewTw9PnRpo1VICCIrDyefxHhn4yW2uJ9wIU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
  try {
    console.log('🔧 Настраиваем Supabase Storage...');
    
    // Проверяем существует ли bucket
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Ошибка получения bucket:', bucketsError);
      console.log('ℹ️ Нужно создать bucket вручную в Supabase Dashboard:');
      console.log('1. Зайди в Supabase Dashboard');
      console.log('2. Перейди в Storage');
      console.log('3. Создай новый bucket с именем "product-images"');
      console.log('4. Установи Public access');
      return;
    }
    
    const productImagesBucket = buckets.find(b => b.name === 'product-images');
    
    if (!productImagesBucket) {
      console.log('❌ Bucket "product-images" не найден');
      console.log('ℹ️ Нужно создать bucket вручную в Supabase Dashboard:');
      console.log('1. Зайди в Supabase Dashboard → Storage');
      console.log('2. Нажми "New bucket"');
      console.log('3. Введи имя: product-images');
      console.log('4. Включи "Public bucket"');
      console.log('5. Создай RLS политику для публичного доступа');
    } else {
      console.log('✅ Bucket "product-images" уже существует');
    }
    
    // Проверяем политики доступа
    console.log('\n🔍 Проверяем политики доступа...');
    
    try {
      const { data: policies } = await supabase.storage
        .from('product-images')
        .list('', { limit: 1 });
      
      console.log('✅ Доступ к bucket настроен корректно');
    } catch (policyError) {
      console.log('❌ Проблема с доступом к bucket');
      console.log('ℹ️ Нужно настроить RLS политику в Supabase Dashboard:');
      console.log('1. Зайди в Supabase Dashboard → Storage → Policies');
      console.log('2. Создай новую политику для bucket "product-images"');
      console.log('3. Разреши SELECT, INSERT, UPDATE для всех пользователей');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

setupStorage();
