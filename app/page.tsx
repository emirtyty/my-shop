'use client';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function HomePage() {
  const [stories, setStories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      // 1. Загружаем истории
      const { data: storyData } = await supabase
        .from('seller_stories')
        .select('*')
        .order('created_at', { ascending: false });
      setStories(storyData || []);

      // 2. Загружаем товары
      const { data: productData } = await supabase
        .from('product_market')
        .select('*');
      setProducts(productData || []);
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* СЕКЦИЯ СТОРИС (Кружочки) */}
      <div className="flex overflow-x-auto gap-4 p-5 no-scrollbar border-b border-zinc-900">
        {stories.map((story) => (
          <div key={story.id} className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-orange-500 to-yellow-500 shadow-lg shadow-orange-500/20">
              <div className="w-full h-full rounded-full border-4 border-black overflow-hidden bg-zinc-800">
                <img 
                  src={story.image_url} 
                  className="w-full h-full object-cover" 
                  alt="story"
                />
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-500">
              {story.title || 'Маркет'}
            </span>
          </div>
        ))}
        
        {stories.length === 0 && (
          <div className="text-[10px] text-zinc-700 font-bold py-4 uppercase tracking-widest">
            Пока нет новых историй
          </div>
        )}
      </div>

      {/* ЛЕНТА ТОВАРОВ */}
      <div className="p-5 grid grid-cols-2 gap-4">
        {products.map((product) => (
          <div key={product.id} className="bg-zinc-900 rounded-[2.5rem] p-4 border border-zinc-800">
             <img src={product.image_url} className="w-full h-40 object-cover rounded-3xl mb-4" />
             <h3 className="font-bold text-sm mb-1">{product.name}</h3>
             <p className="text-orange-500 font-black italic">{product.price}₽</p>
          </div>
        ))}
      </div>
    </div>
  );
}