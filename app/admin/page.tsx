'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminOrders() {
  const [order, setOrder] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('seller_session') || '{}');
    if (session.telegram_id) {
      setSeller(session);
      fetchOrders(session.telegram_id);
    }
  }, []);

  const fetchOrders = async (id: any) => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('seller_id', id)
      .order('created_at', { ascending: false });
    setOrders(data || []);
  };

  const updateStatus = async (orderId: any, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    
    if (!error && seller) {
      fetchOrders(seller.telegram_id);
    }
  };

  if (!seller) return <div className="p-10 text-white font-bold">Загрузка сессии продавца...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20 font-sans">
      <header className="mb-8">
        <h1 className="text-2xl font-black text-orange-500 uppercase italic">Заказы магазина</h1>
        <p className="text-zinc-500 text-sm">Продавец: {seller.shop_name}</p>
      </header>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-zinc-900 rounded-[2rem] p-6 border border-zinc-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Товары</p>
                <h3 className="text-lg font-bold leading-tight">{order.product_name}</h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                order.status === 'У дверей' ? 'bg-orange-500 text-white animate-pulse' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {order.status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Сумма</p>
                <p className="font-bold text-orange-500 italic">{order.price}₽</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Клиент</p>
                <p className="font-bold">{order.buyer_phone}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => updateStatus(order.id, 'Собираю')} className="bg-zinc-800 py-3 rounded-xl text-[10px] font-bold uppercase">📦 Сборка</button>
              <button onClick={() => updateStatus(order.id, 'Доставляется')} className="bg-zinc-800 py-3 rounded-xl text-[10px] font-bold uppercase">🚚 В пути</button>
              <button onClick={() => updateStatus(order.id, 'У дверей')} className="col-span-2 bg-orange-500 py-4 rounded-2xl text-xs font-black uppercase shadow-lg shadow-orange-500/20">📍 Я У ДВЕРЕЙ / ГОТОВО</button>
              <button onClick={() => updateStatus(order.id, 'Завершен')} className="col-span-2 bg-transparent border border-zinc-800 py-2 rounded-xl text-[9px] font-bold text-zinc-600 mt-2 uppercase">Завершить</button>
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-center text-zinc-600 mt-10">Новых заказов нет</p>}
      </div>
    </div>
  );
}