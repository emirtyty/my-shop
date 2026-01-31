import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testCorrectTable() {
  try {
    console.log('🔍 Тест доступа к правильной таблице product_market...');
    
    const { data, error, status } = await supabase
      .from('product_market')
      .select('*')
      .limit(5);
      
    console.log('Status:', status);
    console.log('Data length:', data?.length || 0);
    console.log('Error:', error);
    
    if (data && data.length > 0) {
      console.log('✅ Данные получены из product_market:');
      data.forEach((item, i) => {
        console.log(`  ${i+1}. ${item.name || 'no name'} - ${item.price || 'no price'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testCorrectTable();
