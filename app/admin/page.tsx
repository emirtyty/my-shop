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

  const deleteProduct = async (id: any) => {
    if (confirm('Удалить этот пост навсегда?')) {
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
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    let { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (uploadError) {
      alert('Ошибка загрузки');
      setLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);

    await supabase.from('product_market').insert([{
      name: isStory ? 'STORY' : 'НОВЫЙ ТОВАР',
      price: 0,
      image_url: [publicUrl],
      contact: 'твой_ник',
      is_story: isStory
    }]);

    fetchProducts();
    setLoading(false);
  };

  return (
    <div className="bg-zinc-950 min-h-screen text-white p-4 pb-24">
      <div className="max-w-md mx-auto">
        <header className="flex justify-between items-center mb-8 bg-zinc-900 p-4 rounded-2xl border border-white/5">
          <label className="cursor-pointer bg-zinc-800 p-3 rounded-xl hover:bg-zinc-700 transition">
            <span className="text-xl">📸</span>
            <input type="file" className="hidden" onChange={(e) => uploadFile(e, true)} disabled={loading} />
          </label>
          <h1 className="font-black text-xs uppercase tracking-widest">Админ-панель</h1>
          <div className="w-10"></div>
        </header>

        <div className="space-y-4">
          {products.map((p) => (
            <div key={p.id} className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 p-4">
              <div className="flex gap-4">
                <img src={p.image_url[0]} className="w-20 h-20 object-cover rounded-xl bg-black" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <input 
                      className="bg-transparent font-black uppercase text-[10px] w-full focus:outline-none"
                      defaultValue={p.name}
                      onBlur={(e) => updateProduct(p.id, { name: e.target.value })}
                    />
                    <button onClick={() => deleteProduct(p.id)} className="text-[9px] text-red-500 font-black uppercase ml-2 opacity-50 hover:opacity-100">
                      Удалить
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      className="bg-black/50 px-2 py-1 rounded-md text-[10px] w-20"
                      defaultValue={p.price}
                      onBlur={(e) => updateProduct(p.id, { price: Number(e.target.value) })}
                    />
                    <span className="text-[9px] opacity-40 uppercase font-black">RUB</span>
                  </div>

                  <button 
                    onClick={() => updateProduct(p.id, { is_story: !p.is_story })}
                    className={`text-[8px] font-black uppercase px-2 py-1 rounded ${p.is_story ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                  >
                    {p.is_story ? 'Это Сториз' : 'В ленте'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xs px-4">
          <label className="block bg-white text-black text-center py-4 rounded-2xl font-black uppercase text-xs cursor-pointer active:scale-95 transition shadow-2xl">
            {loading ? 'Загрузка...' : '+ Создать пост'}
            <input type="file" className="hidden" onChange={(e) => uploadFile(e, false)} disabled={loading} />
          </label>
        </div>
      </div>
    </div>
  );
}