'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [order, setOrder] = useState<any>(null);
  const [search, setSearch] = useState('');

  // Данные для историй (можешь заменить на свои)
  const stories = [
    { id: 1, img: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=200', title: 'Скидки' },
    { id: 2, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200', title: 'Новинки' },
    { id: 3, img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200', title: 'Топ-10' },
    { id: 4, img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200', title: 'Одежда' },
    { id: 5, img: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200', title: 'Аксессуары' },
  ];

  useEffect(() => {
    async function fetchData() {
      // 1. Грузим товары
      const { data } = await supabase.from('product_market').select('*');
      setProducts(data || []);

      // 2. Проверяем последний заказ
      const phone = localStorage.getItem('buyer_phone');
      if (phone) {
        const { data: ord } = await supabase.from('orders').select('*').eq('buyer_phone', phone).order('created_at', { ascending: false }).limit(1).single();
        if (ord && ord.status !== 'Завершен') setOrder(ord);
      }
    }
    fetchData();

    // Realtime статус
    const sub = supabase.channel('st').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (p) => {
      const phone = localStorage.getItem('buyer_phone');
      if (p.new.buyer_phone === phone) setOrder(p.new.status === 'Завершен' ? null : p.new);
    }).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const handleBuy = async (p: any) => {
    const phone = prompt("Твой телефон:");
    if (!phone) return;
    const { error } = await supabase.from('orders').insert([{ product_name: p.name, price: p.price, buyer_phone: phone, seller_id: p.seller_id, status: 'Новый' }]);
    if (!error) { localStorage.setItem('buyer_phone', phone); window.location.reload(); }
  };

  return (
    <main className="min-h-screen bg-[#F4F4F7] text-black pb-20">
      {/* 1. ПОИСК И ШАПКА */}
      <div className="bg-white px-4 pt-4 pb-2 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3 bg-zinc-100 p-3 rounded-2xl border border-zinc-200">
          <span className="opacity-40">🔍</span>
          <input 
            type="text" 
            placeholder="Поиск в Радужном" 
            className="bg-transparent outline-none text-sm w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 2. ИСТОРИИ (Stories) */}
      <div className="flex overflow-x-auto gap-4 p-4 no-scrollbar bg-white">
        {stories.map(s => (
          <div key={s.id} className="flex-shrink-0 flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-full p-[2px] border-2 border-orange-500">
              <img src={s.img} className="w-full h-full rounded-full object-cover" />
            </div>
            <span className="text-[10px] font-medium">{s.title}</span>
          </div>
        ))}
      </div>

      {/* 3. КАТЕГОРИИ (Фильтры) */}
      <div className="flex overflow-x-auto gap-2 px-4 py-2 bg-white mb-2 no-scrollbar">
        {['Все', 'Электроника', 'Дом', 'Еда', 'Красота', 'Спорт'].map(c => (
          <button key={c} className="bg-zinc-100 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap active:bg-orange-500 active:text-white">
            {c}
          </button>
        ))}
      </div>

      {/* 4. СЕТКА ТОВАРОВ (2 В РЯД) */}
      <div className="p-3 grid grid-cols-2 gap-3">
        {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map((p) => (
          <div key={p.id} className="bg-white rounded-3xl overflow-hidden shadow-sm flex flex-col">
            <div className="h-40 relative">
              <img src={p.image_url} className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 bg-white/80 backdrop-blur p-1.5 rounded-full text-[10px]">❤️</div>
            </div>
            <div className="p-3 flex flex-col flex-1">
              <h3 className="font-bold text-xs leading-tight mb-2 h-8 line-clamp-2">{p.name}</h3>
              <p className="text-orange-600 font-black text-base mb-3 leading-none">{p.price} ₽</p>
              <button onClick={() => handleBuy(p)} className="mt-auto bg-orange-500 text-white py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
                Купить
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 5. ПЛАШКА СТАТУСА (У ДВЕРЕЙ) */}
      {order && (
        <div className="fixed bottom-4 left-4 right-4 z-[60]">
          <div className={`p-4 rounded-[2rem] shadow-2xl flex items-center justify-between border-2 transition-all ${
            order.status === 'У дверей' ? 'bg-orange-500 border-white animate-bounce' : 'bg-zinc-900 border-zinc-800 text-white'
          }`}>
            <div className="flex gap-3 items-center">
              <span className="text-2xl">{order.status === 'У дверей' ? '🔔' : '🚚'}</span>
              <div>
                <p className="text-[9px] uppercase font-black opacity-60">Доставка</p>
                <p className="font-black text-sm uppercase leading-none">{order.status === 'У дверей' ? 'ЖДЕТ У ДВЕРЕЙ!' : order.status}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}