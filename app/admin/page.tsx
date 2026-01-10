"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  FiPackage, FiClock, FiCheckCircle, FiTrash2, 
  FiLogOut, FiPlus, FiArchive, FiEdit3 
} from 'react-icons/fi';

// Твои проверенные данные подключения
const supabase = createClient(
  'https://mnzsmbqwvlrmoahtosux.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uenNtYnF3dmxybW9haHRvc3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTA4OTcsImV4cCI6MjA4MjY4Njg5N30.PBoo9FHj4_SjdXZBy-gABjLo4OfF0NW7cIgVSYemkr8'
);

export default function AdminPage() {
  const [tab, setTab] = useState<'products' | 'orders' | 'archive'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [archive, setArchive] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Загружаем из твоей таблицы product_market
      const { data: prodData, error: prodErr } = await supabase
        .from('product_market')
        .select('*');
      
      if (prodErr) console.error("Ошибка товаров:", prodErr.message);
      if (prodData) setProducts(prodData);

      // 2. Загружаем заказы из таблицы orders
      const { data: ordData } = await supabase
        .from('orders')
        .select('*');

      if (ordData) {
        setOrders(ordData.filter((o: any) => o.status !== 'completed'));
        setArchive(ordData.filter((o: any) => o.status === 'completed'));
      }
    } catch (err) {
      console.error("Критическая ошибка:", err);
    }
    setLoading(false);
  }

  async function deleteProduct(id: string) {
    if(!confirm('Удалить этот товар?')) return;
    const { error } = await supabase.from('product_market').delete().eq('id', id);
    if (!error) setProducts(products.filter(p => p.id !== id));
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-5xl font-black italic text-orange-500 uppercase tracking-tighter leading-none">Dark Panel</h1>
            <p className="text-[10px] text-white/20 font-bold uppercase mt-2 tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Connected: product_market
            </p>
          </div>
          <button className="bg-white/5 p-4 rounded-2xl hover:text-red-500 transition-all group">
            <FiLogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-10 bg-white/5 p-2 rounded-[2.5rem] border border-white/5 w-fit shadow-2xl">
          <button onClick={() => setTab('products')} className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] font-black transition-all text-xs uppercase tracking-widest ${tab === 'products' ? 'bg-orange-500 shadow-xl shadow-orange-500/20' : 'text-white/40 hover:bg-white/5'}`}>
            <FiPackage size={18} /> Витрина ({products.length})
          </button>
          <button onClick={() => setTab('orders')} className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] font-black transition-all text-xs uppercase tracking-widest ${tab === 'orders' ? 'bg-orange-500 shadow-xl shadow-orange-500/20' : 'text-white/40 hover:bg-white/5'}`}>
            <FiClock size={18} /> Заказы ({orders.length})
          </button>
          <button onClick={() => setTab('archive')} className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] font-black transition-all text-xs uppercase tracking-widest ${tab === 'archive' ? 'bg-orange-500 shadow-xl shadow-orange-500/20' : 'text-white/40 hover:bg-white/5'}`}>
            <FiArchive size={18} /> Архив
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center animate-pulse font-black uppercase text-white/10 text-xl tracking-tighter">Синхронизация...</div>
        ) : (
          <>
            {tab === 'products' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button className="h-full min-h-[280px] border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center gap-4 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all group">
                  <FiPlus size={30} className="text-orange-500" />
                  <span className="font-black uppercase tracking-widest text-[10px] text-white/40">Добавить в базу</span>
                </button>

                {products.map(p => (
                  <div key={p.id} className="bg-white/5 border border-white/10 rounded-[3rem] p-6 hover:bg-white/[0.08] transition-all relative group shadow-2xl">
                    <div className="flex items-center gap-4 mb-6">
                      {/* Используем p.image_url, как в твоей базе */}
                      <img src={p.image_url} className="w-20 h-20 rounded-3xl object-cover border border-white/10" alt="" />
                      <div>
                        <div className="text-[10px] font-black text-orange-500/50 uppercase mb-1 truncate w-24">ID: {p.id.slice(0, 8)}</div>
                        <div className="text-xl font-black uppercase tracking-tight truncate w-32">{p.name}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-3xl font-black italic tracking-tighter text-white">
                        {p.price} <span className="text-orange-500 text-xl font-sans">₽</span>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 transition-all"><FiEdit3 size={18} /></button>
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
                  <div key={o.id} className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-white/20 transition-all">
                    <div className="flex gap-6 items-center">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${o.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                        {o.status === 'completed' ? <FiCheckCircle size={24} /> : <FiClock size={24} />}
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-white/30 uppercase mb-1">ID: {o.id.slice(0, 8)}</div>
                        <div className="text-xl font-black uppercase tracking-tight">{o.items_summary || 'Заказ цветов'}</div>
                        <div className="text-orange-500 font-bold mt-1 text-2xl tracking-tighter font-mono">{o.total_price} ₽</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}