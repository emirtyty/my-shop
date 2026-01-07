'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase'; // Исправленный путь

// --- ТРЕКЕР (ПЛАШКА СТАТУСА) ---
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
    <div className={`fixed bottom-6 left-4 right-4 p-5 rounded-[2.5rem] shadow-2xl flex items-center justify-between z-50 border-2 transition-all duration-500 ${isArrived ? 'bg-orange-500 border-white animate-bounce' : 'bg-zinc-900 border-zinc-800 text-white'}`}>
      <div className="flex items-center gap-4">
        <div className="text-2xl">{isArrived ? '🔔' : '🚚'}</div>
        <div>
          <p className="text-[10px] uppercase font-black opacity-60">Заказ в пути</p>
          <p className="font-black text-lg leading-tight uppercase">{isArrived ? 'ЖДЕТ У ДВЕРЕЙ!' : order.status}</p>
        </div>
      </div>
      {isArrived && <span className="text-[10px] bg-white text-orange-600 px-3 py-1 rounded-full font-black">ВЫХОДИТЕ</span>}
    </div>
  );
}

// --- ГЛАВНАЯ СТРАНИЦА (СЕТКА 2 В РЯД) ---
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
    const phone = prompt("Введите номер телефона:");
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
      alert("Заказ принят!");
      window.location.reload();
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-4 pb-32">
      <header className="flex justify-between items-center mb-8 px-2">
        <h1 className="text-3xl font-black text-orange-500 uppercase italic leading-none">Маркет<br/>Радужный</h1>
        <div className="w-10 h-10 bg-zinc-900 rounded-full border border-zinc-800 flex items-center justify-center text-xl">🛒</div>
      </header>

      {/* Сетка: grid-cols-2 делает 2 товара в ряд */}
      <div className="grid grid-cols-2 gap-3">
        {products.map((p) => (
          <div key={p.id} className="bg-zinc-900 rounded-[2.2rem] overflow-hidden border border-zinc-800 p-2 shadow-xl">
            <div className="relative h-36 w-full rounded-[1.8rem] overflow-hidden mb-3">
              <img src={p.image_url} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="px-2 pb-2">
              <h2 className="font-bold text-[13px] leading-tight mb-1 h-8 overflow-hidden line-clamp-2">{p.name}</h2>
              <p className="text-orange-500 font-black text-lg mb-3">{p.price}₽</p>
              <button 
                onClick={() => handleBuy(p)} 
                className="w-full bg-white text-black py-2.5 rounded-2xl font-black text-[10px] uppercase active:scale-95 transition-all shadow-md"
              >
                Купить
              </button>
            </div>
          </div>
        ))}
      </div>

      <OrderStatusTracker />
    </main>
  );
}