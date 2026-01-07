'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Поиск и фильтры
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Все');

  useEffect(() => {
    async function fetchData() {
      const [prodRes, storyRes] = await Promise.all([
        supabase.from('product_market').select('*'),
        supabase.from('seller_stories').select('*').order('created_at', { ascending: false })
      ]);
      setProducts(prodRes.data || []);
      setStories(storyRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Логика фильтрации
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'Все' || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, activeCategory]);

  const categories = ['Все', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const addToCart = (product: any) => setCart([...cart, product]);
  
  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    const phone = prompt("Введите номер телефона:");
    if (!phone) return;

    const ordersBySeller = cart.reduce((acc: any, item: any) => {
      const sId = item.seller_id || 1;
      if (!acc[sId]) acc[sId] = [];
      acc[sId].push(item);
      return acc;
    }, {});

    try {
      for (const sId in ordersBySeller) {
        const items = ordersBySeller[sId];
        await supabase.from('orders').insert([{
          product_name: items.map((i: any) => i.name).join(', '),
          price: items.reduce((sum: number, i: any) => sum + Number(i.price), 0),
          buyer_phone: phone,
          seller_id: sId,
          status: 'Новый'
        }]);
      }
      alert("Готово! Продавцы получили ваш заказ.");
      setCart([]);
      setIsCartOpen(false);
    } catch (e) { alert("Ошибка заказа"); }
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center font-black italic text-orange-500">ЗАГРУЗКА...</div>;

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-black pb-32">
      {selectedStory && (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center" onClick={() => setSelectedStory(null)}>
          <img src={selectedStory} className="max-w-full max-h-full object-contain" />
          <div className="absolute top-10 right-10 text-white text-3xl">×</div>
        </div>
      )}

      {/* Шапка без названия */}
      <header className="bg-white px-6 pt-12 pb-6 rounded-b-[3.5rem] shadow-sm mb-4">
        <div className="flex gap-4 items-center mb-6">
          <div className="flex-1 bg-zinc-100 rounded-2xl flex items-center px-4 py-3 border border-zinc-200/50">
            <span className="mr-2 opacity-40">🔍</span>
            <input 
              type="text" 
              placeholder="Поиск цветов..." 
              className="bg-transparent outline-none w-full text-xs font-bold uppercase italic tracking-tighter"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setIsCartOpen(true)} className="relative bg-black text-white p-4 rounded-2xl active:scale-90 transition-all">
             🛒 {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 w-5 h-5 rounded-full text-[10px] flex items-center justify-center border-2 border-white">{cart.length}</span>}
          </button>
        </div>

        {/* Сторис */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {stories.map((s) => (
            <div key={s.id} onClick={() => setSelectedStory(s.image_url)} className="flex-shrink-0 w-16 h-16 rounded-full p-[2px] border-2 border-orange-500 active:scale-95 transition-all">
              <img src={s.image_url} className="w-full h-full rounded-full object-cover" />
            </div>
          ))}
        </div>
      </header>

      {/* Фильтры категорий */}
      <div className="px-6 flex gap-2 overflow-x-auto no-scrollbar mb-4">
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase italic tracking-widest transition-all ${activeCategory === cat ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white text-zinc-400 border border-zinc-100'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Сетка товаров */}
      <main className="px-4 grid grid-cols-2 gap-4">
        {filteredProducts.map((p) => (
          <div key={p.id} className="bg-white rounded-[2.5rem] p-2 border border-zinc-100 shadow-sm animate-fade-in">
            <div className="relative aspect-square mb-3">
              <img src={p.image_url} className="w-full h-full object-cover rounded-[2.2rem]" />
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-3 py-1 rounded-full text-[9px] font-black italic shadow-sm">
                {p.price}₽
              </div>
            </div>
            <div className="px-3 pb-3 text-center">
              <h3 className="font-bold text-[10px] uppercase tracking-tighter mb-4 h-8 line-clamp-2 leading-tight">{p.name}</h3>
              <button 
                onClick={() => addToCart(p)}
                className="w-full bg-black text-white py-4 rounded-2xl text-[9px] font-black uppercase italic tracking-widest active:bg-orange-500 transition-all"
              >
                КУПИТЬ
              </button>
            </div>
          </div>
        ))}
      </main>

      {/* Корзина */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm flex items-end" onClick={() => setIsCartOpen(false)}>
          <div className="bg-white w-full rounded-t-[4rem] p-10 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Корзина</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-zinc-300 font-bold uppercase text-[10px]">Закрыть</button>
            </div>
            
            <div className="max-h-[45vh] overflow-y-auto mb-10">
              {cart.map((item, idx) => (
                <div key={idx} onClick={() => removeFromCart(idx)} className="flex items-center justify-between mb-4 bg-zinc-50 p-4 rounded-3xl border border-dashed border-zinc-200 active:bg-red-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <img src={item.image_url} className="w-14 h-14 rounded-2xl object-cover" />
                    <span className="font-bold text-xs uppercase tracking-tighter">{item.name}</span>
                  </div>
                  <span className="font-black text-orange-500 italic">{item.price}₽</span>
                </div>
              ))}
              {cart.length === 0 && <p className="text-center py-20 opacity-20 font-black uppercase italic">Пусто</p>}
            </div>

            {cart.length > 0 && (
              <button onClick={checkout} className="w-full bg-orange-500 text-white py-7 rounded-[2.5rem] font-black uppercase italic text-sm shadow-2xl shadow-orange-500/40 active:scale-95 transition-all">
                Оплатить {cart.reduce((s, i) => s + Number(i.price), 0)}₽
              </button>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}