'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase'; // Проверь, что путь верный!

export default function SellerPage() {
  const params = useParams();
  const router = useRouter();
  const [seller, setSeller] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSellerData() {
      if (!params?.id) return;
      try {
        const { data: sData } = await supabase.from('sellers').select('*').eq('id', params.id).single();
        const { data: pData } = await supabase.from('product_market').select('*').eq('seller_id', params.id);
        setSeller(sData);
        setProducts(pData || []);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    fetchSellerData();
  }, [params?.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black italic text-orange-500 animate-pulse">ЗАГРУЗКА...</div>;
  if (!seller) return <div className="min-h-screen flex items-center justify-center font-black italic">МАГАЗИН НЕ НАЙДЕН</div>;

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-20">
      {/* Шапка магазина */}
      <div className="bg-white rounded-b-[3.5rem] p-8 pt-16 shadow-sm mb-6">
        <button onClick={() => router.push('/')} className="mb-6 text-[10px] font-black italic text-zinc-300 uppercase">← На главную</button>
        <div className="flex items-center gap-5">
          <img src={seller.logo_url} className="w-20 h-20 rounded-full object-cover border-2 border-orange-500 p-1" alt="" />
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">{seller.shop_name}</h1>
            <p className="text-[9px] font-black text-orange-500 uppercase italic mt-1">{products.length} товаров в наличии</p>
          </div>
        </div>
      </div>

      {/* Сетка товаров с акцентом на цены и скидки */}
      <div className="px-4 grid grid-cols-2 gap-4">
        {products.map((p) => {
          const currentPrice = Number(p.price || 0);
          const oldPrice = p.old_price ? Number(p.old_price) : null;
          const hasDiscount = oldPrice && oldPrice > currentPrice;
          const discountPercent = hasDiscount ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100) : 0;

          return (
            <div key={p.id} className="bg-white rounded-[2.8rem] p-2 border border-zinc-100 shadow-sm">
              <div className="relative aspect-square mb-3 overflow-hidden rounded-[2.4rem]">
                <img src={p.image_url} className="w-full h-full object-cover" alt="" />
                
                {hasDiscount && (
                  <div className="absolute top-3 left-3 bg-orange-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black italic shadow-lg">
                    -{discountPercent}%
                  </div>
                )}

                <div className="absolute bottom-3 right-3 flex flex-col items-end">
                  {hasDiscount && (
                    <span className="bg-white/90 px-2 py-0.5 rounded-full text-[8px] text-zinc-400 line-through font-bold mb-1">
                      {oldPrice} ₽
                    </span>
                  )}
                  <div className="bg-black text-white px-4 py-2 rounded-full text-[12px] font-black italic shadow-xl">
                    {currentPrice} ₽
                  </div>
                </div>
              </div>
              <div className="px-3 pb-3 text-center">
                <h3 className="font-bold text-[10px] uppercase tracking-tighter mb-4 h-8 line-clamp-2 leading-none">{p.name}</h3>
                <button onClick={() => router.push('/')} className="w-full py-3 bg-zinc-100 rounded-2xl text-[8px] font-black uppercase italic text-zinc-400">В корзину через главную</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}