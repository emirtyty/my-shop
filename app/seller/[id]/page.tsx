'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

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
        setLoading(true);
        // 1. Получаем данные продавца
        const { data: sellerData } = await supabase
          .from('sellers')
          .select('*')
          .eq('id', params.id)
          .single();
        
        // 2. Получаем его товары
        const { data: productsData } = await supabase
          .from('product_market')
          .select('*')
          .eq('seller_id', params.id);

        setSeller(sellerData);
        setProducts(productsData || []);
      } catch (err) {
        console.error("Ошибка загрузки витрины:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSellerData();
  }, [params?.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black italic text-orange-500 animate-pulse">ЗАГРУЗКА ВИТРИНЫ...</div>;

  // Если продавец не найден
  if (!seller) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-black mb-4">МАГАЗИН НЕ НАЙДЕН</h1>
      <button onClick={() => router.push('/')} className="bg-black text-white px-8 py-4 rounded-2xl font-black italic text-[10px]">ВЕРНУТЬСЯ НА ГЛАВНУЮ</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-20">
      {/* ШАПКА МАГАЗИНА */}
      <div className="bg-white rounded-b-[3.5rem] shadow-sm p-8 pt-16 mb-6">
        <button onClick={() => router.back()} className="mb-6 text-[10px] font-black italic text-zinc-400">← НАЗАД</button>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-zinc-100 overflow-hidden border-2 border-orange-500 p-1 shadow-lg">
             <img src={seller.logo_url || 'https://via.placeholder.com/150'} className="w-full h-full rounded-full object-cover" alt="" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{seller.shop_name || 'БЕЗ НАЗВАНИЯ'}</h1>
            <p className="text-[10px] font-bold text-zinc-400 mt-2 uppercase tracking-widest">{products.length} ТОВАРОВ</p>
          </div>
        </div>
        {seller.description && (
            <p className="mt-6 text-[11px] text-zinc-500 font-medium leading-relaxed italic">{seller.description}</p>
        )}
      </div>

      {/* ТОВАРЫ ПРОДАВЦА */}
      <div className="px-4 grid grid-cols-2 gap-4">
        {products.map((p, index) => {
          const currentPrice = Number(p?.price || 0);
          const oldPrice = p?.old_price ? Number(p.old_price) : null;
          const hasDiscount = oldPrice !== null && oldPrice > currentPrice;
          const discountPercent = hasDiscount ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100) : 0;

          return (
            <div key={p?.id || index} className="bg-white rounded-[2.8rem] p-2 border border-zinc-100 shadow-sm animate-fade-in">
              <div className="relative aspect-square mb-3 overflow-hidden rounded-[2.4rem] bg-zinc-50">
                <img src={p?.image_url} className="w-full h-full object-cover" alt="" />
                
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
                  <div className="bg-black text-white px-4 py-2 rounded-full text-[11px] font-black italic shadow-xl">
                    {currentPrice} ₽
                  </div>
                </div>
              </div>
              <div className="px-3 pb-3 text-center">
                <h3 className="font-bold text-[10px] uppercase tracking-tighter mb-4 h-8 line-clamp-2 leading-none text-zinc-800">
                    {p?.name || 'БЕЗ НАЗВАНИЯ'}
                </h3>
                <button 
                  onClick={() => router.push('/')} // Продавец — это витрина, покупка идет через главную или общую корзину
                  className="w-full py-4 bg-zinc-100 rounded-[1.2rem] text-[8px] font-black uppercase italic text-zinc-400"
                >
                  ПОДРОБНЕЕ
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}