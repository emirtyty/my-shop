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

  const applyDiscount = async (product: any) => {
    const percent = prompt('Введите % скидки:');
    if (!percent) return;
    
    const disc = Number(percent);
    // Если уже есть старая цена, берем её за основу. Если нет — берем текущую.
    const basePrice = product.old_price || product.price;
    const finalPrice = Math.round(basePrice - (basePrice * (disc / 100)));
    
    const { error } = await supabase
      .from('product_market')
      .update({ 
        price: finalPrice, 
        old_price: basePrice 
      })
      .eq('id', product.id);

    if (error) alert(error.message);
    else {
      alert("Скидка сохранена в базу!");
      window.location.reload(); 
    }
  };

  const removeDiscount = async (id: string, oldPrice: number) => {
    if (!oldPrice) return;
    const { error } = await supabase
      .from('product_market')
      .update({ 
        price: oldPrice, 
        old_price: null 
      })
      .eq('id', id);

    if (error) alert(error.message);
    else window.location.reload();
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
              <div className="flex items-center gap-2">
                <p className="text-orange-500 font-black">{p.price} ₽</p>
                {p.old_price && (
                  <p className="text-zinc-500 text-[10px] line-through">{p.old_price} ₽</p>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => applyDiscount(p)}
                className="bg-orange-500 text-black px-4 py-2 rounded-xl font-bold text-[10px] uppercase"
              >
                Скидка %
              </button>
              
              {p.old_price && (
                <button 
                  onClick={() => removeDiscount(p.id, p.old_price)}
                  className="bg-zinc-800 text-zinc-400 px-4 py-2 rounded-xl font-bold text-[10px] uppercase border border-zinc-700"
                >
                  Сбросить
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}