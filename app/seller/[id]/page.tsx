'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../.././lib/supabase';

export default function SellerPage() {
  const { id } = useParams();
  const router = useRouter();
  const [seller, setSeller] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      const { data: sData } = await supabase.from('sellers').select('*').eq('id', id).single();
      if (sData) {
        setSeller(sData);
        const { data: pData } = await supabase.from('product_market').select('*').eq('seller_id', id);
        if (pData) setProducts(pData);
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) return <div className="p-10 text-center font-bold">Загрузка...</div>;
  if (!seller) return <div className="p-10 text-center font-bold">Магазин не найден</div>;

  return (
    <main className="min-h-screen bg-white text-black p-4">
      {/* Шапка магазина в стиле главной */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-black uppercase italic">{seller.shop_name}</h1>
        <p className="text-sm opacity-60 font-bold uppercase mt-1">{seller.description}</p>
      </div>

      {/* Сетка товаров как на главной */}
      <div className="grid grid-cols-1 gap-8 max-w-md mx-auto">
        {products.map((product) => (
          <div key={product.id} className="flex flex-col">
            {/* Картинка со скругленными углами как на image_28b4ec.jpg */}
            <div className="aspect-square overflow-hidden rounded-[40px] mb-4">
              <img 
                src={product.image_url} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Инфо о товаре */}
            <div className="px-2 text-center mb-4">
                <p className="text-[10px] font-bold uppercase opacity-40 mb-1">{seller.shop_name}</p>
                <h3 className="text-lg font-black uppercase italic leading-none">{product.name}</h3>
                <p className="text-sm font-bold mt-2">{product.price.toLocaleString()} ₽</p>
            </div>

            {/* Черная кнопка как на главной */}
            <button className="w-full bg-black text-white py-4 rounded-full font-black uppercase italic text-sm hover:opacity-80 transition-opacity">
              КУПИТЬ
            </button>
          </div>
        ))}
      </div>
      
      <button 
        onClick={() => router.push('/')}
        className="mt-12 w-full text-center text-[10px] font-black uppercase opacity-40 underline"
      >
        Вернуться на главную
      </button>
    </main>
  );
}