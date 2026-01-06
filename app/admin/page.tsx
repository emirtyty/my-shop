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

    await supabase.from('product_market').insert([{
      name: isStory ? 'НОВАЯ СТОРИЗ' : 'НОВЫЙ ТОВАР',
      price: 0,
      old_price: 0,
      image_url: [publicUrl],
      is_story: isStory
    }]);

    fetchProducts();
    setLoading(false);
  };

  return (
    <div className="bg-black min-h-screen text-white p-4 pb-32">
      <div className="max-w-md mx-auto">
        <header className="flex justify-between items-center mb-8 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
          <label className="cursor-pointer bg-zinc-800 w-10 h-10 flex items-center justify-center rounded-xl hover:bg-orange-500 transition">
            <span className="text-lg">📸</span>
            <input type="file" className="hidden" onChange={(e) => uploadFile(e, true)} disabled={loading} />
          </label>
          <h1 className="font-black text-[10px] uppercase tracking-widest opacity-30">Админ-панель</h1>
          <div className="w-10"></div>
        </header>

        <div className="space-y-4">
          {products.map((p) => (
            <div key={p.id} className="bg-zinc-900/50 rounded-3xl p-4 border border-white/5 backdrop-blur-md">
              <div className="flex gap-4">
                <img src={p.image_url[0]} className={`w-20 h-20 object-cover rounded-2xl ${p.is_story ? 'border-2 border-orange-500' : 'border border-white/10'}`} />
                
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <input 
                      className="bg-transparent font-black uppercase text-[11px] w-full focus:outline-none"
                      defaultValue={p.name}
                      onBlur={(e) => updateProduct(p.id, { name: e.target.value })}
                    />
                    <button onClick={() => deleteProduct(p.id)} className="text-[9px] text-red-500 font-black uppercase bg-red-500/10 px-2 py-1 rounded-lg ml-2">Удалить</button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <p className="text-[8px] opacity-30 uppercase font-black mb-1">Цена (RUB)</p>
                      <input 
                        type="number"
                        className="bg-black/40 px-2 py-2 rounded-xl text-[11px] w-full font-bold border border-white/5"
                        defaultValue={p.price}
                        onBlur={(e) => updateProduct(p.id, { price: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <p className="text-[8px] opacity-30 uppercase font-black mb-1 text-red-400">Скидка (Старая цена)</p>
                      <input 
                        type="number"
                        className="bg-black/40 px-2 py-2 rounded-xl text-[11px] w-full font-bold border border-red-500/20 text-red-400"
                        defaultValue={p.old_price}
                        onBlur={(e) => updateProduct(p.id, { old_price: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => updateProduct(p.id, { is_story: !p.is_story })}
                    className={`w-full text-[8px] font-black uppercase py-2 rounded-xl transition ${p.is_story ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                  >
                    {p.is_story ? 'СЕЙЧАС В СТОРИЗ ⚡️' : 'СДЕЛАТЬ СТОРИЗ'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-8 left-0 right-0 px-6">
          <label className="block max-w-md mx-auto bg-white text-black text-center py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest cursor-pointer shadow-2xl">
            {loading ? 'ЗАГРУЗКА...' : '+ СОЗДАТЬ ТОВАР'}
            <input type="file" className="hidden" onChange={(e) => uploadFile(e, false)} disabled={loading} />
          </label>
        </div>
      </div>
    </div>
  );
}