'use client';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
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

  if (!seller) return <div className="p-10 text-white font-bold text-center">Загрузка данных продавца...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      <header className="mb-8 px-2">
        <h1 className="text-2xl font-black text-orange-500 uppercase italic leading-none">Заказы</h1>
        <p className="text-zinc-500 text-xs mt-1">Магазин: {seller.shop_name}</p>
      </header>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-zinc-900 rounded-[2.5rem] p-6 border border-zinc-800 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="max-w-[70%]">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1 tracking-widest">Товары</p>
                <h3 className="text-base font-bold leading-tight">{order.product_name}</h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                order.status === 'У дверей' ? 'bg-orange-500 text-white animate-pulse' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {order.status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 bg-black/30 p-3 rounded-2xl">
              <div>
                <p className="text-[9px] text-zinc-500 uppercase font-bold">Сумма</p>
                <p className="font-black text-orange-500">{order.price}₽</p>
              </div>
              <div>
                <p className="text-[9px] text-zinc-500 uppercase font-bold">Клиент</p>
                <p className="font-bold text-xs">{order.buyer_phone}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => updateStatus(order.id, 'Собираю')} className="bg-zinc-800 hover:bg-zinc-700 py-3 rounded-2xl text-[10px] font-bold uppercase transition-all">📦 Сборка</button>
              <button onClick={() => updateStatus(order.id, 'Доставляется')} className="bg-zinc-800 hover:bg-zinc-700 py-3 rounded-2xl text-[10px] font-bold uppercase transition-all">🚚 В пути</button>
              <button onClick={() => updateStatus(order.id, 'У дверей')} className="col-span-2 bg-orange-500 hover:bg-orange-600 py-4 rounded-2xl text-xs font-black uppercase shadow-lg shadow-orange-500/20 transition-all active:scale-95">📍 Я У ДВЕРЕЙ / ГОТОВО</button>
              <button onClick={() => updateStatus(order.id, 'Завершен')} className="col-span-2 text-zinc-600 py-2 text-[9px] font-bold uppercase mt-2">Завершить и скрыть</button>
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-center text-zinc-600 mt-20 font-bold uppercase text-xs tracking-widest">Заказов пока нет</p>}
      </div>
    </div>
  );
}