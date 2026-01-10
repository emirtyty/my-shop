"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  FiPackage, FiClock, FiCheckCircle, FiTrash2, 
  FiLogOut, FiPlus, FiTag, FiArchive, FiEdit3 
} from 'react-icons/fi';

// Инициализация по твоей точной ссылке и ключу
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
      // Подтягиваем товары и заказы из Supabase
      const [prodRes, ordRes] = await Promise.all([
        supabase.from('products').select('*').order('id', { ascending: true }),
        supabase.from('orders').select('*')
      ]);

      if (prodRes.data) setProducts(prodRes.data);
      if (ordRes.data) {
        setOrders(ordRes.data.filter((o: any) => o.status !== 'completed'));
        setArchive(ordRes.data.filter((o: any) => o.status === 'completed'));
      }
    } catch (err) {
      console.error("Connection Error:", err);
    }
    setLoading(false);
  }

  // Функция удаления товара
  async function deleteProduct(id: string) {
    if(!confirm('Удалить этот товар из базы?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) setProducts(products.filter(p => p.id !== id));
    else alert('Ошибка при удалении: ' + error.message);
  }

  // Функция завершения заказа
  async function completeOrder(orderId: string) {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId);
    
    if (!error) loadData(); 
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans selection:bg-orange-500/30">
      <div className="max-w-6xl mx-auto">
        
        {/* Шапка */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter text-orange-500 uppercase leading-none">
              Dark Panel
            </h1>
            <p className="text-white/30 font-bold uppercase tracking-[0.2em] text-[10px] mt-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Supabase Link Established
            </p>
          </div>
          <button className="flex items-center gap-3 bg-white/5 hover:bg-red-500/10 hover:text-red-500 px-6 py-3 rounded-2xl border border-white/10 transition-all font-bold text-sm uppercase">
            <FiLogOut /> Выход
          </button>
        </div>

        {/* Переключатели вкладок */}
        <div className="flex flex-wrap gap-3 mb-10 bg-white/5 p-2 rounded-[2.5rem] border border-white/5 w-fit">
          <button 
            onClick={() => setTab('products')}
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] font-black transition-all text-xs uppercase tracking-widest ${tab === 'products' ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'text-white/40'}`}
          >
            <FiPackage size={18} /> Витрина ({products.length})
          </button>
          <button 
            onClick={() => setTab('orders')}
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] font-black transition-all text-xs uppercase tracking-widest ${tab === 'orders' ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'text-white/40'}`}
          >
            <FiClock size={18} /> Заказы ({orders.length})
          </button>
          <button 
            onClick={() => setTab('archive')}
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] font-black transition-all text-xs uppercase tracking-widest ${tab === 'archive' ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'text-white/40'}`}
          >
            <FiArchive size={18} /> Архив
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center animate-pulse font-black uppercase tracking-widest text-white/10 text-2xl">
            Загрузка данных из облака...
          </div>
        ) : (
          <>
            {/* Вкладка товаров */}
            {tab === 'products' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button className="h-full min-h-[280px] border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center gap-4 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all group">
                  <FiPlus size={30} className="text-orange-500 group-hover:scale-125 transition-transform" />
                  <span className="font-black uppercase tracking-widest text-[10px] text-white/40">Добавить товар</span>
                </button>

                {products.map(p => (
                  <div key={p.id} className="bg-white/5 border border-white/10 rounded-[3rem] p-6 hover:bg-white/[0.08] transition-all relative overflow-hidden group">
                    <div className="flex items-center gap-4 mb-6">
                      <img src={p.image} className="w-20 h-20 rounded-3xl object-cover border border-white/10 shadow-2xl" alt="" />
                      <div>
                        <div className="text-[10px] font-black text-orange-500/50 uppercase mb-1">ID: {p.id}</div>
                        <div className="text-xl font-black uppercase tracking-tight truncate w-32 font-mono">{p.name}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-3xl font-black italic tracking-tighter text-white">
                        {p.price} <span className="text-orange-500 text-xl font-sans">₽</span>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 transition-all">
                          <FiEdit3 size={18} />
                        </button>
                        <button onClick={() => deleteProduct(p.id)} className="p-4 bg-red-500/10 hover:bg-red-500 rounded-2xl text-red-500 hover:text-white transition-all">
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Вкладка заказов */}
            {(tab === 'orders' || tab === 'archive') && (
              <div className="grid gap-4">
                {(tab === 'orders' ? orders : archive).map(o => (
                  <div key={o.id} className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-white/20 transition-all shadow-lg">
                    <div className="flex gap-6 items-center">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${o.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                        {o.status === 'completed' ? <FiCheckCircle size={24} /> : <FiClock size={24} />}
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-white/30 uppercase mb-1">ID: {o.id}</div>
                        <div className="text-xl font-black uppercase tracking-tight">{o.items_summary || 'Заказ цветов'}</div>
                        <div className="text-orange-500 font-bold mt-1 text-2xl tracking-tighter font-mono">{o.total_price} ₽</div>
                      </div>
                    </div>
                    {o.status === 'pending' && (
                      <button onClick={() => completeOrder(o.id)} className="w-full md:w-auto bg-white text-black px-10 py-4 rounded-2xl font-black text-xs uppercase hover:bg-orange-500 hover:text-white transition-all shadow-xl">
                        Завершить заказ
                      </button>
                    )}
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