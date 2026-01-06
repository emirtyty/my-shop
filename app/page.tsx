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

  // Фильтрация
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'все' || p.category === category;
    return matchesSearch && matchesCat && !p.is_story; // В ленте только не-сториз
  });

  const stories = products.filter(p => p.is_story);

  return (
    <div className="bg-black min-h-screen text-white font-sans pb-20">
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
                <img 
                  src={s.image_url[0]} 
                  className="w-full h-full object-cover rounded-full border-2 border-black" 
                />
              </div>
              <span className="text-[10px] font-medium opacity-60 uppercase tracking-tighter w-16 truncate text-center">
                {s.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 3. КАТЕГОРИИ */}
      <div className="flex gap-2 overflow-x-auto px-6 mb-8 no-scrollbar">
        {['все', 'цветы', 'еда', 'одежда', 'разное'].map(cat => (
          <button 
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${category === cat ? 'bg-white text-black' : 'bg-zinc-900 text-white/40'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 4. СЕТКА ТОВАРОВ */}
      <div className="px-6 grid grid-cols-1 gap-8">
        {filteredProducts.map((p) => (
          <div key={p.id} className="group">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] mb-4 bg-zinc-900">
              <img 
                src={p.image_url[0]} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl">
                  <span className="text-black font-black text-sm">{p.price} ₽</span>
                  {p.old_price > 0 && (
                    <span className="text-black/40 line-through text-[10px] ml-2 font-bold">{p.old_price} ₽</span>
                  )}
                </div>
                <button className="bg-black text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-90 transition">
                  Купить
                </button>
              </div>
            </div>
            <h3 className="font-black uppercase text-[12px] tracking-widest px-2">{p.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}