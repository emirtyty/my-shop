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
    // Загружаем список товаров
    const { data, error } = await supabase
      .from('product_market')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Ошибка загрузки:', error.message);
    }
    if (data) setProducts(data);
  }

  // ФУНКЦИЯ УДАЛЕНИЯ
  const deleteProduct = async (id: any) => {
    if (window.confirm('Удалить этот пост навсегда?')) {
      const { error } = await supabase.from('product_market').delete().eq('id', id);
      if (error) {
        alert('Ошибка при удалении: ' + error.message);
      } else {
        fetchProducts(); // Обновляем список после удаления
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
    if (!file) {
      setLoading(false);
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // 1. Загрузка фото в Storage
    let { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (uploadError) {
      alert('Ошибка хранилища: ' + uploadError.message);
      setLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);

    // 2. Создание записи в таблице (БЕЗ КОЛОНКИ CONTACT)
    const { error: insertError } = await supabase.from('product_market').insert([{
      name: isStory ? 'НОВАЯ СТОРИЗ' : 'НОВЫЙ ТОВАР',
      price: 0,
      image_url: [publicUrl],
      is_story: isStory
    }]);

    if (insertError) {
      alert('Ошибка базы данных: ' + insertError.message);
    }

    fetchProducts();
    setLoading(false);
  };

  return (
    <div className="bg-black min-h-screen text-white p-4 pb-32">
      <div className="max-w-md mx-auto">
        <header className="flex justify-between items-center mb-8 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
          <label className="cursor-pointer bg-zinc-800 w-10 h-10 flex items-center justify-center rounded-xl">
            <span className="text-lg">📸</span>
            <input type="file" className="hidden" onChange={(e) => uploadFile(e, true)} disabled={loading} />
          </label>
          <h1 className="font-black text-[10px] uppercase tracking-widest opacity-50">Админ-панель</h1>
          <div className="w-10"></div>
        </header>

        <div className="space-y-4">
          {products.length === 0 && <p className="text-center text-[10px] opacity-30 uppercase font-black">Список пуст</p>}
          
          {products.map((p) => (
            <div key={p.id} className="bg-zinc-900/50 rounded-3xl overflow-hidden border border-white/5 p-4 backdrop-blur-md">
              <div className="flex gap-4">
                <img src={p.image_url[0]} className="w-20 h-20 object-cover rounded-2xl bg-zinc-800" />
                
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <input 
                      className="bg-transparent font-black uppercase text-[11px] w-full focus:outline-none"
                      defaultValue={p.name}
                      onBlur={(e) => updateProduct(p.id, { name: e.target.value })}
                    />
                    {/* КНОПКА УДАЛИТЬ */}
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
                      className="bg-black/40 px-3 py-1 rounded-xl text-[11px] w-20 font-bold border border-white/5"
                      defaultValue={p.price}
                      onBlur={(e) => updateProduct(p.id, { price: Number(e.target.value) })}
                    />
                    <span className="text-[9px] opacity-30 uppercase font-black">RUB</span>
                  </div>

                  <button 
                    onClick={() => updateProduct(p.id, { is_story: !p.is_story })}
                    className={`text-[8px] self-start font-black uppercase px-3 py-1.5 rounded-xl ${p.is_story ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                  >
                    {p.is_story ? 'Сториз ⚡️' : 'В ленте'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-8 left-0 right-0 px-6">
          <label className="block max-w-md mx-auto bg-white text-black text-center py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest cursor-pointer active:scale-95 transition-all shadow-2xl">
            {loading ? 'ЗАГРУЗКА...' : '+ СОЗДАТЬ ПОСТ'}
            <input type="file" className="hidden" onChange={(e) => uploadFile(e, false)} disabled={loading} />
          </label>
        </div>
      </div>
    </div>
  );
}