"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Состояние для выбора категории перед загрузкой
  const [selectedCategory, setSelectedCategory] = useState('разное');

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
    if (window.confirm('Удалить?')) {
      await supabase.from('product_market').delete().eq('id', id);
      fetchProducts();
    }
  };

  const updateProduct = async (id: any, updates: any) => {
    await supabase.from('product_market').update(updates).eq(id, id);
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

    // Добавляем товар с той категорией, которая выбрана в меню внизу
    await supabase.from('product_market').insert([{
      name: isStory ? 'НОВАЯ СТОРИЗ' : 'НОВЫЙ ТОВАР',
      price: 0,
      old_price: 0,
      image_url: [publicUrl],
      is_story: isStory,
      category: selectedCategory 
    }]);

    fetchProducts();
    setLoading(false);
  };

  return (
    <div className="bg-black min-h-screen text-white p-4 pb-64">
      <div className="max-w-md mx-auto">
        <header className="py-6 mb-8 border-b border-white/5 flex justify-between items-center">
          <h1 className="font-black text-[12px] uppercase tracking-[0.3em] opacity-30">Управление магазином</h1>
          <label className="cursor-pointer bg-orange-500 p-3 rounded-2xl active:scale-90 transition">
             <span className="text-xs font-black uppercase">📸 Story</span>
             <input type="file" className="hidden" onChange={(e) => uploadFile(e, true)} disabled={loading} />
          </label>
        </header>

        {/* СПИСОК ВСЕХ ТОВАРОВ (БЕЗ ФИЛЬТРОВ) */}
        <div className="space-y-4">
          {products.map((p) => (
            <div key={p.id} className="bg-zinc-900/50 rounded-[2rem] p-4 border border-white/5 flex gap-4">
              <img src={p.image_url[0]} className={`w-16 h-16 object-cover rounded-xl ${p.is_story ? 'ring-2 ring-orange-500' : ''}`} />
              <div className="flex-1">
                <div className="flex justify-between">
                  <input 
                    className="bg-transparent font-bold text-sm w-full outline-none focus:text-orange-400"
                    defaultValue={p.name}
                    onBlur={(e) => updateProduct(p.id, { name: e.target.value })}
                  />
                  <button onClick={() => deleteProduct(p.id)} className="text-red-500 text-[10px] font-black ml-2 uppercase">Удалить</button>
                </div>
                <div className="flex gap-2 mt-2">
                   <input 
                      type="number"
                      className="bg-black/50 px-3 py-1 rounded-lg text-xs w-20 border border-white/5"
                      defaultValue={p.price}
                      onBlur={(e) => updateProduct(p.id, { price: Number(e.target.value) })}
                   />
                   <span className="text-[10px] bg-white/5 px-3 py-1 rounded-lg flex items-center opacity-40 uppercase font-black">
                     {p.category || 'нет категории'}
                   </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ПАНЕЛЬ ДОБАВЛЕНИЯ (ФИКСИРОВАННАЯ СНИЗУ) */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#0c0c0c] border-t border-white/10 p-6 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
          <div className="max-w-md mx-auto">
            <p className="text-[10px] font-black uppercase opacity-30 mb-4 text-center tracking-widest">Выберите категорию для загрузки:</p>
            
            {/* ВЫБОР КАТЕГОРИИ */}
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase transition-all border ${selectedCategory === cat ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-white/40'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* КНОПКА ЗАГРУЗКИ ТОВАРА */}
            <label className="block w-full bg-orange-500 text-white text-center py-5 rounded-[2rem] font-black uppercase text-[12px] tracking-widest cursor-pointer active:scale-95 transition-all">
              {loading ? 'ЗАГРУЗКА...' : `+ ДОБАВИТЬ ТОВАР В "${selectedCategory}"`}
              <input type="file" className="hidden" onChange={(e) => uploadFile(e, false)} disabled={loading} />
            </label>
          </div>
        </div>

      </div>
    </div>
  );
}