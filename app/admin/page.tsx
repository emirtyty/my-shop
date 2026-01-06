"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('product_market').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
  }

  // ФУНКЦИЯ УДАЛЕНИЯ
  const deleteProduct = async (id: any) => {
    if (window.confirm('Удалить этот товар навсегда?')) {
      const { error } = await supabase.from('product_market').delete().eq('id', id);
      if (error) {
        alert('Ошибка при удалении: ' + error.message);
      } else {
        fetchProducts();
      }
    }
  };

  const updateProduct = async (id: any, updates: any) => {
    await supabase.from('product_market').update(updates).eq('id', id);
    fetchProducts();
  };

  const uploadFile = async (e: any, isStory: boolean = false) => {
    setLoading(true);
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    let { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (uploadError) {
      alert('Ошибка загрузки в хранилище: ' + uploadError.message);
      setLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);

    const { error: insertError } = await supabase.from('product_market').insert([{
      name: isStory ? 'НОВАЯ СТОРИЗ' : 'НОВЫЙ ТОВАР',
      price: 0,
      image_url: [publicUrl],
      contact: 'твой_ник',
      is_story: isStory
    }]);

    if (insertError) {
      alert('Ошибка сохранения в базе: ' + insertError.message);
    }

    fetchProducts();
    setLoading(false);
  };

  return (
    <div className="bg-zinc-950 min-h-screen text-white p-4 pb-32 font-sans">
      <div className="max-w-md mx-auto">
        <header className="flex justify-between items-center mb-8 bg-zinc-900/50 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
          <label className="cursor-pointer bg-zinc-800 w-10 h-10 flex items-center justify-center rounded-xl hover:bg-zinc-700 transition">
            <span className="text-lg">📸</span>
            <input type="file" className="hidden" onChange={(e) => uploadFile(e, true)} disabled={loading} />
          </label>
          <h1 className="font-black text-[10px] uppercase tracking-[0.2em] opacity-50">Управление Магазином</h1>
          <div className="w-10"></div>
        </header>

        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="bg-zinc-900/40 rounded-3xl overflow-hidden border border-white/5 p-4 backdrop-blur-sm">
              <div className="flex gap-4">
                <div className="relative w-20 h-20 shrink-0">
                   <img src={p.image_url[0]} className="w-full h-full object-cover rounded-2xl bg-black" />
                </div>
                
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div className="flex justify-between items-start">
                    <input 
                      className="bg-transparent font-black uppercase text-[11px] w-full focus:outline-none focus:text-blue-400 transition"
                      defaultValue={p.name}
                      onBlur={(e) => updateProduct(p.id, { name: e.target.value })}
                    />
                    <button 
                      onClick={() => deleteProduct(p.id)} 
                      className="text-[9px] text-red-500 font-black uppercase ml-2 bg-red-500/10 px-2 py-1 rounded-lg hover:bg-red-500 hover:text-white transition"
                    >
                      Удалить
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      className="bg-black/40 px-3 py-1.5 rounded-xl text-[11px] w-24 font-bold focus:outline-none border border-white/5"
                      defaultValue={p.price}
                      onBlur={(e) => updateProduct(p.id, { price: Number(e.target.value) })}
                    />
                    <span className="text-[9px] opacity-30 uppercase font-black">RUB</span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button 
                      onClick={() => updateProduct(p.id, { is_story: !p.is_story })}
                      className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-xl transition ${p.is_story ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                    >
                      {p.is_story ? 'Сториз ⚡️' : 'В ленте'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* КНОПКА СОЗДАНИЯ */}
        <div className="fixed bottom-8 left-0 right-0 px-6 z-50">
          <label className="block max-w-md mx-auto bg-white text-black text-center py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest cursor-pointer active:scale-95 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)]">
            {loading ? 'ЗАГРУЗКА...' : '+ СОЗДАТЬ ПОСТ'}
            <input type="file" className="hidden" onChange={(e) => uploadFile(e, false)} disabled={loading} />
          </label>
        </div>
      </div>
    </div>
  );
}