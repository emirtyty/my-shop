// Тестируем исправленные URL
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vklustrbpajwfuoldnxu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbHVzdHJicGFqd2Z1b2xkbnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk1NTgsImV4cCI6MjA4NDEzNTU1OH0.w7m-F-bHewTw9PnRpo1VICCIrDyefxHhn4yW2uJ9wIU';

// Функция для исправления URL (такая же как в компонентах)
const getMessengerUrl = (messenger, contact) => {
  if (!contact) return null;
  
  switch (messenger) {
    case 'telegram':
      if (contact.startsWith('http')) return contact;
      if (contact.startsWith('@')) return `https://t.me/${contact.substring(1)}`;
      return `https://t.me/${contact.replace('@', '').replace('https://t.me/', '')}`;
    case 'instagram':
      if (contact.startsWith('http')) return contact;
      if (contact.startsWith('@')) return `https://instagram.com/${contact.substring(1)}`;
      return `https://instagram.com/${contact.replace('@', '').replace('https://instagram.com/', '')}`;
    default:
      return contact;
  }
};

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedUrls() {
  try {
    console.log('🔧 Тестируем исправленные URL...');
    
    const { data: products, error } = await supabase
      .from('product_market')
      .select('id, name, sellers(*)');
    
    if (error) {
      console.error('❌ Ошибка:', error);
      return;
    }
    
    products.forEach((product, index) => {
      console.log(`\n${index + 1}. Товар: ${product.name}`);
      
      if (product.sellers) {
        const telegramUrl = getMessengerUrl('telegram', product.sellers.telegram_url);
        const instagramUrl = getMessengerUrl('instagram', product.sellers.instagram_url);
        
        console.log(`   Исходный telegram: ${product.sellers.telegram_url}`);
        console.log(`   Исправленный telegram: ${telegramUrl}`);
        
        if (product.sellers.instagram_url) {
          console.log(`   Исходный instagram: ${product.sellers.instagram_url}`);
          console.log(`   Исправленный instagram: ${instagramUrl}`);
        }
        
        // Проверяем валидность
        try {
          new URL(telegramUrl);
          console.log(`   ✅ Telegram URL валидный: ${telegramUrl}`);
        } catch {
          console.log(`   ❌ Telegram URL невалидный: ${telegramUrl}`);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

testFixedUrls();
