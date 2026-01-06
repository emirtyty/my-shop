"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const [products, setProducts] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('product_market').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
  }

  const updateProduct = async (id: any, updates: any) => {
    await supabase.from('product_market').update(updates).eq('id', id);
    fetchProducts();
  };

  const handleFileUpload = async (e: any) => {
    setLoading(true);
    const file = e.target.files[0];
    const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
    await supabase.storage.from('images').upload(fileName, file);
    const { data } = supabase.storage.from('images').getPublicUrl(fileName);
    setImages([data.publicUrl]);
    setLoading(false);
  };

  const saveNew = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await supabase.from('product_market').insert([{
      name: formData.get('name'),
      price: parseInt(formData.get('price') as string),
      image_url: images,
      contact: formData.get('contact'),
      is_story: isStoryMode,
      in_stock: true
    }]);
    setShowAdd(false);
    setImages([]);
    fetchProducts();
  };

  return (
    <main className="min-h-screen bg-black text-white max-w-md mx-auto relative pb-32 border-x border-white/5">
      {/* КНОПКА СТОРИЗ В УГЛУ */}
      <header className="p-6 flex justify-between items-center sticky top-0 bg-black/80 backdrop-blur-md z-40 border-b border-white/5">
        <button 
          onClick={() => { setIsStoryMode(true); setShowAdd(true); }}
          className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-xl shadow-lg active:scale-90 transition-all"
        >
          📸
        </button>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-20">Контент</span>
        <div className="w-12"></div>
      </header>

      {/* СПИСОК КАРТОЧЕК */}
      <div className="p-4 space-y-4">
        {products.map(p => (
          <div key={p.id} className="bg-zinc-900/50 rounded-[2.5rem] p-5 border border-white/5">
            <div className="flex items-center gap-4 mb-4">
              <img src={p.image_url[0]} className="w-16 h-16 rounded-2xl object-cover" />
              <div className="flex-1">
                <p className="text-[9px] font-black uppercase opacity-40">{p.name}</p>
                {p.is_story && <span className="text-[7px] text-purple-400 font-bold">STORY ✨</span>}
              </div>
              <button 
                onClick={() => updateProduct(p.id, { in_stock: !p.in_stock })}
                className={`text-[8px] font-black px-3 py-1 rounded-lg border ${p.in_stock ? 'text-green-500 border-green-500/20' : 'text-red-500 border-red-500/20'}`}
              >
                {p.in_stock ? 'В НАЛИЧИИ' : 'СКРЫТ'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input 
                defaultValue={p.price} 
                onBlur={(e) => updateProduct(p.id, { price: parseInt(e.target.value) })}
                className="bg-black p-3 rounded-xl text-[10px] font-black border border-white/5 outline-none" 
              />
              <input 
                defaultValue={p.old_price || ''} 
                placeholder="Скидка"
                onBlur={(e) => updateProduct(p.id, { old_price: parseInt(e.target.value) })}
                className="bg-black p-3 rounded-xl text-[10px] font-black border border-white/5 outline-none text-red-400" 
              />
            </div>
          </div>
        ))}
      </div>

      {/* КНОПКА ПОСТА ВНИЗУ */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-6">
        <button 
          onClick={() => { setIsStoryMode(false); setShowAdd(true); }}
          className="w-full py-5 bg-white text-black font-black uppercase text-[10px] rounded-full shadow-2xl active:scale-95 transition-all tracking-widest"
        >
          + СОЗДАТЬ ПОСТ
        </button>
      </div>

      {/* МОДАЛКА */}
      {showAdd && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
          <form onSubmit={saveNew} className="w-full max-w-[340px] space-y-4">
            <label className="aspect-square bg-zinc-900 border border-white/10 border-dashed rounded-[3rem] flex items-center justify-center overflow-hidden cursor-pointer">
              {images.length > 0 ? <img src={images[0]} className="w-full h-full object-cover" /> : <span className="text-[10px] font-black opacity-20">{loading ? 'ЗАГРУЗКА...' : 'ВЫБРАТЬ ФОТО'}</span>}
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
            <input name="name" placeholder="НАЗВАНИЕ" className="w-full bg-zinc-900 p-4 rounded-2xl text-[10px] font-black outline-none" required />
            <input name="price" placeholder="ЦЕНА" className="w-full bg-zinc-900 p-4 rounded-2xl text-[10px] font-black outline-none" required />
            <input name="contact" placeholder="ТВОЙ TG (БЕЗ @)" className="w-full bg-zinc-900 p-4 rounded-2xl text-[10px] font-black outline-none" required />
            <button className={`w-full py-5 rounded-full font-black text-[10px] uppercase ${isStoryMode ? 'bg-purple-600' : 'bg-white text-black'}`}>
              {isStoryMode ? 'Создать историю' : 'Опубликовать товар'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="w-full text-[10px] font-black opacity-30 uppercase">Отмена</button>
          </form>
        </div>
      )}
    </main>
  );
}