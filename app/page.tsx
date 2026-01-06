"use client";
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('все');

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase
      .from('product_market')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProducts(data);
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'все' || p.category === category;
    return matchesSearch && matchesCat && !p.is_story;
  });

  const stories = products.filter(p => p.is_story);

  return (
    <div className="bg-black min-h-screen text-white font-sans pb-20">
      {/* ОГРАНИЧИТЕЛЬ ШИРИНЫ И ЦЕНТРИРОВАНИЕ */}
      <div className="max-w-lg mx-auto bg-black min-h-screen shadow-2xl shadow-white/5">
        
        {/* 1. ПОИСК */}
        <div className="p-6 pt-10">
          <input 
            type="text"
            placeholder="Поиск товаров..."
            className="w-full bg-zinc-900/50 border border-white/5 rounded-3xl py-4 px-6 text-sm focus:outline-none focus:border-white/10 transition"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* 2. STORIES */}
        {stories.length > 0 && (
          <div className="flex gap-4 overflow-x-auto px-6 mb-8 no-scrollbar">
            {stories.map((s) => (
              <div key={s.id} className="flex-shrink-0 flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-fuchsia-600">
                  <div className="w-full h-full rounded-full border-2 border-black overflow-hidden">
                    <img 
                      src={s.image_url[0]} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                </div>
                <span className="text-[10px] font-medium opacity-60 uppercase tracking-tighter w-16 truncate text-center">
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 3. КАТЕГОРИИ */}
        <div className="flex gap-2 overflow-x-auto px-6 mb-10 no-scrollbar">
          {['все', 'цветы', 'еда', 'одежда', 'разное'].map(cat => (
            <button 
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${category === cat ? 'bg-white text-black' : 'bg-zinc-900 text-white/40'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 4. СЕТКА ТОВАРОВ (2 колонки для красоты) */}
        <div className="px-6 grid grid-cols-2 gap-4">
          {filteredProducts.map((p) => (
            <div key={p.id} className="group flex flex-col">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] mb-3 bg-zinc-900">
                <img 
                  src={p.image_url[0]} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 right-4">
                   <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                      <span className="text-white font-black text-[10px]">{p.price} ₽</span>
                   </div>
                </div>
              </div>
              <div className="px-2">
                <h3 className="font-black uppercase text-[10px] tracking-widest leading-tight mb-1 truncate">{p.name}</h3>
                {p.old_price > 0 && (
                  <span className="text-red-500 line-through text-[9px] font-bold opacity-60">{p.old_price} ₽</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}