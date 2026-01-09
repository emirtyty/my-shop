'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setErrorInfo(null);
    try {
      // Прямой запрос без фильтров и проверок
      const { data, error } = await supabase
        .from('product_market')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        setErrorInfo(error.message);
      } else {
        setProducts(data || []);
      }
    } catch (e: any) {
      setErrorInfo(e.message);
    } finally {
      setLoading(false);
    }
  }

  const applyDiscount = async (product: any) => {
    const percent = prompt('Введите % скидки (например 10):');
    if (!percent) return;
    
    const disc = Number(percent);
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
      alert("Ошибка при сохранении: " + error.message);
    } else {
      alert("Скидка применена!");
      fetchData();
    }
  };

  const resetPrice = async (product: any) => {
    const { error } = await supabase
      .from('product_market')
      .update({ 
        price: product.old_price, 
        old_price: null 
      })
      .eq('id', product.id);

    if (error) alert(error.message);
    else fetchData();
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white font-sans">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-orange-500 uppercase italic tracking-tighter">УПРАВЛЕНИЕ</h1>
        <button 
          onClick={fetchData} 
          className="bg-zinc-800 p-3 rounded-full text-[10px] font-bold uppercase"
        >
          Обновить 🔄
        </button>
      </div>

      {errorInfo && (
        <div className="bg-red-500/20 border border-red-500 text-red-500 p-4 rounded-2xl mb-6 text-xs font-mono">
          ОШИБКА БАЗЫ: {errorInfo}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-zinc-500 font-black uppercase italic text-[10px] animate-pulse">Загрузка товаров из Supabase...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {products.length === 0 && !errorInfo && (
            <div className="text-center py-20 bg-zinc-900/50 rounded-[3rem] border border-dashed border-zinc-800">
              <p className="text-zinc-600 font-bold uppercase italic text-[10px]">В базе данных нет товаров</p>
            </div>
          )}
          
          {products.map(p => (
            <div key={p.id} className="bg-zinc-900 p-5 rounded-[2.5rem] flex gap-4 items-center border border-zinc-800 hover:border-orange-500/30 transition-all shadow-2xl">
              <div className="relative">
                <img src={p.image_url} className="w-20 h-20 rounded-[1.5rem] object-cover bg-zinc-800" />
                {p.old_price && (
                    <div className="absolute -top-2 -left-2 bg-orange-500 text-black text-[8px] font-black px-2 py-1 rounded-full uppercase italic">Скидка</div>
                )}
              </div>

              <div className="flex-1">
                <p className="font-bold text-[10px] uppercase text-zinc-500 mb-1">{p.name || 'Без названия'}</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-white">{p.price} ₽</span>
                  {p.old_price && (
                    <span className="text-zinc-600 line-through text-xs font-bold">{p.old_price} ₽</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => applyDiscount(p)} 
                  className="bg-orange-500 text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase active:scale-90 transition-all shadow-lg shadow-orange-500/20"
                >
                  СКИДКА %
                </button>
                {p.old_price && (
                  <button 
                    onClick={() => resetPrice(p)} 
                    className="bg-zinc-800 text-zinc-400 px-4 py-2 rounded-xl font-bold text-[8px] uppercase border border-zinc-700 active:bg-zinc-700"
                  >
                    Сброс
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-10 text-center">
        <p className="text-zinc-700 text-[8px] font-bold uppercase italic tracking-widest">
            Connected to: {process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase') ? 'SUPABASE ACTIVE' : 'UNKNOWN'}
        </p>
      </div>
    </div>
  );
}