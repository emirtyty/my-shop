"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  FiPackage, FiClock, FiTrash2, FiLogOut, FiPlus, 
  FiX, FiCamera, FiEdit3, FiCheckCircle, FiArchive, FiTruck
} from 'react-icons/fi';

const supabase = createClient(
  'https://mnzsmbqwvlrmoahtosux.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uenNtYnF3dmxybW9haHRvc3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTA4OTcsImV4cCI6MjA4MjY4Njg5N30.PBoo9FHj4_SjdXZBy-gABjLo4OfF0NW7cIgVSYemkr8'
);

export default function AdminPage() {
  const [tab, setTab] = useState<'products' | 'orders' | 'archive'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [newProduct, setNewProduct] = useState({ name: '', price: 0, discount: 0, image_url: '' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [pRes, oRes] = await Promise.all([
      supabase.from('product_market').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false })
    ]);
    if (pRes.data) setProducts(pRes.data);
    if (oRes.data) setOrders(oRes.data);
    setLoading(false);
  }

  // Изменение статуса заказа
  async function updateOrderStatus(orderId: string, newStatus: string) {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    if (!error) loadData();
  }

  // Работа с товарами
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
    await supabase.storage.from('products').upload(fileName, file);
    const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
    setNewProduct({ ...newProduct, image_url: publicUrl });
    setIsUploading(false);
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('product_market').insert([newProduct]);
    if (!error) { setShowAddModal(false); setNewProduct({ name: '', price: 0, discount: 0, image_url: '' }); loadData(); }
  }

  async function handleUpdatePrice(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('product_market').update({ price: editingProduct.price, discount: editingProduct.discount }).eq('id', editingProduct.id);
    setEditingProduct(null);
    loadData();
  }

  async function deleteProduct(id: string) {
    if(!confirm('Удалить товар?')) return;
    await supabase.from('product_market').delete().eq('id', id);
    loadData();
  }

  const activeOrders = orders.filter(o => o.status !== 'completed');
  const archivedOrders = orders.filter(o => o.status === 'completed');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans selection:bg-orange-500/30">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-black italic text-orange-500 uppercase tracking-tighter leading-none">Dark Admin</h1>
          <button className="bg-white/5 p-4 rounded-2xl hover:text-red-500 transition-all"><FiLogOut size={20}/></button>
        </div>

        {/* Навигация */}
        <div className="flex flex-wrap gap-2 mb-10 bg-white/5 p-2 rounded-[2rem] border border-white/5 w-fit">
          <button onClick={() => setTab('products')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'products' ? 'bg-orange-500 text-white' : 'text-white/40'}`}>
            <FiPackage /> Витрина
          </button>
          <button onClick={() => setTab('orders')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'orders' ? 'bg-orange-500 text-white' : 'text-white/40'}`}>
            <FiClock /> Заказы ({activeOrders.length})
          </button>
          <button onClick={() => setTab('archive')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'archive' ? 'bg-orange-500 text-white' : 'text-white/40'}`}>
            <FiArchive /> Архив
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center animate-pulse font-black uppercase text-white/10">Загрузка данных...</div>
        ) : (
          <>
            {/* Витрина */}
            {tab === 'products' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button onClick={() => setShowAddModal(true)} className="h-[250px] border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 hover:border-orange-500/50 transition-all group">
                  <FiPlus size={24} className="text-orange-500 group-hover:scale-125 transition-transform" />
                  <span className="font-black uppercase text-[9px] text-white/40 tracking-widest">Добавить товар</span>
                </button>

                {products.map(p => (
                  <div key={p.id} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-5 relative overflow-hidden group">
                    {p.discount > 0 && <div className="absolute top-4 right-4 bg-orange-500 text-black px-2 py-1 rounded-lg text-[9px] font-black">-{p.discount}%</div>}
                    <div className="flex items-center gap-4 mb-4">
                      <img src={p.image_url} className="w-16 h-16 rounded-2xl object-cover border border-white/10" alt="" />
                      <div className="font-black uppercase truncate text-sm flex-1">{p.name}</div>
                    </div>
                    <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl">
                      <div className="text-xl font-black italic">{p.discount > 0 ? Math.round(p.price * (1 - p.discount/100)) : p.price} <span className="text-orange-500 text-xs">₽</span></div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingProduct(p)} className="p-2 bg-white/5 hover:bg-orange-500 rounded-lg transition-all"><FiEdit3 size={14}/></button>
                        <button onClick={() => deleteProduct(p.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"><FiTrash2 size={14}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Заказы и Архив */}
            {(tab === 'orders' || tab === 'archive') && (
              <div className="space-y-4">
                {(tab === 'orders' ? activeOrders : archivedOrders).map(o => (
                  <div key={o.id} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex gap-5 items-center">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${o.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                        {o.status === 'completed' ? <FiCheckCircle size={20} /> : <FiClock size={20} />}
                      </div>
                      <div>
                        <div className="text-[9px] font-black text-white/30 uppercase mb-1 tracking-widest">Заказ #{o.id.slice(0, 8)}</div>
                        <div className="text-lg font-black uppercase tracking-tight">{o.items_summary || 'Заказ цветов'}</div>
                        <div className="text-orange-500 font-bold text-xl tracking-tighter">{o.total_price} ₽</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Смена статуса */}
                      <select 
                        value={o.status} 
                        onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                        className="bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase px-4 py-3 rounded-xl outline-none focus:border-orange-500 transition-all cursor-pointer"
                      >
                        <option value="pending" className="bg-[#111]">В обработке</option>
                        <option value="shipped" className="bg-[#111]">Доставлен</option>
                        <option value="completed" className="bg-[#111]">Завершен (в архив)</option>
                      </select>
                    </div>
                  </div>
                ))}
                {(tab === 'orders' ? activeOrders : archivedOrders).length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] text-white/10 font-black uppercase text-[10px] tracking-widest">Здесь пока ничего нет</div>
                )}
              </div>
            )}
          </>
        )}

        {/* Модалки (Редактирование и Добавление) остаются прежними для удобства работы с телефона */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4">
            <div className="bg-[#111] border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
              <h2 className="text-xl font-black uppercase text-orange-500 mb-6 italic">Прайс: {editingProduct.name}</h2>
              <form onSubmit={handleUpdatePrice} className="space-y-4">
                <input type="number" required className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none font-bold text-xl" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} />
                <input type="number" max="99" placeholder="Скидка %" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none font-bold text-orange-500 text-xl" value={editingProduct.discount || 0} onChange={e => setEditingProduct({...editingProduct, discount: Number(e.target.value)})} />
                <div className="flex gap-2 pt-4">
                  <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 bg-white/5 py-4 rounded-2xl font-black uppercase text-[10px]">Отмена</button>
                  <button type="submit" className="flex-[2] bg-orange-500 py-4 rounded-2xl font-black uppercase text-[10px]">Сохранить</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#111] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 relative">
              <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-white/20"><FiX size={24}/></button>
              <h2 className="text-2xl font-black uppercase text-orange-500 mb-8 italic">Новый товар</h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="relative h-44 w-full bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center overflow-hidden">
                  {newProduct.image_url ? (
                    <img src={newProduct.image_url} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <><FiCamera size={30} className="text-white/20 mb-2" /><span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Выбрать фото</span></>
                  )}
                  <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  {isUploading && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[10px] font-black">ЗАГРУЗКА...</div>}
                </div>
                <input type="text" placeholder="НАЗВАНИЕ" required className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold uppercase" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="ЦЕНА" required className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
                  <input type="number" placeholder="СКИДКА %" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold text-orange-500" value={newProduct.discount || ''} onChange={e => setNewProduct({...newProduct, discount: Number(e.target.value)})} />
                </div>
                <button disabled={isUploading || !newProduct.image_url} type="submit" className="w-full bg-orange-500 disabled:opacity-20 text-white font-black uppercase py-5 rounded-2xl">Опубликовать</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}