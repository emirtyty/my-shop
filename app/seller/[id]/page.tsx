'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../.././lib/supabase';

interface Seller {
  id: string;
  shop_name: string;
  description: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  description: string;
}

export default function SellerPage() {
  const { id } = useParams();
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSellerData() {
      if (!id) return;
      try {
        const { data: sellerData } = await supabase
          .from('sellers')
          .select('*')
          .eq('id', id)
          .single();

        if (sellerData) {
          setSeller(sellerData);
          const { data: productsData } = await supabase
            .from('product_market')
            .select('*')
            .eq('seller_id', id);

          if (productsData) setProducts(productsData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchSellerData();
  }, [id]);

  if (loading) return <div className="p-10 text-center font-black uppercase italic">Загрузка...</div>;
  if (!seller) return <div className="p-10 text-center font-black uppercase italic">Магазин не найден</div>;

  return (
    <main className="min-h-screen bg-white text-black p-4 md:p-6">
      {/* Кнопка назад в стиле главной */}
      <button 
        onClick={() => router.push('/')}
        className="mb-6 border-2 border-black px-4 py-1 font-black uppercase italic text-sm hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
      >
        ← На главную
      </button>

      {/* Шапка магазина */}
      <div className="border-4 border-black p-6 mb-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
        <h1 className="text-4xl md:text-6xl font-black uppercase italic leading-none">{seller.shop_name}</h1>
        <p className="text-lg font-bold mt-4 border-t-2 border-black pt-2 opacity-80">
          {seller.description || "Описания пока нет"}
        </p>
      </div>

      <h2 className="text-2xl font-black uppercase italic mb-6">Все товары продавца:</h2>

      {/* Сетка товаров (точно как на главной) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <div 
            key={product.id} 
            className="border-4 border-black p-3 md:p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex flex-col"
          >
            <div className="aspect-square border-2 border-black mb-3 overflow-hidden bg-gray-100">
              <img 
                src={product.image_url} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
            </div>
            
            <h3 className="font-black uppercase italic text-sm md:text-base mb-1 truncate">
              {product.name}
            </h3>
            
            <p className="text-xs font-bold opacity-60 mb-3 line-clamp-2 h-8">
              {product.description || "Нет описания"}
            </p>

            <div className="mt-auto flex flex-col gap-2">
              <span className="text-xl md:text-2xl font-black italic">
                {product.price.toLocaleString()} ₽
              </span>
              <button className="w-full border-2 border-black bg-black text-white py-2 font-black uppercase italic text-xs hover:bg-white hover:text-black transition-all">
                Купить
              </button>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="border-4 border-dashed border-black p-10 text-center font-black uppercase italic opacity-30">
          Товаров нет
        </div>
      )}
    </main>
  );
}