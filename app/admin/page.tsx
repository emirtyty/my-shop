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
  const [tab, setTab] = useState<'products' | 'orders' | 'stories'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [newProduct, setNewProduct] = useState({ name: '', price: 0, discount: 0, image_url: '' });
  const [storyImage, setStoryImage] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [pRes, oRes, sRes] = await Promise.all([
      supabase.from('product_market').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('stories').select('*').order('created_at', { ascending: false })
    ]);
    if (pRes.data) setProducts(pRes.data);
    if (oRes.data) setOrders(oRes.data);
    if (sRes.data) setStories(sRes.data);
    setLoading(false);
  }

  // Загрузка фото (общая функция)
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

  async function addStory() {
    if (!storyImage) return;
    const { error } = await supabase.from('stories').insert([{ image_url: storyImage }]);
    if (!error) { setStoryImage(''); loadData(); }
  }

  async function deleteStory(id: string) {
    await supabase.from('stories').delete().eq('id', id);
    loadData();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-black italic text-orange-500 uppercase tracking-tighter">Dark Admin</h1>
          <button className="bg-white/5 p-4 rounded-2xl"><FiLogOut size={20}/></button>
        </div>

        {/* Навигация */}
        <div className="flex flex-wrap gap-2 mb-10 bg-white/5 p-2 rounded-[2rem] border border-white/5 w-fit">
          <button onClick={() => setTab('products')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'products' ? 'bg-orange-500 text-white' : 'text-white/40'}`}>
            <FiPackage /> Витрина
          </button>
          <button onClick={() => setTab('stories')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'stories' ? 'bg-orange-500 text-white' : 'text-white/40'}`}>
            <FiPlayCircle /> Истории ({stories.length})
          </button>
          <button onClick={() => setTab('orders')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'orders' ? 'bg-orange-500 text-white' : 'text-white/40'}`}>
            <FiClock /> Заказы
          </button>
        </div>

        {/* Контент Историй */}
        {tab === 'stories' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Добавить историю */}
            <div className="aspect-[9/16] border-2 border-dashed border-white/10 rounded-[2rem] relative flex flex-col items-center justify-center overflow-hidden group">
              {storyImage ? (
                <>
                  <img src={storyImage} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                  <button onClick={addStory} className="relative z-10 bg-orange-500 p-4 rounded-full font-black uppercase text-[10px]">Опубликовать</button>
                </>
              ) : (
                <>
                  <FiPlus className="text-orange-500 mb-2" size={24} />
                  <span className="text-[8px] font-black uppercase text-white/40">Добавить сторис</span>
                  <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, 'story')} className="absolute inset-0 opacity-0 cursor-pointer" />
                </>
              )}
              {isUploading && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-[8px] font-black animate-pulse uppercase">Загрузка...</div>}
            </div>

            {/* Список историй */}
            {stories.map(s => (
              <div key={s.id} className="aspect-[9/16] bg-white/5 rounded-[2rem] relative overflow-hidden group border border-white/5">
                <img src={s.image_url} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                  <button onClick={() => deleteStory(s.id)} className="bg-red-500 p-3 rounded-xl"><FiTrash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Остальные вкладки (Products и Orders) остаются как были */}
        {tab === 'products' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button onClick={() => setShowAddModal(true)} className="h-[250px] border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 hover:border-orange-500/50 transition-all">
                  <FiPlus size={24} className="text-orange-500" />
                  <span className="font-black uppercase text-[9px] text-white/40 tracking-widest">Добавить товар</span>
                </button>
                {products.map(p => (
                  <div key={p.id} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-5 relative overflow-hidden group">
                    <div className="flex items-center gap-4 mb-4">
                      <img src={p.image_url} className="w-16 h-16 rounded-2xl object-cover border border-white/10" alt="" />
                      <div className="font-black uppercase truncate text-sm flex-1">{p.name}</div>
                    </div>
                    <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl">
                      <div className="text-xl font-black italic">{p.price} <span className="text-orange-500 text-xs">₽</span></div>
                      <button onClick={() => deleteProduct(p.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"><FiTrash2 size={14}/></button>
                    </div>
                  </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}

// Вспомогательная функция для удаления (добавь в код выше)
async function deleteProduct(id: string) {
    if(!confirm('Удалить товар?')) return;
    await supabase.from('product_market').delete().eq('id', id);
    window.location.reload(); 
}