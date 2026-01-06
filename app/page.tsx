"use client";
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ВСЕ');

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('product_market').select('*').eq('in_stock', true).order('created_at', { ascending: false });
      if (data) {
        setProducts(data.filter(p => !p.is_story)); // Обычные товары
        setStories(data.filter(p => p.is_story));   // Только сториз
      }
    }
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white font-sans max-w-md mx-auto pb-10">
      
      {/* ЛЕНТА СТОРИЗ */}
      <div className="flex gap-4 overflow-x-auto p-4 pt-8 no-scrollbar border-b border-white/5">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="w-16 h-16 rounded-full border-2 border-zinc-800 flex items-center justify-center text-xl bg-zinc-900">⚡️</div>
          <span className="text-[7px] font-black opacity-20 uppercase">LIVE</span>
        </div>
        {stories.map(story => (
          <div key={story.id} className="flex flex-col items-center gap-2 shrink-0 animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 to-red-500">
              <img src={story.image_url[0]} className="w-full h-full object-cover rounded-full border-2 border-black" />
            </div>
            <span className="text-[7px] font-black uppercase truncate w-16 text-center">{story.name}</span>
          </div>
        ))}
      </div>

      <header className="p-4 space-y-4">
        <input 
          placeholder="ПОИСК..." 
          className="w-full bg-zinc-900/50 p-4 rounded-2xl text-[10px] font-black outline-none border border-white/5"
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
      </header>

      {/* ГРИД ТОВАРОВ */}
      <div className="px-3 grid grid-cols-2 gap-3">
        {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(product => (
          <article key={product.id} className="bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-white/5">
            <div className="relative aspect-[3/4]">
              <img src={product.image_url[0]} className="w-full h-full object-cover" />
              <div className="absolute bottom-3 left-3 bg-black/80 px-3 py-1.5 rounded-2xl text-[11px] font-black">
                {product.price} ₽
              </div>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[9px] font-black uppercase opacity-30 truncate text-center">{product.name}</p>
              <a href={`https://t.me/${product.contact}`} className="block w-full bg-white text-black py-3 rounded-xl font-black text-center text-[9px] uppercase">КУПИТЬ</a>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}