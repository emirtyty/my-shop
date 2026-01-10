"use client";

import React, { useState } from 'react';

export default function AdminPage() {
  const [tab, setTab] = useState<'products' | 'orders'>('products');

  // Данные защищены от ошибок .slice()
  const products = [
    { id: "ID-12345", name: "PREMIUM FLOWERS", price: 4950 }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-orange-500 mb-8 italic uppercase tracking-tighter">
          DARK PANEL <span className="text-white/20">|</span> ADMIN
        </h1>

        <div className="flex gap-4 mb-10 bg-white/5 p-2 rounded-2xl border border-white/5 inline-flex">
          <button 
            onClick={() => setTab('products')}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${tab === 'products' ? 'bg-orange-500 text-white' : 'text-white/40 hover:bg-white/5'}`}
          >
            ТОВАРЫ
          </button>
          <button 
            onClick={() => setTab('orders')}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${tab === 'orders' ? 'bg-orange-500 text-white' : 'text-white/40 hover:bg-white/5'}`}
          >
            ЗАКАЗЫ
          </button>
        </div>

        {tab === 'products' ? (
          <div className="grid gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex justify-between items-center hover:bg-white/[0.07] transition-all">
                <div>
                  <div className="text-[10px] font-black text-orange-500/50 mb-1">ID: {p.id}</div>
                  <div className="text-xl font-black uppercase tracking-tight">{p.name}</div>
                  <div className="text-2xl font-black text-white mt-1">{p.price} ₽</div>
                </div>
                <button className="bg-red-500/10 text-red-500 px-6 py-3 rounded-2xl font-black text-xs hover:bg-red-500 hover:text-white transition-all uppercase">
                  Удалить
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <p className="text-white/20 font-black uppercase tracking-widest text-sm">Список заказов пуст</p>
          </div>
        )}
      </div>
    </div>
  );
}