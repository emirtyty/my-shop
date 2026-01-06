"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('разное');
  
  // Единое поле для ника продавца
  const [sellerContact, setSellerContact] = useState('');

  const categories = ['цветы', 'еда', 'одежда', 'разное'];

  useEffect(() => {
    fetchProducts();
    // Пытаемся достать ник из локальной памяти браузера, чтобы не вводить каждый раз
    const savedNick = localStorage.getItem('seller_nick');
    if (savedNick) setSellerContact(savedNick);
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('product_market').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
  }

  const handleNickChange = (val: string) => {
    setSellerContact(val);
    localStorage.setItem('seller_nick', val); // Сохраняем ник в браузере
  };

  const deleteProduct = async (id: any) => {
    if (window.confirm('Удалить?')) {
      await supabase.from('product_market').delete().eq('id', id);
      fetchProducts();
    }
  };

  const uploadFile = async (e: any, isStory: boolean = false) => {
    if (!sellerContact) {
      alert('Сначала введите свой ник Telegram!');
      return;
    }
    setLoading(true);
    const file = e.target.files[0];
    if (!file) { setLoading(false); return; }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    await supabase.storage.from('images').upload(filePath, file);
    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);

    // При создании товара автоматически добавляем ник продавца
    await supabase.from('product_market').insert([{
      name: isStory ? 'НОВАЯ СТОРИЗ' : 'НОВЫЙ ТОВАР',
      price: 0,
      old_price: 0,
      image_url: [publicUrl],
      is_story: isStory,
      category: selectedCategory,
      contact: sellerContact // Привязка ника
    }]);

    fetchProducts();
    setLoading(false);
  };

  return (
    <div className="bg-black min-h-screen text-white p-4 pb-72">
      <div className="max-w-md mx-auto">
        
        {/* ЕДИНОЕ ПОЛЕ НИКА */}
        <div className="mb-8 p-6 bg-zinc-900/80 rounded-[2.5rem] border border-orange-500/20 shadow-xl shadow-orange-500/5">
          <p className="text-[10px] font-black uppercase opacity-40 mb-3 tracking-[0.2em]">Ваш профиль Telegram</p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 font-bold">@</span>
            <input 
              type="text"
              placeholder="username"
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-10 pr-6 text-sm focus:outline-none focus:border-orange-500 transition-all font-bold text-orange-400"
              value={sellerContact}
              onChange={(e) => handleNickChange(e.target.value)}
            />
          </div>
        </div>

        {/* СПИСОК ТОВАРОВ */}
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="bg-zinc-900/30 rounded-3xl p-3 border border-white/5 flex items-center gap-4">
              <img src={p.image_url[0]} className="w-12 h-12 object-cover rounded-xl opacity-50" />
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase truncate w-32">{p.name}</p>
                <p className="text-[8px] opacity-30 font-black uppercase">Продавец: @{p.contact || 'не указан'}</p>
              </div>
              <button onClick={() => deleteProduct(p.id)} className="p-2 opacity-20 hover:opacity-100 transition">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>

        {/* НИЖНЯЯ ПАНЕЛЬ ЗАГРУЗКИ */}
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 p-6 rounded-t-[3rem]">
          <div className="max-w-md mx-auto">
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase transition-all border ${selectedCategory === cat ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-white/30'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <label className={`block w-full text-center py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest cursor-pointer transition-all ${sellerContact ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}>
              {loading ? 'ЗАГРУЗКА...' : `+ ДОБАВИТЬ В "${selectedCategory}"`}
              {sellerContact && <input type="file" className="hidden" onChange={(e) => uploadFile(e, false)} disabled={loading} />}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}