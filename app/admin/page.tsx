"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  FiPackage, FiClock, FiTrash2, FiLogOut, FiPlus, 
  FiX, FiCamera, FiEdit3, FiCheckCircle, FiArchive, FiPlayCircle
} from 'react-icons/fi';

const supabase = createClient(
  'https://mnzsmbqwvlrmoahtosux.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uenNtYnF3dmxybW9haHRvc3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTA4OTcsImV4cCI6MjA4MjY4Njg5N30.PBoo9FHj4_SjdXZBy-gABjLo4OfF0NW7cIgVSYemkr8'
);

export default function AdminPage() {
  const [tab, setTab] = useState<'products' | 'orders' | 'stories' | 'archive'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [newProduct, setNewProduct] = useState({ name: '', price: 0, discount: 0, image_url: '' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [pRes, oRes, sRes] = await Promise.all([
        supabase.from('product_market').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('stories').select('*').order('created_at', { ascending: false })
      ]);
      
      if (pRes.data) setProducts(pRes.data);
      if (oRes.data) setOrders(oRes.data);
      if (sRes.data) setStories(sRes.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function updateOrderStatus(orderId: any, newStatus: string) {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) loadData();
  }

  // Фильтрация
  const activeOrders = orders.filter(o => !o.status || (o.status !== 'completed' && o.status !== 'archive'));
  const archivedOrders = orders.filter(o => o.status === 'completed' || o.status === 'archive');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-black italic text-orange-500 uppercase tracking-tighter">Dark Admin</h1>
          <button className="bg-white/5 p-4 rounded-2xl"><FiLogOut size={20}/></button>
        </div>

        {/* Навигация */}
        <div className="flex flex-wrap gap-2 mb-10 bg-white/5 p-2 rounded-[2rem] border border-white/5 w-fit">
          <button onClick={() => setTab('products')} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${tab === 'products' ? 'bg-orange-500' : 'text-white/40'}`}>Витрина</button>
          <button onClick={() => setTab('stories')} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${tab === 'stories' ? 'bg-orange-500' : 'text-white/40'}`}>Истории</button>
          <button onClick={() => setTab('orders')} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${tab === 'orders' ? 'bg-orange-500' : 'text-white/40'}`}>Заказы ({activeOrders.length})</button>
          <button onClick={() => setTab('archive')} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${tab === 'archive' ? 'bg-orange-500' : 'text-white/40'}`}>Архив</button>
        </div>

        {loading ? (
          <div className="py-20 text-center animate-pulse text-white/20 uppercase font-black">Загрузка...</div>
        ) : (
          <>
            {/* Вкладка Заказы */}
            {tab === 'orders' && (
              <div className="space-y-4">
                {activeOrders.map(o => (
                  <div key={o.id} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-4 items-center">
                       <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center"><FiClock /></div>
                       <div>
                         <div className="text-[10px] text-white/30 uppercase font-black">ID: {String(o.id).slice(0,8)}</div>
                         <div className="font-black uppercase">{o.items_summary || 'Новый заказ'}</div>
                         <div className="text-orange-500 font-bold">{o.total_price} ₽</div>
                       </div>
                    </div>
                    <select 
                      value={o.status || 'pending'} 
                      onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                      className="bg-white/5 border border-white/10 text-[10px] font-black uppercase p-3 rounded-xl outline-none"
                    >
                      <option value="pending" className="bg-black">В обработке</option>
                      <option value="shipped" className="bg-black">Отправлен</option>
                      <option value="completed" className="bg-black">Завершен</option>
                    </select>
                  </div>
                ))}
                {activeOrders.length === 0 && <div className="text-center py-20 text-white/10 font-black uppercase">Нет новых заказов</div>}
              </div>
            )}

            {/* Вкладка Архив */}
            {tab === 'archive' && (
              <div className="space-y-4">
                {archivedOrders.map(o => (
                  <div key={o.id} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] opacity-60">
                    <div className="flex gap-4 items-center">
                       <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center"><FiCheckCircle /></div>
                       <div>
                         <div className="text-[10px] text-white/30 uppercase font-black">Архив #{String(o.id).slice(0,8)}</div>
                         <div className="font-black uppercase">{o.items_summary}</div>
                         <div className="text-white font-bold">{o.total_price} ₽</div>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Здесь должен быть твой старый код для Витрины и Историй */}
          </>
        )}
      </div>
    </div>
  );
}