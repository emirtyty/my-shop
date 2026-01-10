"use client";

import React, { useState, useEffect } from 'react';
import { 
  FiPackage, 
  FiTrash2, 
  FiSearch, 
  FiLogOut,
  FiPlus,
  FiBox
} from 'react-icons/fi';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [isLogged, setIsLogged] = useState(true); // Пока ставим true для теста

  // Моковые данные (потом заменим на реальные)
  const products = [
    { id: 'prod_12345', name: 'Premium Roses', price: 4950, image: 'https://images.unsplash.com/photo-1548610762-656037c8811c?q=80&w=200&h=200&fit=crop' },
  ];

  const orders = [
    { id: 'ord_998877', items: 'Red Roses x3, White Tulips x1', status: 'active', date: '10.01.2026' },
  ];

  // Безопасное форматирование ID
  const formatId = (id: any) => {
    const s = String(id || '');
    return s.length > 6 ? s.slice(-6).toUpperCase() : s.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30">
      {/* Навигационная панель */}
      <nav className="border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-black italic tracking-tighter text-orange-500 uppercase">
              DARK <span className="text-white">PANEL</span>
            </h1>
            <div className="hidden md:flex bg-white/5 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setActiveTab('products')}
                className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'products' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'hover:bg-white/5 text-white/40'}`}
              >
                ТОВАРЫ
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'orders' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'hover:bg-white/5 text-white/40'}`}
              >
                ЗАКАЗЫ
              </button>
            </div>
          </div>
          
          <button className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all group">
            <FiLogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Инструменты */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input 
              type="text"
              placeholder="ПОИСК ПО БАЗЕ ДАННЫХ..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-orange-500/50 transition-all font-bold text-sm"
            />
          </div>
          <button className="bg-white text-black px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-orange-500 hover:text-white transition-all active:scale-95 text-sm uppercase tracking-tight">
            <FiPlus size={18} />
            Добавить товар
          </button>
        </div>

        {/* Контент */}
        {activeTab === 'products' ? (
          <div className="grid grid-cols-1 gap-4">
            {products.map((item) => (
              <div key={item.id} className="group bg-white/5 border border-white/5 p-4 rounded-3xl flex items-center gap-6 hover:bg-white/[0.08] transition-all border-l-4 border-l-transparent hover:border-l-orange-500">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-black border border-white/10 shrink-0">
                  <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-orange-500/50 mb-1 uppercase tracking-widest">
                    ID: {formatId(item.id)}
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight truncate">{item.name}</h3>
                  <div className="text-xl font-black text-white mt-1">{item.price} <span className="text-orange-500">₽</span></div>
                </div>
                <div className="flex gap-2">
                  <button className="bg-white/5 hover:bg-red-500/20 text-white/20 hover:text-red-500 w-12 h-12 rounded-2xl flex items-center justify-center transition-all border border-white/5">
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white/5 border border-white/5 p-6 rounded-3xl hover:border-orange-500/30 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 border border-orange-500/20">
                      <FiPackage size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-black text-lg uppercase tracking-tighter">Заказ #{formatId(order.id)}</span>
                        <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-black rounded-full uppercase border border-green-500/20">
                          {order.status}
                        </span>
                      </div>
                      <p className="text-white/40 text-sm font-medium">{order.items}</p>
                    </div>
                  </div>
                  <button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase transition-all shadow-lg shadow-orange-500/20">
                    Завершить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}