'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [seller, setSeller] = useState(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('seller_session') || '{}');
    if (session.telegram_id) {
      setSeller(session);
      fetchOrders(session.telegram_id);
    }
  }, []);

  const fetchOrders = async (id) => {
    const { data } = await supabase.from('orders').select('*').eq('seller_id', id).order('created_at', { ascending: false });
    setOrders(data || []);
  };

  const updateStatus = async (orderId, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) fetchOrders(seller.telegram_id);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <h1 className="text-xl font-bold mb-6 text-orange-500">Управление заказами</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">{order.product_name}</h3>
                <p className="text-zinc-500 text-sm">Покупатель: {order.buyer_phone}</p>
              </div>
              <span className="bg-orange-500/10 text-orange-500 text-[10px] px-2 py-1 rounded-full font-bold uppercase">
                {order.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => updateStatus(order.id, 'Собираю')} className="bg-zinc-800 py-3 rounded-xl text-xs hover:bg-zinc-700">📦 Собираю</button>
              <button onClick={() => updateStatus(order.id, 'Доставляется')} className="bg-zinc-800 py-3 rounded-xl text-xs hover:bg-zinc-700">🚚 В пути</button>
              <button onClick={() => updateStatus(order.id, 'У дверей')} className="bg-orange-500 py-3 rounded-xl text-xs font-bold col-span-2 animate-pulse">📍 У ДВЕРЕЙ / ГОТОВО</button>
              <button onClick={() => updateStatus(order.id, 'Завершен')} className="bg-green-600 py-3 rounded-xl text-xs font-bold col-span-2 mt-2">✅ Завершить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}