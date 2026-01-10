"use client";

import React, { useState, useEffect } from 'react';
import { 
  FiPackage, 
  FiClock, 
  FiCheckCircle, 
  FiTrash2, 
  FiLogOut,
  FiPlus
} from 'react-icons/fi';

export default function AdminPage() {
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  
  // Тестовые данные (потом подключим БД)
  const [products] = useState([
    { id: "PROD-777", name: "PREMIUM FLOWERS", price: 4950, image: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=200&h=200&fit=crop" }
  ]);

  const [orders] = useState([
    { id: "ORD-101", items: "Premium Flowers x1", status: "pending", date: "10.01.2026" }
  ]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans selection:bg-orange-500/30">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter text-orange-500 uppercase leading-none">
              Dark Panel
            </h1>
            <p className="text-white/30 font-bold uppercase tracking-[0.2em] text-xs mt-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              System Online / Root Access
            </p>
          </div>
          <button className="flex items-center gap-3 bg-white/5 hover:bg-red-500/10 hover:text-red-500 px-6 py-3 rounded-2xl border border-white/10 transition-all font-bold text-sm uppercase group">
            <FiLogOut className="group-hover:-translate-x-1 transition-transform" />
            Выход
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-10 bg-white/5 p-2 rounded-[2rem] border border-white/5 w-fit">
          <button 
            onClick={() => setTab('products')}
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black transition-all text-sm uppercase tracking-widest ${tab === 'products' ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'text-white/40 hover:bg-white/5'}`}
          >
            <FiPackage size={18} />
            Товары
          </button>
          <button 
            onClick={() => setTab('orders')}
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black transition-all text-sm uppercase tracking-widest ${tab === 'orders' ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'text-white/40 hover:bg-white/5'}`}
          >
            <FiClock size={18} />
            Заказы
          </button>
        </div>

        {/* Content */}
        {tab === 'products' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Add New Card */}
            <button className="h-[280px] border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center gap-4 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all group">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <FiPlus size={30} className="text-orange-500" />
              </div>
              <span className="font-black uppercase tracking-widest text-xs text-white/40">Добавить товар</span>
            </button>

            {products.map(p => (
              <div key={p.id} className="bg-white/5 border border-white/10 rounded-[3rem] p-6 hover:bg-white/[0.07] transition-all group relative overflow-hidden">
                <div className="flex items-center gap-4 mb-6">
                  <img src={p.image} className="w-20 h-20 rounded-3xl object-cover border border-white/10" alt={p.name} />
                  <div>
                    <div className="text-[10px] font-black text-orange-500/50 uppercase mb-1">ID: {p.id}</div>
                    <div className="text-xl font-black uppercase tracking-tight leading-none">{p.name}</div>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-3xl font-black italic tracking-tighter">{p.price} ₽</div>
                  <button className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                    <FiTrash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.length > 0 ? orders.map(o => (
              <div key={o.id} className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex gap-6 items-center">
                  <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500">
                    <FiClock size={24} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white/30 uppercase mb-1">{o.date} | {o.id}</div>
                    <div className="text-xl font-black uppercase">{o.items}</div>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button className="flex-1 md:flex-none bg-green-500 text-black px-8 py-4 rounded-2xl font-black text-xs uppercase hover:scale-105 transition-transform flex items-center justify-center gap-2">
                    <FiCheckCircle />
                    Завершить
                  </button>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3.5rem]">
                <p className="text-white/20 font-black uppercase tracking-[0.3em] text-sm">Список заказов пуст</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}