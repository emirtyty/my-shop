'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

// --- ПЛАШКА СТАТУСА (Плавающий баннер в стиле iOS/Android) ---
function OrderStatusTracker() {
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const phone = localStorage.getItem('buyer_phone');
    if (!phone) return;

    const fetchOrder = async () => {
      const { data } = await supabase.from('orders').select('*').eq('buyer_phone', phone).order('created_at', { ascending: false }).limit(1).single();
      if (data && data.status !== 'Завершен') setOrder(data);
    };
    fetchOrder();

    const sub = supabase.channel('order_status').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (p) => {
      if (p.new.buyer_phone === phone) {
        if (p.new.status === 'Завершен') setOrder(null);
        else setOrder(p.new);
      }
    }).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  if (!order) return null;
  const isArrived = order.status === 'У дверей';

  return (
    <div className="fixed bottom-6 left-0 right-0 px-4 z-50">
      <div className={`p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between border-2 transition-all duration-500 ${
        isArrived ? 'bg-orange-500 border-white animate-bounce' : 'bg-zinc-900 border-zinc-800 text-white'
      }`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">
            {isArrived ? '🔔' : '🚚'}
          </div>
          <div>
            <p className="text-[10px] uppercase font-black opacity-60 tracking-wider">Ваш заказ</p>
            <p className="font-black text-base leading-tight uppercase">
              {isArrived ? 'У ВАШИХ ДВЕРЕЙ!' : order.status}
            </p>
          </div>
        </div>
        {isArrived && (
          <div className="bg-white text-orange-600 px-4 py-2 rounded-xl font-black text-[10px] animate-pulse">
            ВЫХОДИТЕ
          </div>
        )}
      </div>
    </div>
  );
}

// --- ГЛАВНЫЙ ЭКРАН ПРИЛОЖЕНИЯ ---
export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    async function getProducts() {
      const { data } = await supabase.from('product_market').select('*');
      setProducts(data || []);
    }
    getProducts();
  }, []);

  const handleBuy = async (product: any) => {
    const phone = prompt("Ваш номер телефона:");
    if (!phone) return;

    const { error } = await supabase.from('orders').insert([{
      product_name: product.name,
      price: product.price,
      buyer_phone: phone,
      seller_id: product.seller_id,
      status: 'Новый'
    }]);

    if (!error) {
      localStorage.setItem('buyer_phone', phone);
      alert("Заказ оформлен! Ожидайте уведомления.");
      window.location.reload();
    }
  };

  return (
    <main className="min-h-screen bg-[#080808] text-white p-4 pb-32 font-sans">
      {/* Шапка как в приложении */}
      <header className="flex justify-between items-center pt-4 mb-8 px-2">
        <div>
          <h1 className="text-3xl font-black tracking-tighter leading-none uppercase italic text-orange-500">
            MARKET<br/>RADUZHNY
          </h1>
        </div>
        <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
          <span className="text-xl">📍</span>
        </div>
      </header>

      {/* Сетка товаров: 2 в ряд в стиле Mobile UI */}
      <div className="grid grid-cols-2 gap-3">
        {products.map((p) => (
          <div key={p.id} className="bg-zinc-900/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-zinc-800/50 flex flex-col shadow-lg">
            <div className="h-40 w-full p-2">
              <img src={p.image_url} alt="" className="w-full h-full object-cover rounded-[2rem]" />
            </div>
            <div className="p-4 pt-1 flex flex-col flex-1">
              <h2 className="font-bold text-[13px] leading-tight mb-2 h-8 overflow-hidden line-clamp-2 opacity-90">
                {p.name}
              </h2>
              <div className="mt-auto flex flex-col gap-3">
                <p className="text-orange-500 font-black text-lg leading-none italic">
                  {p.price}₽
                </p>
                <button 
                  onClick={() => handleBuy(p)} 
                  className="w-full bg-white text-black py-3 rounded-[1.2rem] font-black text-[11px] uppercase active:scale-95 transition-all"
                >
                  В корзину
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Вызов трекера */}
      <OrderStatusTracker />
    </main>
  );
}