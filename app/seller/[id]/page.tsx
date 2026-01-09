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

  // Функция добавления в корзину (такая же, как на главной)
  const addToCart = (product: any) => {
    // Получаем текущую корзину из памяти браузера
    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Добавляем новый товар
    const updatedCart = [...currentCart, {
      ...product,
      shop_name: seller.shop_name,
      seller_telegram_id: seller.telegram_id // Сохраняем ID для бота
    }];
    
    // Сохраняем обратно
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    
    // Оповещаем пользователя (можно заменить на красивое уведомление)
    alert(`Товар "${product.name}" добавлен в корзину!`);
  };

  if (loading) return <div className="p-10 text-center font-black italic uppercase">Загрузка...</div>;
  if (!seller) return <div className="p-10 text-center font-black italic uppercase">Магазин не найден</div>;

  return (
    <main className="min-h-screen bg-white text-black p-4">
      {/* Шапка магазина */}
      <div className="mb-10 text-center pt-4">
        <h1 className="text-3xl font-black uppercase italic leading-none">{seller.shop_name}</h1>
        <p className="text-[10px] font-bold uppercase opacity-40 mt-2 tracking-[0.2em]">
          {seller.description || "Official Partner"}
        </p>
      </div>

      {/* Сетка товаров */}
      <div className="grid grid-cols-1 gap-10 max-w-sm mx-auto pb-24">
        {products.map((product) => (
          <div key={product.id} className="flex flex-col group">
            {/* Изображение с закруглением 40px */}
            <div className="aspect-square overflow-hidden rounded-[40px] mb-5 shadow-sm">
              <img 
                src={product.image_url} 
                alt={product.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            
            {/* Инфо */}
            <div className="text-center mb-5">
                <p className="text-[9px] font-black uppercase opacity-30 mb-1 tracking-widest">{seller.shop_name}</p>
                <h3 className="text-xl font-black uppercase italic leading-none mb-2">{product.name}</h3>
                <p className="text-lg font-black">{product.price.toLocaleString()} ₽</p>
            </div>

            {/* Кнопка КУПИТЬ (добавляет в корзину) */}
            <button 
              onClick={() => addToCart(product)}
              className="w-full bg-black text-white py-5 rounded-full font-black uppercase italic text-sm shadow-xl active:scale-95 transition-all"
            >
              КУПИТЬ
            </button>
          </div>
        ))}
      </div>
      
      {/* Ссылка назад */}
      <button 
        onClick={() => router.push('/')}
        className="w-full text-center text-[10px] font-black uppercase opacity-20 underline pb-10"
      >
        Вернуться к общему каталогу
      </button>
    </main>
  );
}