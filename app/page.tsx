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
  
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Все');

  // НОВОЕ: Эффект для инициализации и синхронизации корзины с localStorage
  useEffect(() => {
    const syncCart = () => {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    };

    syncCart(); // Загружаем при старте

    window.addEventListener('storage', syncCart);
    window.addEventListener('cartUpdated', syncCart);

    return () => {
      window.removeEventListener('storage', syncCart);
      window.removeEventListener('cartUpdated', syncCart);
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      const [prodRes, storyRes] = await Promise.all([
        supabase.from('product_market').select('*, sellers(shop_name)'),
        supabase.from('seller_stories').select('*').order('created_at', { ascending: false })
      ]);
      setProducts(prodRes.data || []);
      setStories(storyRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    if (!phone) return;

    const fetchMyOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_phone', phone)
        .order('created_at', { ascending: false });
      if (data) setUserOrders(data);
    };
    fetchMyOrders();

    const channel = supabase
      .channel('order-status')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `buyer_phone=eq.${phone}` }, 
        (payload) => {
          setUserOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o));
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `buyer_phone=eq.${phone}` },
        (payload) => {
          setUserOrders(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const rawCat = typeof p.category === 'object' && p.category !== null ? p.category.name : p.category;
      const pCat = String(rawCat || 'Без категории').toLowerCase().trim();
      const activeCatLower = activeCategory.toLowerCase().trim();
      const matchesCategory = activeCategory === 'Все' || pCat === activeCatLower;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, activeCategory]);

  const categories = useMemo(() => {
    const rawCats = products.map(p => {
      const val = typeof p.category === 'object' && p.category !== null ? p.category.name : p.category;
      return String(val || 'Без категории');
    });
    return ['Все', ...Array.from(new Set(rawCats))];
  }, [products]);

  // ИЗМЕНЕНО: Теперь функции корзины обновляют и localStorage
  const addToCart = (product: any) => {
    const newCart = [...cart, product];
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };
  
  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    const phone = prompt("Введите ваш номер телефона для связи:");
    if (!phone) return;
    localStorage.setItem('userPhone', phone);
    const ordersBySeller = cart.reduce((acc: any, item: any) => {
      const sId = item.seller_id || '589b6a02-9efa-41ba-bcb5-4dc6c2eff9a7'; 
      if (!acc[sId]) acc[sId] = [];
      acc[sId].push(item);
      return acc;
    }, {});
    try {
      for (const sId in ordersBySeller) {
        const items = ordersBySeller[sId];
        const pName = items.map((i: any) => i.name).join(', ');
        const totalPrice = items.reduce((sum: number, i: any) => sum + Number(i.price), 0);
        const { data, error } = await supabase.from('orders').insert([{
          product_name: pName,
          price: totalPrice,
          buyer_phone: phone,
          seller_id: sId,
          status: 'Новый'
        }]).select().single();
        if (data && !error) {
          await fetch('/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: data.id,
              product_name: pName,
              price: totalPrice,
              buyer_phone: phone,
              seller_id: sId
            })
          });
        }
      }
      alert("Заказ оформлен! Статус появится в корзине.");
      // ИЗМЕНЕНО: Очистка localStorage после оформления
      setCart([]);
      localStorage.removeItem('cart');
      setIsCartOpen(false);
    } catch (e) { 
      alert("Ошибка при заказе"); 
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center font-black italic text-orange-500 uppercase tracking-widest">
      Загрузка маркета...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-black pb-32">
      {selectedStory && (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center" onClick={() => setSelectedStory(null)}>
          <img src={selectedStory} className="max-w-full max-h-full object-contain" alt="Story" />
          <div className="absolute top-10 right-10 text-white text-3xl font-light">×</div>
        </div>
      )}

      <header className="bg-white px-6 pt-12 pb-6 rounded-b-[3.5rem] shadow-sm mb-4">
        <div className="flex gap-4 items-center mb-8">
          <div className="flex-1 bg-zinc-100 rounded-2xl flex items-center px-4 py-4 border border-zinc-200/30">
            <span className="mr-3 text-zinc-400">🔍</span>
            <input 
              type="text" 
              placeholder="Найти в маркете..." 
              className="bg-transparent outline-none w-full text-[11px] font-black uppercase italic tracking-tighter"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setIsCartOpen(true)} className="relative bg-black text-white p-4.5 rounded-[1.4rem] active:scale-90 transition-all shadow-xl shadow-black/10">
              🛒 {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 w-6 h-6 rounded-full text-[10px] flex items-center justify-center border-2 border-white font-black">{cart.length}</span>}
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {stories.map((s) => (
            <div key={s.id} onClick={() => setSelectedStory(s.image_url)} className="flex-shrink-0 w-16 h-16 rounded-full p-[2px] border-2 border-orange-500 active:scale-95 transition-all cursor-pointer shadow-sm">
              <img src={s.image_url} className="w-full h-full rounded-full object-cover" alt="Story preview" />
            </div>
          ))}
        </div>
      </header>

      <div className="px-6 flex gap-2 overflow-x-auto no-scrollbar mb-6">
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setActiveCategory(cat)}
            className={`px-7 py-2.5 rounded-full text-[10px] font-black uppercase italic tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white text-zinc-400 border border-zinc-100 shadow-sm'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <main className="px-4 grid grid-cols-2 gap-4">
        {filteredProducts.map((p) => (
          <div key={p.id} className="bg-white rounded-[2.8rem] p-2 border border-zinc-100 shadow-sm animate-fade-in hover:shadow-md transition-shadow">
            <div className="relative aspect-square mb-3">
              <img src={p.image_url} className="w-full h-full object-cover rounded-[2.4rem]" alt={p.name} />
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full text-[9px] font-black italic shadow-sm">
                {p.price} ₽
              </div>
            </div>
            <div className="px-3 pb-3 text-center">
              <div 
                onClick={() => window.location.href = `/seller/${p.seller_id}`}
                className="text-[7px] text-zinc-400 uppercase font-bold tracking-widest mb-1 cursor-pointer hover:text-orange-500 transition-colors"
              >
                {p.sellers?.shop_name || 'Магазин'}
              </div>
              
              <h3 className="font-bold text-[10px] uppercase tracking-tighter mb-4 h-8 line-clamp-2 leading-none">{p.name}</h3>
              <button 
                onClick={() => addToCart(p)}
                className="w-full bg-black text-white py-4.5 rounded-[1.4rem] text-[9px] font-black uppercase italic tracking-[0.1em] active:bg-orange-500 transition-all shadow-sm"
              >
                КУПИТЬ
              </button>
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-2 py-20 text-center opacity-20 font-black uppercase italic text-xs tracking-widest">Ничего не найдено</div>
        )}
      </main>

      {isCartOpen && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-md flex items-end" onClick={() => setIsCartOpen(false)}>
          <div className="bg-white w-full rounded-t-[4rem] p-10 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Корзина</h2>
              <button onClick={() => setIsCartOpen(false)} className="bg-zinc-100 p-3 rounded-full text-zinc-400">✕</button>
            </div>

            {userOrders.length > 0 && (
              <div className="mb-10 space-y-3">
                <p className="text-[10px] font-black uppercase italic text-zinc-400 tracking-widest ml-2">Статус ваших заказов:</p>
                {userOrders.slice(0, 3).map((order) => (
                  <div key={order.id} className="flex justify-between items-center bg-zinc-50 border border-zinc-100 p-4 rounded-[1.8rem]">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-tighter line-clamp-1 w-32">{order.product_name}</span>
                      <span className="text-[8px] text-zinc-400 font-mono">#{order.id.slice(0,8)}</span>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase italic ${
                      order.status === 'В пути' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 
                      order.status === 'Завершен' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 
                      'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    }`}>
                      {order.status || 'НОВЫЙ'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mb-10 pr-2">
              <p className="text-[10px] font-black uppercase italic text-zinc-400 tracking-widest ml-2 mb-3">Товары к покупке:</p>
              {cart.map((item, idx) => (
                <div key={idx} onClick={() => removeFromCart(idx)} className="flex items-center justify-between mb-4 bg-zinc-50 p-4 rounded-[1.8rem] border border-zinc-100 active:bg-red-50 active:border-red-100 transition-all">
                  <div className="flex items-center gap-4">
                    <img src={item.image_url} className="w-14 h-14 rounded-2xl object-cover" alt={item.name} />
                    <div className="flex flex-col">
                       <span className="font-bold text-[11px] uppercase tracking-tighter line-clamp-1">{item.name}</span>
                       <span className="text-[9px] text-zinc-400 font-bold uppercase italic mt-1">Удалить</span>
                    </div>
                  </div>
                  <span className="font-black text-orange-500 italic text-sm">{item.price} ₽</span>
                </div>
              ))}
              {cart.length === 0 && <p className="text-center py-10 opacity-30 font-black uppercase italic text-xs">Корзина пуста</p>}
            </div>

            {cart.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between px-2 font-black uppercase italic text-[10px] tracking-widest text-zinc-400">
                   <span>Итого:</span>
                   <span className="text-black">{cart.reduce((s, i) => s + Number(i.price), 0)} ₽</span>
                </div>
                <button onClick={checkout} className="w-full bg-orange-500 text-white py-7 rounded-[2.5rem] font-black uppercase italic text-sm shadow-2xl shadow-orange-500/40 active:scale-95 transition-all">
                  Оформить заказ
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fade-in { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}