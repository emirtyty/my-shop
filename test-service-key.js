import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

// Пробуем с service role key (если есть)
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

console.log('🔍 Тест с service role key...');
console.log('Service key exists:', !!serviceKey);
console.log('All env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));

if (serviceKey) {
  const supabaseService = createClient(supabaseUrl, serviceKey);
  
  async function testServiceAccess() {
    try {
      const { data, error, status } = await supabaseService
        .from('products')
        .select('*')
        .limit(5);
        
      console.log('Status:', status);
      console.log('Data length:', data?.length || 0);
      console.log('Error:', error);
      
      if (data && data.length > 0) {
        console.log('✅ Данные получены через service key:');
        data.forEach((item, i) => {
          console.log(`  ${i+1}. ${item.name} - ${item.price}`);
        });
      }
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }
  }
  
  testServiceAccess();
} else {
  console.log('❌ Service role key не найден в .env.local');
  console.log('📝 Добавьте SUPABASE_SERVICE_ROLE_KEY в .env.local');
}
