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
        // 1. Загружаем продавца из таблицы 'sellers'
        const { data: sellerData, error: sellerError } = await supabase
          .from('sellers')
          .select('*')
          .eq('id', id)
          .single();

        if (sellerError) throw sellerError;
        
        if (sellerData) {
          setSeller(sellerData);

          // 2. Загружаем товары из таблицы 'product_market'
          // ВАЖНО: Проверь, что в этой таблице есть колонка seller_id для связи!
          const { data: productsData, error: productsError } = await supabase
            .from('product_market')
            .select('*')
            .eq('seller_id', id);

          if (!productsError && productsData) {
            setProducts(productsData);
          }
        }
      } catch (error) {
        console.error('Ошибка:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSellerData();
  }, [id]);

  if (loading) return <div className="p-10 text-center font-black uppercase italic">Загрузка...</div>;
  if (!seller) return <div className="p-10 text-center font-black uppercase italic text-red-500">Магазин не найден</div>;

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-8">
      <button onClick={() => router.push('/')} className="mb-6 font-bold uppercase text-xs underline">
        ← На главную
      </button>

      <header className="border-8 border-black p-8 mb-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] bg-yellow-400">
        <h1 className="text-5xl font-black uppercase italic leading-none">{seller.shop_name}</h1>
        <p className="text-lg font-bold mt-4 opacity-80">{seller.description || "Описания нет"}</p>
      </header>

      <h2 className="text-3xl font-black uppercase italic mb-8">Товары продавца:</h2>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {products.map((product) => (
            <div key={product.id} className="border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="aspect-square mb-4 border-2 border-black bg-gray-100 overflow-hidden">
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-black uppercase">{product.name}</h3>
              <p className="text-2xl font-black mt-2">{product.price} ₽</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-4 border-dashed border-black p-10 text-center opacity-50 font-bold uppercase">
          Товары в этом магазине пока не найдены
        </div>
      )}
    </div>
  );
}