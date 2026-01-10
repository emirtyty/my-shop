"use client";

import React, { useState, useEffect } from 'react';

// Заменяем иконки на обычный текст, чтобы проект ТОЧНО собрался без ошибок библиотек
const Admin = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Имитация данных
    const mockProducts = [
      { id: '1', name: 'РОЗЫ', price: 4950, image: 'https://via.placeholder.com/150' }
    ];
    const mockOrders = [
      { id: '101', items: 'РОЗЫ (3 шт)', date: '10.01.2026' }
    ];
    setProducts(mockProducts);
    setOrders(mockOrders);
    setLoading(false);
  }, []);

  // Максимально безопасная функция форматирования ID
  const formatId = (id: any) => {
    const strId = String(id || '');
    return strId.length > 4 ? strId.slice(-4).toUpperCase() : strId;
  };

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-bold">ЗАГРУЗКА...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans p-4">
      <nav className="max-w-7xl mx-auto flex items-center justify-between mb-10 bg-white/5 p-4 rounded-2xl border border-white/10">
        <h1 className="text-xl font-black text-orange-500 italic uppercase">ADMIN PANEL</h1>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('products')} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === 'products' ? 'bg-orange-500' : 'bg-white/5'}`}>ТОВАРЫ</button>
          <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === 'orders' ? 'bg-orange-500' : 'bg-white/5'}`}>ЗАКАЗЫ</button>
        </div>
        <button onClick={() => { localStorage.removeItem('isAdmin'); window.location.reload(); }} className="text-xs font-bold text-red-500 uppercase">Выйти</button>
      </nav>

      <main className="max-w-7xl mx-auto">
        {activeTab === 'products' ? (
          <div className="grid gap-4">
            {products.map((p) => (
              <div key={p.id} className="bg-white/5 p-4 rounded-3xl border border-white/5 flex items-center gap-4">
                <div className="w-16 h-16 bg-black rounded-xl overflow-hidden"><img src={p.image} className="w-full h-full object-cover" alt="" /></div>
                <div className="flex-1">
                  <div className="text-[10px] text-white/30 font-bold">ID: {formatId(p.id)}</div>
                  <div className="font-black uppercase">{p.name}</div>
                  <div className="text-orange-500 font-black">{p.price} ₽</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((o) => (
              <div key={o.id} className="bg-white/5 p-6 rounded-3xl border border-white/5 flex justify-between items-center">
                <div>
                  <div className="font-black text-lg">ЗАКАЗ #{formatId(o.id)}</div>
                  <div className="text-sm text-white/40">{o.items}</div>
                </div>
                <div className="text-xs font-bold bg-green-500/10 text-green-500 px-3 py-1 rounded-full border border-green-500/20">АКТИВЕН</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;