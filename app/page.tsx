'use client';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [prodRes, storyRes] = await Promise.all([
        supabase.from('product_market').select('*').order('created_at', { ascending: false }),
        supabase.from('seller_stories').select('*').order('created_at', { ascending: false })
      ]);
      if (prodRes.data) setProducts(prodRes.data);
      if (storyRes.data) setStories(storyRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center font-black italic uppercase">Загрузка...</div>;

  return (
    <main className="min-h-screen bg-white pb-32">
      {/* Шапка и поиск */}
      <header className="p-4 pt-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">Market</h1>
          <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-xl">👤</div>
        </div>
        <div className="relative">
          <input type="text" placeholder="Поиск товаров..." className="w-full bg-[#F3F3F3] border-none py-4 px-6 rounded-2xl text-[12px] font-bold outline-none" />
        </div>
      </header>

      {/* Сториз (Stories) */}
      <section className="mb-8">
        <div className="flex gap-4 overflow-x-auto no-scrollbar px-4">
          {stories.map((s) => (
            <div key={s.id} className="flex-shrink-0 flex flex-col items-center gap-1">
              <div className="w-16 h-16 rounded-full border-2 border-orange-500 p-0.5">
                <img src={s.image_url} className="w-full h-full rounded-full object-cover" />
              </div>
              <span className="text-[7px] font-black uppercase italic">Live</span>
            </div>
          ))}
        </div>
      </section>

      {/* Категории */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 mb-6">
        {['Все', 'Розы', 'Пионы', 'Букеты', 'Подарки'].map((cat) => (
          <button key={cat} className="whitespace-nowrap bg-zinc-100 px-5 py-2.5 rounded-full text-[10px] font-black uppercase italic active:bg-black active:text-white transition-all">
            {cat}
          </button>
        ))}
      </div>

      {/* Сетка товаров (2 в ряд) */}
      <div className="grid grid-cols-2 gap-2 px-2">
        {products.map((p) => {
          const hasDiscount = p.old_price && p.old_price > p.price;
          return (
            <div key={p.id} className="bg-[#F3F3F3] rounded-[2.2rem] p-2 flex flex-col relative">
              <div className="relative aspect-square rounded-[1.8rem] overflow-hidden">
                <img src={p.image_url} className="w-full h-full object-cover" />
                
                {hasDiscount && (
                  <div className="absolute top-2 left-2 bg-orange-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase italic">
                    -{Math.round(((p.old_price - p.price) / p.old_price) * 100)}%
                  </div>
                )}

                <div className="absolute bottom-2 right-2 flex flex-col items-end">
                  {hasDiscount && (
                    <span className="text-[7px] text-black/30 line-through font-bold bg-white/40 px-1.5 rounded-full mb-0.5">
                      {p.old_price}₽
                    </span>
                  )}
                  <div className="bg-white text-black px-3 py-1 rounded-full text-[11px] font-black">
                    {p.price}₽
                  </div>
                </div>
              </div>

              <div className="p-2">
                <Link href={`/seller/${p.seller_id}`}>
                   <p className="text-[7px] font-black uppercase text-orange-500 mb-0.5 tracking-widest">Shop</p>
                </Link>
                <h3 className="font-bold text-[9px] uppercase leading-tight line-clamp-2 h-5">
                  {p.name}
                </h3>
                <button className="w-full bg-black text-white py-3 rounded-xl text-[8px] font-black uppercase mt-2 active:scale-95 transition-all">
                  Купить
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Нижнее меню навигации */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-full shadow-2xl flex gap-10 items-center z-50">
         <div className="text-white text-xl opacity-100">🏠</div>
         <div className="text-white text-xl opacity-40">🔍</div>
         <div className="text-white text-xl opacity-40">🛍️</div>
         <div className="text-white text-xl opacity-40">⚙️</div>
      </nav>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  );
}