'use client';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from('product_market').select('*').order('created_at', { ascending: false });
      if (data) setProducts(data);
    };
    fetchProducts();
  }, []);

  return (
    <main className="min-h-screen bg-white pb-24">
      <header className="p-6">
        <h1 className="text-4xl font-black italic uppercase italic">Market</h1>
      </header>

      {/* Сетка товаров 2 в ряд, как была */}
      <div className="grid grid-cols-2 gap-2 px-2">
        {products.map((p) => (
          <div key={p.id} className="bg-[#F3F3F3] rounded-[2rem] p-2 flex flex-col relative">
            
            {/* Картинка товара */}
            <div className="relative aspect-square rounded-[1.8rem] overflow-hidden">
              <img src={p.image_url} className="w-full h-full object-cover" />
              
              {/* Бейдж скидки — только если есть old_price */}
              {p.old_price && p.old_price > p.price && (
                <div className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase italic">
                  -{Math.round(((p.old_price - p.price) / p.old_price) * 100)}%
                </div>
              )}

              {/* Цена */}
              <div className="absolute bottom-2 right-2 flex flex-col items-end">
                {p.old_price && (
                  <span className="text-[8px] text-black/40 line-through font-bold bg-white/50 px-1 rounded-full mb-0.5">
                    {p.old_price}₽
                  </span>
                )}
                <div className="bg-white text-black px-3 py-1 rounded-full text-[11px] font-black">
                  {p.price}₽
                </div>
              </div>
            </div>

            {/* Описание */}
            <div className="p-2">
              <Link href={`/seller/${p.seller_id}`}>
                <p className="text-[7px] font-black uppercase text-orange-500 mb-1">SHOP</p>
              </Link>
              <h3 className="font-bold text-[9px] uppercase leading-tight line-clamp-2 h-6">
                {p.name}
              </h3>
              <button className="w-full bg-black text-white py-3 rounded-xl text-[9px] font-black uppercase mt-2 active:scale-95 transition-all">
                Купить
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}