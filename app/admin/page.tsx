"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const [products, setProducts] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  
  // Состояния для формы
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [login, setLogin] = useState('');

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('product_market').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
  }

  const openModal = (story: boolean) => {
    setIsStoryMode(story);
    setShowAdd(true);
  };

  const updateProduct = async (id: any, updates: any) => {
    await supabase.from('product_market').update(updates).eq('id', id);
    fetchProducts(); // Обновление без alert, как ты просил
  };

  const handleFileUpload = async (e: any) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;
      const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('images').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      setImages([data.publicUrl]);
    } catch (error) {
      alert('Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (images.length === 0) return alert("Загрузи фото");
    await supabase.from('product_market').insert([{ 
      name: name || (isStoryMode ? 'Story' : 'Новый товар'), 
      price: parseInt(price) || 0, 
      image_url: images, 
      contact: login, 
      is_story: isStoryMode, 
      in_stock: true 
    }]);
    setShowAdd(false);
    setName(''); setPrice(''); setImages([]);
    fetchProducts();
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans max-w-md mx-auto relative pb-32 border-x border-white/5">
      
      {/* ВЕРХНЯЯ ПАНЕЛЬ С КНОПКОЙ СТОРИЗ */}
      <div className="p-6 flex justify-between items-center border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-40">
        <button 
          onClick={() => openModal(true)} 
          className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-xl active:scale-90 transition-all shadow-lg"
        >
          📸
        </button>
        <h1 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-20">Контент-менеджер</h1>
        <div className="w-12"></div>
      </div>

      {/* СПИСОК КАРТОЧЕК С КНОПКАМИ */}
      <div className="p-4 space-y-4">
        {products.map(p => (
          <div key={p.id} className={`bg-zinc-900/50 rounded-[2.5rem] p-5 border border-white/5 transition-all ${!p.in_stock && 'opacity-40'}`}>
            <div className="flex items-center gap-4 mb-5">
              <div className={`relative shrink-0 ${p.is_story ? 'p-0.5 rounded-2xl bg-gradient-to-tr from-purple-500 to-red-500' : ''}`}>
                <img src={p.image_url[0]} className="w-16 h-16 rounded-2xl object-cover border-2 border-black bg-black" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-start">
                  <p className="text-[9px] font-black uppercase opacity-40 truncate pr-2">{p.name}</p>
                  <button 
                    onClick={() => updateProduct(p.id, { in_stock: !p.in_stock })}
                    className={`text-[7px] font-black px-2 py-1 rounded-lg border ${p.in_stock ? 'border-green-500/30 text-green-500' : 'border-red-500/30 text-red-500'}`}
                  >
                    {p.in_stock ? 'В НАЛИЧИИ' : 'ПРОДАНО'}
                  </button>
                </div>
                {p.is_story && <p className="text-[7px] text-purple-400 font-black mt-1 tracking-widest uppercase">STORY ✨</p>}
              </div>
            </div>

            {/* ВЕРНУЛ ПОЛЯ ВВОДА В КАРТОЧКУ */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[7px] opacity-20 uppercase font-black ml-1">Цена ₽</p>
                <input 
                  defaultValue={p.price}
                  onBlur={(e) => updateProduct(p.id, { price: parseInt(e.target.value) })}
                  className="w-full bg-black p-3 rounded-xl text-[10px] font-black outline-none border border-white/5 focus:border-white/20"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[7px] opacity-20 uppercase font-black ml-1">Скидка (старая)</p>
                <input 
                  defaultValue={p.old_price || ''}
                  placeholder="—"
                  onBlur={(e) => updateProduct(p.id, { old_price: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full bg-black p-3 rounded-xl text-[10px] font-black outline-none border border-white/5 text-red-500/50"
                />
              </div>
            </div>

            <button 
              onClick={() => { if(confirm('Удалить пост?')) updateProduct(p.id, { is_visible: false }) }} 
              className="w-full mt-4 py-2 text-[7px] font-black opacity-10 hover:opacity-100 transition-all uppercase tracking-widest"
            >
              Удалить из ленты
            </button>
          </div>
        ))}
      </div>

      {/* НИЖНЯЯ КНОПКА */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-50">
        <button 
          onClick={() => openModal(false)} 
          className="w-full py-5 bg-white text-black font-black uppercase text-[10px] rounded-full shadow-2xl active:scale-95 transition-all tracking-widest"
        >
          + СОЗДАТЬ ПОСТ
        </button>
      </div>

      {/* МОДАЛКА */}
      {showAdd && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-[340px] bg-zinc-900 rounded-[3rem] p-8 border border-white/5">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black opacity-30 uppercase">
                {isStoryMode ? 'Новая сториз' : 'Новый товар'}
              </span>
              <button onClick={() => setShowAdd(false)} className="text-xl opacity-20">✕</button>
            </div>
            
            <div className="space-y-4">
              <label className="aspect-square bg-black border border-white/10 border-dashed rounded-[2rem] flex flex-col items-center justify-center overflow-hidden cursor-pointer">
                {images.length > 0 ? (
                  <img src={images[0]} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <div className="text-2xl mb-2">{isStoryMode ? '📸' : '📦'}</div>
                    <span className="text-[8px] font-black opacity-20 uppercase">{uploading ? 'ЗАГРУЗКА...' : 'КАМЕРА / ГАЛЕРЕЯ'}</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>

              <input placeholder="НАЗВАНИЕ" className="w-full bg-black p-4 rounded-2xl text-[10px] font-black border border-white/5 outline-none" value={name} onChange={e => setName(e.target.value)} />
              <input placeholder="ЦЕНА" className="w-full bg-black p-4 rounded-2xl text-[10px] font-black border border-white/5 outline-none" value={price} onChange={e => setPrice(e.target.value)} />
              <input placeholder="ТВОЙ TG" className="w-full bg-black p-4 rounded-2xl text-[10px] font-black border border-white/5 outline-none" value={login} onChange={e => setLogin(e.target.value)} />
              
              <button 
                onClick={handleSave} 
                className={`w-full py-5 rounded-[2rem] font-black uppercase text-[10px] mt-2 shadow-xl ${isStoryMode ? 'bg-purple-600' : 'bg-white text-black'}`}
              >
                ОПУБЛИКОВАТЬ
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}