import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vklustrbpajwfuoldnxu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbHVzdHJicGFqd2Z1b2xkbnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk1NTgsImV4cCI6MjA4NDEzNTU1OH0.w7m-F-bHewTw9PnRpo1VICCIrDyefxHhn4yW2uJ9wIU'
);

async function checkCategories() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('All categories in database:');
    data.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} - ${cat.count} товаров - sort_order: ${cat.sort_order}`);
    });
    
    console.log(`\nTotal: ${data.length} categories`);
  } catch (error) {
    console.error('Critical error:', error);
  }
}

checkCategories();
