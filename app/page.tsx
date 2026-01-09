'use client';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('product_market')
      .select('*, sellers(shop_name)')
      .order('created_at', { ascending: false });
    
    if (data) setProducts(data);
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-[10px] font-black uppercase italic animate-pulse">Загрузка маркета...</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F8F8F8] pb-24">
      {/* Шапка */}
      <header className="p-6 bg-white rounded-b-[3rem] shadow-sm mb-6">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Market</h1>
        <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mt-1">Premium Flowers & Gifts</p>
      </header>

      {/* Сетка товаров */}
      <div className="grid grid-cols-2 gap-3 px-3">
        {products.map((p) => {
          // Расчет процента скидки для бейджа
          const hasDiscount = p.old_price && p.old_price > p.price;
          const discountPercent = hasDiscount 
            ? Math.round(((p.old_price - p.price) / p.old_price) * 100) 
            : 0;

          return (
            <div key={p.id} className="bg-white rounded-[2.5rem] p-2 shadow-sm border border-zinc-100 flex flex-col">
              {/* Контейнер фото */}
              <div className="relative aspect-square rounded-[2.2rem] overflow-hidden bg-zinc-50">
                <img 
                  src={p.image_url} 
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" 
                  alt={p.name} 
                />
                
                {/* ОРАНЖЕВЫЙ БЕЙДЖ СКИДКИ */}
                {hasDiscount && (
                  <div className="absolute top-3 left-3 bg-orange-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black italic shadow-lg">
                    -{discountPercent}%
                  </div>
                )}

                {/* ЦЕНЫ НА ФОТО */}
                <div className="absolute bottom-3 right-3 flex flex-col items-end">
                  {hasDiscount && (
                    <span className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[8px] text-zinc-400 line-through font-bold mb-1">
                      {p.old_price} ₽
                    </span>
                  )}
                  <div className="bg-black text-white px-4 py-2 rounded-full text-[12px] font-black italic shadow-xl">
                    {p.price} ₽
                  </div>
                </div>
              </div>

              {/* Инфо */}
              <div className="p-3 flex-1 flex flex-col">
                <Link href={`/seller/${p.seller_id}`}>
                  <button className="mb-2 bg-zinc-100 px-3 py-1.5 rounded-full inline-flex items-center active:scale-95 transition-transform">
                    <span className="text-[8px] text-zinc-500 font-black uppercase italic tracking-widest">
                      🏪 {p.sellers?.shop_name || 'Магазин'}
                    </span>
                  </button>
                </Link>
                
                <h3 className="font-bold text-[10px] uppercase leading-tight line-clamp-2 mb-4 flex-1">
                  {p.name}
                </h3>

                <button className="w-full bg-black text-white py-4 rounded-[1.2rem] text-[9px] font-black uppercase italic active:scale-95 transition-all shadow-lg shadow-black/5">
                  Купить
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Навигация (заглушка) */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-white/20 px-8 py-4 rounded-full shadow-2xl flex gap-8 items-center z-50">
         <div className="w-5 h-5 bg-black rounded-full" />
         <div className="w-5 h-5 bg-zinc-200 rounded-full" />
         <div className="w-5 h-5 bg-zinc-200 rounded-full" />
      </nav>
    </main>
  );
}