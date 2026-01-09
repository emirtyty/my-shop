'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [seller, setSeller] = useState<any>(null);

  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSeller(session.user);
        // Загружаем товары без фильтра, чтобы ты их видел
        const { data } = await supabase.from('product_market').select('*').order('created_at', { ascending: false });
        setProducts(data || []);
      }
    };
    getData();
  }, []);

  const applyDiscount = async (id: string, currentPrice: number) => {
    const percent = prompt('Введите % скидки:');
    if (!percent) return;
    
    const disc = Number(percent);
    const finalPrice = Math.round(currentPrice - (currentPrice * (disc / 100)));
    
    // ВАЖНО: записываем и новую цену, и старую
    const { error } = await supabase
      .from('product_market')
      .update({ 
        price: finalPrice, 
        old_price: currentPrice 
      })
      .eq('id', id);

    if (error) alert(error.message);
    else {
      alert("Скидка сохранена в базу!");
      window.location.reload(); // Перезагрузим, чтобы увидеть изменения
    }
  };

  return (
    <div className="p-5 bg-black min-h-screen text-white">
      <h1 className="text-2xl font-black text-orange-500 mb-8 uppercase italic">Управление</h1>
      <div className="grid gap-4">
        {products.map(p => (
          <div key={p.id} className="bg-zinc-900 p-4 rounded-3xl flex gap-4 items-center">
            <img src={p.image_url} className="w-20 h-20 rounded-2xl object-cover" />
            <div className="flex-1">
              <p className="font-bold text-xs uppercase">{p.name}</p>
              <p className="text-orange-500 font-black">{p.price} ₽</p>
            </div>
            <button 
              onClick={() => applyDiscount(p.id, p.price)}
              className="bg-orange-500 text-black px-4 py-2 rounded-xl font-bold text-[10px] uppercase"
            >
              Скидка %
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}