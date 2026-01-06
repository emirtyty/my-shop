"use client";
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('product_market').select('*').order('created_at', { ascending: false });
      if (data) setProducts(data);
    }
    fetchData();
  }, []);

  const stories = products.filter(p => p.is_story);
  const feed = products.filter(p => !p.is_story);

  return (
    <main className="min-h-screen bg-black text-white max-w-md mx-auto relative pb-10 border-x border-white/5">
      {/* ЛОГОТИП */}
      <header className="p-6 text-center border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <h1 className="font-black tracking-[0.4em] text-xl uppercase">Market</h1>
      </header>

      {/* СТОРИЗ (Кружочки) */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar p-6">
        {stories.map(story => (
          <div key={story.id} className="flex flex-col items-center gap-2 min-w-[70px]">
            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 to-red-500">
              <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-zinc-900">
                <img src={story.image_url[0]} className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-[8px] font-black uppercase opacity-40 truncate w-full text-center">
              {story.name}
            </span>
          </div>
        ))}
      </div>

      {/* ЛЕНТА ТОВАРОВ */}
      <div className="px-4 space-y-12">
        {feed.map(product => (
          <article key={product.id} className="group">
            <div className="relative aspect-square rounded-[2.5rem] overflow-hidden bg-zinc-900 border border-white/5">
              <img src={product.image_url[0]} className="w-full h-full object-cover" />
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 font-bold text-sm">
                {product.price} ₽
              </div>
            </div>
            <div className="mt-4 px-2 flex justify-between items-center">
              <h2 className="font-black uppercase tracking-wider text-[11px]">{product.name}</h2>
              <a 
                href={`https://t.me/${product.contact?.replace('@', '')}`}
                className="bg-white text-black px-6 py-2 rounded-full font-black text-[9px] uppercase tracking-tighter active:scale-90 transition-all"
              >
                Купить
              </a>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}