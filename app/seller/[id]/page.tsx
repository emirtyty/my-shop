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
      try {
        // 1. Загружаем данные продавца
        const { data: sData } = await supabase
          .from('sellers')
          .select('*')
          .eq('id', id)
          .single();

        if (sData) {
          setSeller(sData);
          // 2. Загружаем товары из правильной таблицы product_market
          const { data: pData } = await supabase
            .from('product_market')
            .select('*')
            .eq('seller_id', id);

          if (pData) setProducts(pData);
        }
      } catch (e) {
        console.error("Ошибка загрузки:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  // Функция добавления в корзину (синхронизированная с главной)
  const addToCart = (product: any) => {
    const savedCart = localStorage.getItem('cart');
    const currentCart = savedCart ? JSON.parse(savedCart) : [];
    
    // Формируем объект товара так, чтобы главная страница его "узнала"
    const productToAdd = {
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      quantity: 1,
      shop_name: seller.shop_name,
      telegram_id: seller.telegram_id // Для отправки заказа ботом
    };

    const existingItemIndex = currentCart.findIndex((item: any) => item.id === product.id);
    
    let updatedCart;
    if (existingItemIndex > -1) {
      updatedCart = [...currentCart];
      updatedCart[existingItemIndex].quantity += 1;
    } else {
      updatedCart = [...currentCart, productToAdd];
    }

    localStorage.setItem('cart', JSON.stringify(updatedCart));
    
    // Генерируем события, чтобы иконка корзины на главной обновилась мгновенно
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('cartUpdated'));

    alert(`✅ ${product.name} добавлен в корзину!`);
  };

  if (loading) return <div className="p-10 text-center font-black uppercase italic">Загрузка витрины...</div>;
  if (!seller) return <div className="p-10 text-center font-black uppercase italic">Магазин не найден</div>;

  return (
    <main className="min-h-screen bg-white text-black p-4">
      {/* Шапка магазина (стиль со скруглениями и акцентом) */}
      <header className="mb-12 text-center pt-8">
        <h1 className="text-3xl font-black uppercase italic leading-none">{seller.shop_name}</h1>
        <div className="mt-2 inline-block bg-black text-white px-3 py-1 rounded-full">
            <p className="text-[10px] font-black uppercase tracking-widest">
              {seller.description || "Official Seller"}
            </p>
        </div>
      </header>

      {/* Сетка товаров (максимальное сходство с image_28b4ec.jpg) */}
      <div className="grid grid-cols-1 gap-10 max-w-sm mx-auto pb-24">
        {products.map((product) => (
          <div key={product.id} className="flex flex-col">
            {/* Картинка с закруглением 40px */}
            <div className="aspect-square overflow-hidden rounded-[40px] mb-5 shadow-sm border border-gray-50">
              <img 
                src={product.image_url} 
                alt={product.name} 
                className="w-full h-full object-cover transform transition-transform hover:scale-105 duration-700"
              />
            </div>
            
            {/* Инфо по центру */}
            <div className="text-center mb-6">
                <p className="text-[9px] font-black uppercase opacity-30 mb-1 tracking-tighter">By {seller.shop_name}</p>
                <h3 className="text-xl font-black uppercase italic leading-none mb-2">{product.name}</h3>
                <p className="text-lg font-black">{product.price.toLocaleString()} ₽</p>
            </div>

            {/* Кнопка КУПИТЬ */}
            <button 
              onClick={() => addToCart(product)}
              className="w-full bg-black text-white py-5 rounded-full font-black uppercase italic text-sm shadow-xl active:scale-95 transition-all"
            >
              КУПИТЬ
            </button>
          </div>
        ))}
      </div>
      
      {/* Кнопка возврата в самом низу */}
      <button 
        onClick={() => router.push('/')}
        className="w-full text-center text-[10px] font-black uppercase opacity-20 underline pb-10"
      >
        Вернуться на главную
      </button>
    </main>
  );
}