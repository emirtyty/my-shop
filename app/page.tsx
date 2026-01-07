'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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
          <p className="text-[10px] uppercase font-black opacity-60">Статус заказа</p>
          <p className="font-black text-lg leading-tight uppercase">{isArrived ? 'У ВАШИХ ДВЕРЕЙ!' : order.status}</p>
        </div>
      </div>
      {isArrived && <span className="text-[10px] bg-white text-orange-600 px-3 py-1 rounded-full font-black">ВЫХОДИТЕ</span>}
    </div>
  );
}

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
      <h1 className="text-3xl font-black mb-8 text-orange-500 uppercase italic">Маркет Радужный</h1>
      <div className="grid grid-cols-2 gap-4">
        {products.map((p) => (
          <div key={p.id} className="bg-zinc-900 rounded-[2rem] overflow-hidden border border-zinc-800 p-2 shadow-xl">
            <img src={p.image_url} alt="" className="w-full h-32 object-cover rounded-2xl mb-2" />
            <h2 className="font-bold text-[13px] px-2 h-10 overflow-hidden leading-tight">{p.name}</h2>
            <div className="flex justify-between items-center p-2 mt-2">
              <span className="text-orange-500 font-black">{p.price}₽</span>
              <button onClick={() => handleBuy(p)} className="bg-white text-black text-[10px] px-4 py-2 rounded-xl font-bold uppercase active:scale-90 transition-transform">Купить</button>
            </div>
          </div>
        ))}
      </div>
      <OrderStatusTracker />
    </main>
  );
}