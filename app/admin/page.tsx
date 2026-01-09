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
    // Берем текущую цену как базу для скидки
    const currentPrice = Number(product.price);
    const finalPrice = Math.round(currentPrice - (currentPrice * (disc / 100)));
    
    // ВАЖНО: Мы сохраняем старую цену в поле old_price, а новую в price
    const { error } = await supabase
      .from('product_market')
      .update({ 
        price: finalPrice, 
        old_price: currentPrice // Сюда уходит цена ДО скидки
      })
      .eq('id', product.id);

    if (error) {
      alert("Ошибка базы: " + error.message);
    } else {
      alert(`Скидка ${disc}% применена! Старая цена: ${currentPrice}, Новая: ${finalPrice}`);
      window.location.reload(); 
    }
  };

  const removeDiscount = async (product: any) => {
    if (!product.old_price) return;
    
    // Возвращаем старую цену на место и зануляем old_price
    const { error } = await supabase
      .from('product_market')
      .update({ 
        price: product.old_price, 
        old_price: null 
      })
      .eq('id', product.id);

    if (error) alert(error.message);
    else window.location.reload();
  };

  return (
    <div className="p-5 bg-black min-h-screen text-white">
      <h1 className="text-2xl font-black text-orange-500 mb-8 uppercase italic">Управление</h1>
      <div className="grid gap-4">
        {products.map(p => (
          <div key={p.id} className="bg-zinc-900 p-4 rounded-3xl flex gap-4 items-center border border-zinc-800">
            <img src={p.image_url} className="w-20 h-20 rounded-2xl object-cover" />
            <div className="flex-1">
              <p className="font-bold text-xs uppercase tracking-tighter">{p.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-orange-500 font-black text-lg">{p.price} ₽</p>
                {p.old_price && (
                  <p className="text-zinc-500 text-[10px] line-through font-bold">{p.old_price} ₽</p>
                )}
              </div>
              {p.old_price && (
                <div className="inline-block bg-orange-500/10 text-orange-500 text-[8px] px-2 py-0.5 rounded-full font-black uppercase mt-1">
                  Активна скидка
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => applyDiscount(p)}
                className="bg-orange-500 text-black px-4 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
              >
                Скидка %
              </button>
              
              {p.old_price && (
                <button 
                  onClick={() => removeDiscount(p)}
                  className="bg-zinc-800 text-zinc-400 px-4 py-2 rounded-xl font-bold text-[9px] uppercase border border-zinc-700 active:scale-95 transition-all"
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