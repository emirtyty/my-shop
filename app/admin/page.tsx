"use client";

import React, { useState, useEffect } from 'react';
import { 
  FiPackage, FiClock, FiCheckCircle, FiTrash2, 
  FiLogOut, FiPlus, FiTag, FiArchive, FiEdit3 
} from 'react-icons/fi';

export default function AdminPage() {
  const [tab, setTab] = useState<'products' | 'orders' | 'archive'>('products');
  
  // Состояния для данных
  const [products, setProducts] = useState([
    { id: "777", name: "PREMIUM ROSES", price: 4950, discount: 10, image: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=200&h=200&fit=crop" },
    { id: "778", name: "WHITE TULIPS", price: 3200, discount: 0, image: "https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?q=80&w=200&h=200&fit=crop" }
  ]);

  const [orders, setOrders] = useState([
    { id: "ORD-101", items: "Premium Roses x1", total: 4455, status: "pending", date: "10.01.2026" }
  ]);

  const [archive, setArchive] = useState([
    { id: "ORD-099", items: "White Tulips x2", total: 6400, status: "completed", date: "09.01.2026" }
  ]);

  // Функции управления
  const deleteProduct = (id: string) => setProducts(products.filter(p => p.id !== id));
  
  const completeOrder = (order: any) => {
    setOrders(orders.filter(o => o.id !== order.id));
    setArchive([...archive, { ...order, status: 'completed' }]);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans selection:bg-orange-500/30">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter text-orange-500 uppercase leading-none">
              Dark Panel
            </h1>
            <div className="flex gap-4 mt-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30 px-3 py-1 bg-white/5 rounded-full border border-white/10">v2.1 Stable</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-green-500 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Online
              </span>
            </div>
          </div>
          <button className="flex items-center gap-3 bg-white/5 hover:bg-red-500/10 hover:text-red-500 px-6 py-3 rounded-2xl border border-white/10 transition-all font-bold text-sm uppercase group">
            <FiLogOut /> Выход
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-3 mb-10 bg-white/5 p-2 rounded-[2.5rem] border border-white/5 w-fit">
          <button onClick={() => setTab('products')} className={`flex items-center gap-3 px-6 py-4 rounded-[1.8rem] font-black transition-all text-xs uppercase tracking-widest ${tab === 'products' ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'text-white/40 hover:bg-white/5'}`}>
            <FiPackage size={16} /> Товары
          </button>
          <button onClick={() => setTab('orders')} className={`flex items-center gap-3 px-6 py-4 rounded-[1.8rem] font-black transition-all text-xs uppercase tracking-widest ${tab === 'orders' ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'text-white/40 hover:bg-white/5'}`}>
            <FiClock size={16} /> Активные ({orders.length})
          </button>
          <button onClick={() => setTab('archive')} className={`flex items-center gap-3 px-6 py-4 rounded-[1.8rem] font-black transition-all text-xs uppercase tracking-widest ${tab === 'archive' ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'text-white/40 hover:bg-white/5'}`}>
            <FiArchive size={16} /> Архив
          </button>
        </div>

        {/* Content Section */}
        {tab === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <button className="h-full min-h-[280px] border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center gap-4 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all group">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><FiPlus size={30} className="text-orange-500" /></div>
              <span className="font-black uppercase tracking-widest text-[10px] text-white/40">Добавить новый лот</span>
            </button>

            {products.map(p => (
              <div key={p.id} className="bg-white/5 border border-white/10 rounded-[3rem] p-6 hover:bg-white/[0.08] transition-all relative overflow-hidden group">
                {p.discount > 0 && (
                  <div className="absolute top-6 right-6 bg-orange-500 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase">-{p.discount}%</div>
                )}
                <div className="flex items-center gap-4 mb-6">
                  <img src={p.image} className="w-20 h-20 rounded-3xl object-cover border border-white/10 shadow-2xl" alt="" />
                  <div>
                    <div className="text-[10px] font-black text-orange-500/50 uppercase mb-1">ID: {p.id}</div>
                    <div className="text-xl font-black uppercase tracking-tight">{p.name}</div>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-xs font-bold text-white/20 line-through">{p.price} ₽</div>
                    <div className="text-3xl font-black italic tracking-tighter text-white">
                      {Math.round(p.price * (1 - p.discount / 100))} <span className="text-orange-500 text-xl">₽</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all"><FiEdit3 size={18} /></button>
                    <button onClick={() => deleteProduct(p.id)} className="p-4 bg-red-500/10 hover:bg-red-500 rounded-2xl text-red-500 hover:text-white transition-all"><FiTrash2 size={18} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(tab === 'orders' || tab === 'archive') && (
          <div className="grid gap-4">
            {(tab === 'orders' ? orders : archive).map(o => (
              <div key={o.id} className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-white/20 transition-all">
                <div className="flex gap-6 items-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${o.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                    {o.status === 'completed' ? <FiCheckCircle size={24} /> : <FiClock size={24} />}
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-white/30 uppercase mb-1">{o.date} | {o.id}</div>
                    <div className="text-xl font-black uppercase tracking-tight">{o.items}</div>
                    <div className="text-orange-500 font-bold mt-1">{o.total} ₽</div>
                  </div>
                </div>
                {o.status === 'pending' && (
                  <button onClick={() => completeOrder(o)} className="w-full md:w-auto bg-white text-black px-10 py-4 rounded-2xl font-black text-xs uppercase hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/5">
                    <FiCheckCircle /> Завершить заказ
                  </button>
                )}
              </div>
            ))}
            {(tab === 'orders' ? orders : archive).length === 0 && (
              <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[4rem]">
                <p className="text-white/10 font-black uppercase tracking-[0.4em] text-xs">Нет данных для отображения</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}