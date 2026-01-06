"use client";
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]); // Состояние корзины
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('все');

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('product_market').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
  }

  // Функции для корзины
  const addToCart = (product: any) => {
    setCart([...cart, product]);
  };

  const removeFromCart = (id: any) => {
    const index = cart.findIndex(item => item.id === id);
    if (index !== -1) {
      const newCart = [...cart];
      newCart.splice(index, 1);
      setCart(newCart);
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.price || 0), 0);

  const checkout = () => {
    const message = cart.map(item => `- ${item.name} (${item.price} ₽)`).join('\n');
    const fullText = `Здравствуйте! Хочу заказать:\n\n${message}\n\nИтого: ${totalPrice} ₽`;
    // Замени @твой_ник на свой реальный ник в Telegram
    window.open(`https://t.me/твой_ник?text=${encodeURIComponent(fullText)}`, '_blank');
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'все' || p.category === category;
    return matchesSearch && matchesCat && !p.is_story;
  });

  const stories = products.filter(p => p.is_story);

  return (
    <div className="bg-black min-h-screen text-white font-sans selection:bg-white selection:text-black pb-40">
      <div className="max-w-md mx-auto">
        
        {/* ПОИСК */}
        <div className="px-6 pt-12 pb-6">
          <input 
            type="text"
            placeholder="Найти что-то особенное..."
            className="w-full bg-zinc-900 border border-white/5 rounded-[2rem] py-5 px-8 text-sm focus:outline-none focus:border-white/20 transition-all"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* STORIES */}
        {stories.length > 0 && (
          <div className="flex gap-4 overflow-x-auto px-6 mb-8 no-scrollbar">
            {stories.map((s) => (
              <div key={s.id} className="flex-shrink-0 flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-orange-400 to-fuchsia-600">
                  <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-zinc-900">
                    <img src={s.image_url[0]} className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* КАТЕГОРИИ */}
        <div className="flex gap-2 overflow-x-auto px-6 mb-8 no-scrollbar">
          {['все', 'цветы', 'еда', 'одежда', 'разное'].map(cat => (
            <button 
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${category === cat ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-white/30'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* СЕТКА ТОВАРОВ */}
        <div className="px-4 grid grid-cols-2 gap-3">
          {filteredProducts.map((p) => (
            <div key={p.id} className="bg-zinc-900/30 rounded-[2.5rem] p-2 border border-white/5 flex flex-col">
              <div className="relative aspect-[1/1.2] overflow-hidden rounded-[2rem] mb-4 bg-zinc-900">
                <img src={p.image_url[0]} className="w-full h-full object-cover" />
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10">
                   <span className="text-white font-black text-[11px]">{p.price} ₽</span>
                </div>
              </div>
              <div className="px-3 pb-3">
                <h3 className="font-black uppercase text-[10px] tracking-widest mb-3 truncate">{p.name}</h3>
                <button 
                  onClick={() => addToCart(p)}
                  className="w-full bg-white text-black py-3 rounded-2xl font-black uppercase text-[9px] active:scale-95 transition-all"
                >
                  В корзину
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ПАНЕЛЬ КОРЗИНЫ (ПОЯВЛЯЕТСЯ, ЕСЛИ ЕСТЬ ТОВАРЫ) */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-[#0c0c0c]/90 backdrop-blur-2xl border-t border-white/10 p-6 rounded-t-[3rem] shadow-2xl z-50">
            <div className="max-w-md mx-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Итого к оплате:</p>
                  <p className="text-2xl font-black">{totalPrice} ₽</p>
                </div>
                <div className="flex -space-x-3 overflow-hidden">
                   {cart.slice(0, 4).map((item, i) => (
                     <img key={i} src={item.image_url[0]} className="inline-block h-10 w-10 rounded-full ring-2 ring-black object-cover bg-zinc-800" />
                   ))}
                   {cart.length > 4 && (
                     <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 ring-2 ring-black text-[10px] font-black">
                       +{cart.length - 4}
                     </div>
                   )}
                </div>
              </div>
              
              <div className="flex gap-3">
                 <button 
                   onClick={() => setCart([])}
                   className="bg-zinc-800 text-white px-6 rounded-2xl font-black uppercase text-[9px] tracking-widest"
                 >
                   Очистить
                 </button>
                 <button 
                   onClick={checkout}
                   className="flex-1 bg-orange-500 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                 >
                   Оформить заказ ({cart.length})
                 </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}