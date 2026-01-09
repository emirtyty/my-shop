'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    // Запрашиваем данные напрямую без проверки сессии для теста
    const { data, error } = await supabase
      .from('product_market')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Ошибка базы:", error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  const applyDiscount = async (product: any) => {
    const percent = prompt('Введите % скидки:');
    if (!percent) return;
    const disc = Number(percent);
    const basePrice = product.old_price || product.price;
    const finalPrice = Math.round(basePrice - (basePrice * (disc / 100)));
    
    const { error } = await supabase
      .from('product_market')
      .update({ price: finalPrice, old_price: basePrice })
      .eq('id', product.id);

    if (error) alert("Ошибка: " + error.message);
    else {
      alert("Скидка сохранена!");
      fetchData();
    }
  };

  const resetPrice = async (product: any) => {
    await supabase.from('product_market').update({ price: product.old_price, old_price: null }).eq('id', product.id);
    fetchData();
  };

  return (
    <div className="p-5 bg-black min-h-screen text-white font-sans">
      <h1 className="text-2xl font-black text-orange-500 mb-8 uppercase italic tracking-tighter">УПРАВЛЕНИЕ</h1>
      {loading ? (
        <div className="text-zinc-500 animate-pulse font-bold uppercase italic text-xs">Загрузка товаров...</div>
      ) : (
        <div className="grid gap-4">
          {products.length === 0 && <p className="text-zinc-600">Товаров не найдено в базе</p>}
          {products.map(p => (
            <div key={p.id} className="bg-zinc-900 p-4 rounded-[2rem] flex gap-4 items-center border border-zinc-800">
              <img src={p.image_url} className="w-16 h-16 rounded-2xl object-cover bg-zinc-800" />
              <div className="flex-1">
                <p className="font-bold text-[10px] uppercase text-zinc-500">{p.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black">{p.price} ₽</span>
                  {p.old_price && <span className="text-zinc-600 line-through text-[10px]">{p.old_price} ₽</span>}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => applyDiscount(p)} className="bg-orange-500 text-black px-4 py-2 rounded-xl font-black text-[9px] uppercase">СКИДКА %</button>
                {p.old_price && <button onClick={() => resetPrice(p)} className="text-zinc-500 text-[8px] uppercase font-bold">Сброс</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}