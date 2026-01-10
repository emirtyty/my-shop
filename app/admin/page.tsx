"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  FiPackage, FiClock, FiCheckCircle, FiTrash2, 
  FiLogOut, FiPlus, FiArchive, FiX, FiCamera, FiUploadCloud 
} from 'react-icons/fi';

const supabase = createClient(
  'https://mnzsmbqwvlrmoahtosux.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uenNtYnF3dmxybW9haHRvc3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTA4OTcsImV4cCI6MjA4MjY4Njg5N30.PBoo9FHj4_SjdXZBy-gABjLo4OfF0NW7cIgVSYemkr8'
);

export default function AdminPage() {
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    discount: 0,
    image_url: ''
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data } = await supabase.from('product_market').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
  }

  // Загрузка фото с телефона/ПК в Supabase Storage
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Загружаем в бакет 'products'
    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file);

    if (uploadError) {
      alert("Ошибка загрузки файла: " + uploadError.message);
      setIsUploading(false);
      return;
    }

    // Получаем прямую ссылку на файл
    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(filePath);

    setNewProduct({ ...newProduct, image_url: publicUrl });
    setIsUploading(false);
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newProduct.image_url) return alert("Сначала дождись загрузки фото!");
    
    const { error } = await supabase.from('product_market').insert([newProduct]);
    if (!error) {
      setShowModal(false);
      setNewProduct({ name: '', price: 0, discount: 0, image_url: '' });
      loadData();
    }
  }

  async function deleteProduct(id: string) {
    if(!confirm('Удалить товар?')) return;
    await supabase.from('product_market').delete().eq('id', id);
    loadData();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-black italic text-orange-500 uppercase tracking-tighter">Dark Admin</h1>
          <button className="bg-white/5 p-4 rounded-2xl"><FiLogOut size={20}/></button>
        </div>

        {tab === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button 
              onClick={() => setShowModal(true)}
              className="h-[280px] border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center gap-4 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all"
            >
              <FiPlus size={30} className="text-orange-500" />
              <span className="font-black uppercase text-[10px] text-white/40">Добавить товар</span>
            </button>

            {products.map(p => (
              <div key={p.id} className="bg-white/5 border border-white/10 rounded-[3rem] p-6 relative">
                <div className="flex items-center gap-4 mb-6">
                  <img src={p.image_url} className="w-20 h-20 rounded-3xl object-cover border border-white/10" alt="" />
                  <div className="font-black uppercase truncate">{p.name}</div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-3xl font-black italic">{p.price} <span className="text-orange-500 text-xl">₽</span></div>
                  <button onClick={() => deleteProduct(p.id)} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal для телефона */}
        {showModal && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#111] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 relative">
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-white/20"><FiX size={24}/></button>
              
              <h2 className="text-2xl font-black uppercase text-orange-500 mb-8">Новый товар</h2>
              
              <form onSubmit={handleAddProduct} className="space-y-4">
                {/* Загрузка фото */}
                <div className="relative h-48 w-full bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center overflow-hidden">
                  {newProduct.image_url ? (
                    <img src={newProduct.image_url} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <FiCamera size={40} className="text-white/20 mb-2" />
                      <span className="text-[10px] font-black uppercase text-white/40">Нажми, чтобы сделать фото</span>
                    </>
                  )}
                  <input 
                    type="file" accept="image/*" capture="environment" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs font-black animate-pulse">ЗАГРУЗКА...</div>}
                </div>

                <input 
                  type="text" placeholder="Название" required
                  className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold"
                  value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="number" placeholder="Цена" required
                    className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold"
                    value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                  />
                  <input 
                    type="number" placeholder="Скидка %"
                    className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold text-orange-500"
                    value={newProduct.discount || ''} onChange={e => setNewProduct({...newProduct, discount: Number(e.target.value)})}
                  />
                </div>

                <button 
                  disabled={isUploading || !newProduct.image_url}
                  type="submit" 
                  className="w-full bg-orange-500 disabled:opacity-30 text-white font-black uppercase py-5 rounded-2xl shadow-xl transition-all"
                >
                  {isUploading ? 'Загрузка фото...' : 'Выставить на продажу'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}