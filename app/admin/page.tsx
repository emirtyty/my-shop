'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminPage() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data } = await supabase.from('product_market').select('*').order('created_at', { ascending: false });
    setProducts(data || []);
  }

  const applyDiscount = async (product: any) => {
    const percent = prompt('Введите % скидки (например 15):');
    if (!percent) return;
    
    const disc = Number(percent);
    // Если мы уже нажимали скидку, берем за основу старую цену, чтобы не уменьшать до бесконечности
    const basePrice = product.old_price || product.price; 
    const finalPrice = Math.round(basePrice - (basePrice * (disc / 100)));
    
    const { error } = await supabase
      .from('product_market')
      .update({ 
        price: finalPrice, 
        old_price: basePrice 
      })
      .eq('id', product.id);

    if (error) {
      alert("ОШИБКА: " + error.message);
    } else {
      alert(`Успех! Теперь цена ${finalPrice} ₽, а была ${basePrice} ₽`);
      fetchData();
    }
  };

  const resetPrice = async (product: any) => {
    if (!product.old_price) return;
    const { error } = await supabase
      .from('product_market')
      .update({ price: product.old_price, old_price: null })
      .eq('id', product.id);
    if (!error) fetchData();
  };

  return (
    <div className="p-5 bg-black min-h-screen text-white font-sans">
      <h1 className="text-2xl font-black text-orange-500 mb-8 uppercase italic">Управление ценами</h1>
      <div className="grid gap-4">
        {products.map(p => (
          <div key={p.id} className="bg-zinc-900 p-5 rounded-[2rem] flex gap-4 items-center border border-zinc-800 shadow-xl">
            <img src={p.image_url} className="w-16 h-16 rounded-2xl object-cover" />
            <div className="flex-1">
              <p className="font-bold text-[10px] uppercase text-zinc-500 mb-1">{p.name}</p>
              <div className="flex items-center gap-3">
                <span className="text-xl font-black text-white">{p.price} ₽</span>
                {p.old_price && <span className="text-zinc-600 line-through text-xs font-bold">{p.old_price} ₽</span>}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => applyDiscount(p)} className="bg-orange-500 text-black px-5 py-2.5 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-all shadow-lg shadow-orange-500/20">
                % СКИДКА
              </button>
              {p.old_price && (
                <button onClick={() => resetPrice(p)} className="bg-zinc-800 text-zinc-400 px-5 py-2 rounded-xl font-bold text-[9px] uppercase border border-zinc-700">
                  СБРОСИТЬ
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}