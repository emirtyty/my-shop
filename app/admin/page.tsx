"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  FiPackage, FiClock, FiTrash2, FiLogOut, FiPlus, 
  FiX, FiCamera, FiEdit3, FiCheckCircle, FiArchive, FiPlayCircle, FiTag
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
  
  // Состояния модалок
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Состояния новых данных
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, discount: 0, image_url: '' });
  const [storyImage, setStoryImage] = useState('');

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
      console.error("Ошибка загрузки данных:", e);
    }
    setLoading(false);
  }

  // --- ФУНКЦИИ ТОВАРОВ ---
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

  // --- ФУНКЦИИ ИСТОРИЙ ---
  async function addStory() {
    if (!storyImage) return;
    const { error } = await supabase.from('stories').insert([{ image_url: storyImage }]);
    if (!error) { setStoryImage(''); loadData(); }
  }

  async function deleteStory(id: string) {
    await supabase.from('stories').delete().eq('id', id);
    loadData();
  }

  // --- ФУНКЦИИ ЗАКАЗОВ ---
  async function updateOrderStatus(orderId: any, newStatus: string) {
    // Оптимистичное обновление для мгновенного отклика интерфейса
    setOrders(prev => prev.map(o => o.id === orderId ? {...o, status: newStatus} : o));
    
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
        console.error("Status update error:", error);
        loadData(); // Откат при ошибке
    }
  }

  // --- ЗАГРУЗКА ФОТО ---
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'story') {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const fileName = `${type}_${Math.random()}.${file.name.split('.').pop()}`;
    await supabase.storage.from('products').upload(fileName, file);
    const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
    
    if (type === 'product') setNewProduct({ ...newProduct, image_url: publicUrl });
    else setStoryImage(publicUrl);
    setIsUploading(false);
  }

  // Исправленная фильтрация
  const activeOrders = orders.filter(o => !o.status || (o.status !== 'completed' && o.status !== 'archive'));
  const archivedOrders = orders.filter(o => o.status === 'completed' || o.status === 'archive');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-black italic text-orange-500 uppercase tracking-tighter leading-none">Dark Admin</h1>
          <button className="bg-white/5 p-4 rounded-2xl hover:text-red-500 transition-all"><FiLogOut size={20}/></button>
        </div>

        {/* Навигация */}
        <div className="flex flex-wrap gap-2 mb-10 bg-white/5 p-2 rounded-[2rem] border border-white/5 w-fit shadow-2xl">
          <button onClick={() => setTab('products')} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${tab === 'products' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40'}`}>Витрина</button>
          <button onClick={() => setTab('stories')} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${tab === 'stories' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40'}`}>Истории</button>
          <button onClick={() => setTab('orders')} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${tab === 'orders' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40'}`}>Заказы ({activeOrders.length})</button>
          <button onClick={() => setTab('archive')} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${tab === 'archive' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40'}`}>Архив</button>
        </div>

        {loading ? (
          <div className="py-20 text-center animate-pulse text-white/10 uppercase font-black tracking-widest">Синхронизация данных...</div>
        ) : (
          <>
            {/* ВИТРИНА */}
            {tab === 'products' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button onClick={() => setShowAddModal(true)} className="h-[250px] border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 hover:border-orange-500/50 transition-all group">
                  <FiPlus size={24} className="text-orange-500 group-hover:scale-125 transition-transform" />
                  <span className="font-black uppercase text-[9px] text-white/40 tracking-widest">Добавить товар</span>
                </button>

                {products.map(p => (
                  <div key={p.id} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-5 relative overflow-hidden group shadow-xl">
                    {p.discount > 0 && <div className="absolute top-4 right-4 bg-orange-500 text-black px-2 py-1 rounded-lg text-[9px] font-black">-{p.discount}%</div>}
                    <div className="flex items-center gap-4 mb-4">
                      <img src={p.image_url} className="w-16 h-16 rounded-2xl object-cover border border-white/10 shadow-lg" alt="" />
                      <div className="font-black uppercase truncate text-sm flex-1">{p.name}</div>
                    </div>
                    <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl">
                      <div className="text-xl font-black italic">{p.discount > 0 ? Math.round(p.price * (1 - p.discount/100)) : p.price} <span className="text-orange-500 text-xs">₽</span></div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingProduct(p)} className="p-2 bg-white/5 hover:bg-orange-500 rounded-lg transition-all"><FiEdit3 size={14}/></button>
                        <button onClick={() => deleteProduct(p.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 rounded-lg transition-all"><FiTrash2 size={14}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ИСТОРИИ */}
            {tab === 'stories' && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="aspect-[9/16] border-2 border-dashed border-white/10 rounded-[2rem] relative flex flex-col items-center justify-center overflow-hidden group">
                  {storyImage ? (
                    <>
                      <img src={storyImage} className="absolute inset-0 w-full h-full object-cover opacity-50 shadow-2xl" />
                      <button onClick={addStory} className="relative z-10 bg-orange-500 px-4 py-2 rounded-xl font-black uppercase text-[10px]">Опубликовать</button>
                    </>
                  ) : (
                    <>
                      <FiPlus className="text-orange-500 mb-2" size={24} />
                      <span className="text-[8px] font-black uppercase text-white/40">Новый сторис</span>
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, 'story')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </>
                  )}
                  {isUploading && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-[8px] font-black animate-pulse">ЗАГРУЗКА...</div>}
                </div>
                {stories.map(s => (
                  <div key={s.id} className="aspect-[9/16] bg-white/5 rounded-[2rem] relative overflow-hidden group border border-white/5 shadow-2xl">
                    <img src={s.image_url} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 flex items-end justify-center p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => deleteStory(s.id)} className="bg-red-500 p-3 rounded-xl shadow-xl"><FiTrash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ЗАКАЗЫ */}
            {tab === 'orders' && (
              <div className="space-y-4">
                {activeOrders.map(o => (
                  <div key={o.id} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 hover:border-white/20 transition-all shadow-lg">
                    <div className="flex gap-4 items-center">
                       <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center border border-orange-500/10"><FiClock /></div>
                       <div>
                         <div className="text-[10px] text-white/30 uppercase font-black tracking-widest">Заказ #{String(o.id).slice(0,8)}</div>
                         <div className="font-black uppercase text-lg">{o.items_summary || 'Premium Flowers'}</div>
                         <div className="text-orange-500 font-bold text-xl">{o.total_price} ₽</div>
                       </div>
                    </div>
                    <select 
                      value={o.status || 'pending'} 
                      onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                      className="bg-white/5 border border-white/10 text-[10px] font-black uppercase p-4 rounded-2xl outline-none focus:border-orange-500 cursor-pointer appearance-none"
                    >
                      <option value="pending" className="bg-[#111]">В обработке</option>
                      <option value="shipped" className="bg-[#111]">Отправлен</option>
                      <option value="completed" className="bg-[#111]">Завершен</option>
                    </select>
                  </div>
                ))}
                {activeOrders.length === 0 && <div className="text-center py-20 text-white/10 font-black uppercase tracking-widest italic">Нет новых заказов</div>}
              </div>
            )}

            {/* АРХИВ */}
            {tab === 'archive' && (
              <div className="space-y-4">
                {archivedOrders.map(o => (
                  <div key={o.id} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex items-center gap-4 opacity-50 shadow-md">
                    <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center border border-green-500/10"><FiCheckCircle /></div>
                    <div>
                      <div className="text-[10px] text-white/30 uppercase font-black">Архив #{String(o.id).slice(0,8)}</div>
                      <div className="font-black uppercase">{o.items_summary}</div>
                      <div className="text-white font-bold">{o.total_price} ₽</div>
                    </div>
                  </div>
                ))}
                {archivedOrders.length === 0 && <div className="text-center py-20 text-white/10 font-black uppercase tracking-widest italic">Архив пуст</div>}
              </div>
            )}
          </>
        )}

        {/* МОДАЛКИ (ЦЕНА И ДОБАВЛЕНИЕ) */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-[#111] border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
              <h2 className="text-xl font-black uppercase text-orange-500 mb-6 italic flex items-center gap-2"><FiTag /> Прайс: {editingProduct.name}</h2>
              <form onSubmit={handleUpdatePrice} className="space-y-4">
                <input type="number" required className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold text-xl" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} />
                <input type="number" max="99" placeholder="Скидка %" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold text-orange-500 text-xl" value={editingProduct.discount || 0} onChange={e => setEditingProduct({...editingProduct, discount: Number(e.target.value)})} />
                <div className="flex gap-2 pt-4">
                  <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 bg-white/5 py-5 rounded-2xl font-black uppercase text-[10px]">Отмена</button>
                  <button type="submit" className="flex-[2] bg-orange-500 py-5 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-orange-500/20">Сохранить</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black/95 z-[90] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#111] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 relative">
              <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-white/20"><FiX size={24}/></button>
              <h2 className="text-2xl font-black uppercase text-orange-500 mb-8 italic">Новый товар</h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="relative h-44 w-full bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center overflow-hidden shadow-inner">
                  {newProduct.image_url ? (
                    <img src={newProduct.image_url} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <><FiCamera size={30} className="text-white/20 mb-2" /><span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Выбрать фото</span></>
                  )}
                  <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, 'product')} className="absolute inset-0 opacity-0 cursor-pointer" />
                  {isUploading && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[10px] font-black">ЗАГРУЗКА...</div>}
                </div>
                <input type="text" placeholder="НАЗВАНИЕ" required className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold uppercase" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="ЦЕНА" required className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
                  <input type="number" placeholder="СКИДКА %" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold text-orange-500" value={newProduct.discount || ''} onChange={e => setNewProduct({...newProduct, discount: Number(e.target.value)})} />
                </div>
                <button disabled={isUploading || !newProduct.image_url} type="submit" className="w-full bg-orange-500 disabled:opacity-20 text-white font-black uppercase py-5 rounded-2xl shadow-xl shadow-orange-500/20 transition-all">Опубликовать</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}