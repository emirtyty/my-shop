'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSellerData() {
      if (!id) return;

      // 1. Получаем данные продавца
      const { data: sellerData } = await supabase
        .from('sellers')
        .select('*')
        .eq('id', id)
        .single();

      if (sellerData) {
        setSeller(sellerData);

        // 2. Получаем товары этого продавца
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .eq('seller_id', id);

        if (productsData) setProducts(productsData);
      }
      setLoading(false);
    }

    fetchSellerData();
  }, [id]);

  if (loading) return <div className="p-10 text-center font-black uppercase italic">Загрузка витрины...</div>;

  if (!seller) return <div className="p-10 text-center font-black uppercase italic text-red-500">Продавец не найден</div>;

  return (
    <div className="min-h-screen bg-white text-black p-4">
      {/* Шапка витрины */}
      <div className="border-4 border-black p-6 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-4xl font-black uppercase italic mb-2">{seller.shop_name}</h1>
        <p className="text-lg font-bold opacity-70">{seller.description}</p>
      </div>

      <h2 className="text-2xl font-black uppercase italic mb-6">Товары продавца:</h2>

      {/* Сетка товаров */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="border-4 border-black p-4 hover:translate-x-1 hover:-translate-y-1 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="w-full h-48 object-cover border-2 border-black mb-4"
            />
            <h3 className="text-xl font-black uppercase italic">{product.name}</h3>
            <p className="text-2xl font-black mt-2">{product.price} ₽</p>
            <button className="w-full mt-4 bg-black text-white font-black uppercase italic py-2 hover:bg-gray-800">
              Купить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}