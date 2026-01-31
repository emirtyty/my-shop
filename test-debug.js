import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testWithDetails() {
  try {
    console.log('🔍 Детальная проверка доступа к products...');
    
    // Пробуем получить данные с отладкой
    const { data, error, status } = await supabase
      .from('products')
      .select('*')
      .limit(5);
      
    console.log('Status:', status);
    console.log('Data length:', data?.length || 0);
    console.log('Error:', error);
    
    if (data && data.length > 0) {
      console.log('✅ Данные получены:');
      data.forEach((item, i) => {
        console.log(`  ${i+1}. ${item.name} - ${item.price}`);
      });
    }
    
    // Проверяем права доступа
    const { data: authData } = await supabase.auth.getUser();
    console.log('Auth user:', authData);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testWithDetails();
