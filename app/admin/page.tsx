"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('разное');
  const [sellerContact, setSellerContact] = useState('');

  const categories = ['цветы', 'еда', 'одежда', 'разное'];

  useEffect(() => {
    fetchProducts();
    const savedNick = localStorage.getItem('seller_nick');
    if (savedNick) setSellerContact(savedNick);
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('product_market').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
  }

  const updateProduct = async (id: any, updates: any) => {
    await supabase.from('product_market').update(updates).eq('id', id);
    fetchProducts();
  };

  const deleteProduct = async (id: any) => {
    if (window.confirm('Удалить товар?')) {
      await supabase.from('product_market').delete().eq('id', id);
      fetchProducts();
    }
  };

  const uploadFile = async (e: any, isStory: boolean = false) => {
    if (!sellerContact) { alert('Введите ник!'); return; }
    setLoading(true);
    const file = e.target.files[0];
    if (!file) { setLoading(false); return; }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    await supabase.storage.from('images').upload(filePath, file);
    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);

    await supabase.from('product_market').insert([{
      name: isStory ? 'НОВАЯ СТОРИЗ' : 'НОВЫЙ ТОВАР',
      price: 0,
      old_price: 0,
      image_url: [publicUrl],
      is_story: isStory,
      category: selectedCategory,
      contact: sellerContact
    }]);

    fetchProducts();
    setLoading(false);
  };

  return (
    <div className="bg-black min-h-screen text-white p-4 pb-80 font-sans">
      <div className="max-w-md mx-auto">
        
        {/* НИК ПРОДАВЦА */}
        <div className="mb-6 p-6 bg-zinc-900/50 rounded-[2.5rem] border border-white/5">
          <p className="text-[10px] font-black uppercase opacity-30 mb-3 tracking-widest text-center">Ваш Telegram (без @)</p>
          <input 
            type="text"
            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm text-center font-bold text-orange-400 outline-none focus:border-orange-500"
            value={sellerContact}
            onChange={(e) => { setSellerContact(e.target.value); localStorage.setItem('seller_nick', e.target.value); }}
          />
        </div>

        {/* СПИСОК ТОВАРОВ С ПОЛНЫМ РЕДАКТИРОВАНИЕМ */}
        <div className="space-y-4">
          {products.map((p) => (
            <div key={p.id} className="bg-zinc-900/40 rounded-[2.5rem] p-5 border border-white/5">
              <div className="flex gap-4 mb-4">
                <img src={p.image_url[0]} className={`w-20 h-20 object-cover rounded-[1.5rem] ${p.is_story ? 'ring-2 ring-orange-500' : ''}`} />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <input 
                      className="bg-transparent font-black uppercase text-[11px] w-full focus:outline-none focus:text-orange-400"
                      defaultValue={p.name}
                      onBlur={(e) => updateProduct(p.id, { name: e.target.value })}
                    />
                    <button onClick={() => deleteProduct(p.id)} className="text-red-500 text-[10px] font-black uppercase bg-red-500/10 px-2 py-1 rounded-lg">DEL</button>
                  </div>
                  
                  {/* ПОЛЯ ЦЕНЫ И СКИДКИ */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[7px] opacity-20 font-black uppercase mb-1">Цена</p>
                      <input 
                        type="number"
                        className="bg-black/40 px-3 py-2 rounded-xl text-[11px] w-full font-bold border border-white/5"
                        defaultValue={p.price}
                        onBlur={(e) => updateProduct(p.id, { price: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <p className="text-[7px] text-red-500/40 font-black uppercase mb-1">Скидка</p>
                      <input 
                        type="number"
                        className="bg-black/40 px-3 py-2 rounded-xl text-[11px] w-full font-bold border border-red-500/10 text-red-400"
                        defaultValue={p.old_price}
                        onBlur={(e) => updateProduct(p.id, { old_price: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* КАТЕГОРИЯ И СТОРИЗ */}
              <div className="flex gap-2">
                <select 
                  className="bg-zinc-800 text-[9px] font-black uppercase px-4 py-2.5 rounded-xl flex-1 outline-none appearance-none text-center"
                  value={p.category || 'разное'}
                  onChange={(e) => updateProduct(p.id, { category: e.target.value })}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button 
                  onClick={() => updateProduct(p.id, { is_story: !p.is_story })}
                  className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${p.is_story ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                >
                  {p.is_story ? 'Story ✅' : 'Make Story'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ПАНЕЛЬ ЗАГРУЗКИ */}
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/5 p-6 rounded-t-[3rem]">
          <div className="max-w-md mx-auto">
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
              {categories.map(cat => (
                <button 
                  key={cat} onClick={() => setSelectedCategory(cat)}
                  className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase border transition-all ${selectedCategory === cat ? 'bg-white text-black' : 'bg-transparent border-white/10 text-white/30'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <label className={`block w-full py-5 rounded-[2rem] font-black uppercase text-[11px] text-center tracking-widest cursor-pointer ${sellerContact ? 'bg-orange-500' : 'bg-zinc-800 opacity-50'}`}>
              {loading ? 'ЗАГРУЗКА...' : `ДОБАВИТЬ В "${selectedCategory}"`}
              {sellerContact && <input type="file" className="hidden" onChange={(e) => uploadFile(e, false)} disabled={loading} />}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}