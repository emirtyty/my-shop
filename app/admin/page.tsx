"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('все');
  const [loading, setLoading] = useState(false);
  
  // Состояние для выбора категории при создании нового товара
  const [newCategory, setNewCategory] = useState('разное');

  const categories = ['цветы', 'еда', 'одежда', 'разное'];

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase
      .from('product_market')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProducts(data);
  }

  const deleteProduct = async (id: any) => {
    if (window.confirm('Удалить этот пост?')) {
      await supabase.from('product_market').delete().eq('id', id);
      fetchProducts();
    }
  };

  const updateProduct = async (id: any, updates: any) => {
    await supabase.from('product_market').update(updates).eq('id', id);
    fetchProducts();
  };

  const uploadFile = async (e: any, isStory: boolean = false) => {
    setLoading(true);
    const file = e.target.files[0];
    if (!file) { setLoading(false); return; }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    await supabase.storage.from('images').upload(filePath, file);
    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);

    // ВАЖНО: При вставке используем выбранную категорию (newCategory)
    await supabase.from('product_market').insert([{
      name: isStory ? 'НОВАЯ СТОРИЗ' : 'НОВЫЙ ТОВАР',
      price: 0,
      old_price: 0,
      image_url: [publicUrl],
      is_story: isStory,
      category: newCategory 
    }]);

    fetchProducts();
    setLoading(false);
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'все' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="bg-[#080808] min-h-screen text-white p-4 pb-48">
      <div className="max-w-md mx-auto">
        <header className="flex justify-between items-center mb-6">
          <label className="cursor-pointer bg-zinc-900 w-12 h-12 flex items-center justify-center rounded-2xl border border-white/5 active:scale-90 transition">
            <span className="text-xl">📸</span>
            <input type="file" className="hidden" onChange={(e) => uploadFile(e, true)} disabled={loading} />
          </label>
          <h1 className="font-black text-[10px] uppercase tracking-widest opacity-20">Admin Panel</h1>
          <div className="w-12"></div>
        </header>

        {/* НАСТРОЙКА КАТЕГОРИИ ПЕРЕД СОЗДАНИЕМ */}
        <div className="bg-zinc-900/30 p-4 rounded-3xl border border-white/5 mb-6">
           <p className="text-[9px] font-black uppercase opacity-40 mb-3 text-center tracking-widest">Категория для нового товара:</p>
           <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setNewCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex-1 border ${newCategory === cat ? 'bg-white text-black border-white' : 'bg-transparent border-white/5 text-white/40'}`}
                >
                  {cat}
                </button>
              ))}
           </div>
        </div>

        {/* ПОИСК И ФИЛЬТРЫ СПИСКА */}
        <div className="space-y-3 mb-8">
          <input 
            type="text"
            placeholder="Поиск..."
            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 px-6 text-sm focus:outline-none"
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {['все', ...categories].map(cat => (
              <button 
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-5 py-2 rounded-full text-[9px] font-black uppercase border transition-all ${categoryFilter === cat ? 'bg-zinc-100 text-black border-white' : 'bg-transparent border-white/10 text-white/40'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* СПИСОК */}
        <div className="space-y-4">
          {filtered.map((p) => (
            <div key={p.id} className="bg-zinc-900/40 rounded-[2.5rem] p-5 border border-white/5">
              <div className="flex gap-5">
                <img src={p.image_url[0]} className={`w-20 h-20 object-cover rounded-[1.5rem] ${p.is_story ? 'ring-2 ring-orange-500' : ''}`} />
                
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <input 
                      className="bg-transparent font-black uppercase text-[11px] w-full focus:outline-none"
                      defaultValue={p.name}
                      onBlur={(e) => updateProduct(p.id, { name: e.target.value })}
                    />
                    <button onClick={() => deleteProduct(p.id)} className="text-[9px] text-red-500 font-black uppercase ml-2">Del</button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 my-2">
                    <input 
                      type="number"
                      className="bg-white/5 px-2 py-1.5 rounded-lg text-[11px] font-bold border border-white/5"
                      defaultValue={p.price}
                      onBlur={(e) => updateProduct(p.id, { price: Number(e.target.value) })}
                    />
                    {/* ВЫБОР КАТЕГОРИИ ДЛЯ СУЩЕСТВУЮЩЕГО ТОВАРА */}
                    <select 
                      className="bg-zinc-800 text-[9px] font-black uppercase px-2 py-1.5 rounded-lg border-none outline-none"
                      value={p.category || 'разное'}
                      onChange={(e) => updateProduct(p.id, { category: e.target.value })}
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <button 
                    onClick={() => updateProduct(p.id, { is_story: !p.is_story })}
                    className={`w-full text-[8px] font-black uppercase py-2 rounded-xl transition ${p.is_story ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                  >
                    {p.is_story ? 'Story' : 'Make Story'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* КНОПКА ДОБАВЛЕНИЯ */}
        <div className="fixed bottom-10 left-0 right-0 px-8">
          <label className="block max-w-sm mx-auto bg-white text-black text-center py-6 rounded-[2.5rem] font-black uppercase text-[12px] tracking-widest cursor-pointer shadow-2xl active:scale-95 transition-all">
            {loading ? 'Загрузка...' : `Добавить в "${newCategory}"`}
            <input type="file" className="hidden" onChange={(e) => uploadFile(e, false)} disabled={loading} />
          </label>
        </div>
      </div>
    </div>
  );
}