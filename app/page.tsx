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
  const [cartBumping, setCartBumping] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Все');

  // Состояния для статуса заказа
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [checkPhone, setCheckPhone] = useState('');
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [isSearchingOrders, setIsSearchingOrders] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('cart');
    if (saved) { try { setCart(JSON.parse(saved)); } catch (e) { console.error(e); } }
    const savedPhone = localStorage.getItem('userPhone');
    if (savedPhone) setCheckPhone(savedPhone);
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [prodRes, storyRes] = await Promise.all([
          supabase.from('product_market').select('*, sellers(shop_name)'),
          supabase.from('seller_stories').select('*').order('created_at', { ascending: false })
        ]);
        setProducts(prodRes.data || []);
        setStories(storyRes.data || []);
      } catch (err) {
        console.error("Ошибка загрузки:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const addToCart = (product: any) => {
    setCart(prev => [...prev, product]);
    setCartBumping(true);
    setTimeout(() => setCartBumping(false), 300);
  };
  
  const removeFromCartOnce = (productId: string) => {
    setCart(prev => {
      const index = prev.findLastIndex(item => item.id === productId);
      if (index === -1) return prev;
      const newCart = [...prev];
      newCart.splice(index, 1);
      return newCart;
    });
  };

  const getProductCount = (id: string) => cart.filter(item => item.id === id).length;

  const fetchMyOrders = async () => {
    if (!checkPhone) return;
    setIsSearchingOrders(true);
    setHasSearched(false);
    try {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_phone', checkPhone)
        .order('created_at', { ascending: false });
      setUserOrders(data || []);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingOrders(false);
    }
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    const phone = prompt("Введите ваш номер телефона:");
    if (!phone) return;
    localStorage.setItem('userPhone', phone);

    const ordersBySeller = cart.reduce((acc: any, item: any) => {
      const sId = item.seller_id || 'default-id'; 
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
            body: JSON.stringify({ order_id: data.id, product_name: pName, price: totalPrice, buyer_phone: phone, seller_id: sId })
          });
        }
      }
      alert("✅ ЗАКАЗ ОТПРАВЛЕН!");
      setCart([]);
      setIsCartOpen(false);
    } catch (e) { alert("❌ ОШИБКА"); }
  };

  const categories = useMemo(() => {
    const cats = products.map(p => String(typeof p.category === 'object' ? p.category?.name : p.category || 'Без категории'));
    return ['Все', ...Array.from(new Set(cats))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const catName = String(typeof p.category === 'object' ? p.category?.name : p.category || 'Без категории');
      return matchesSearch && (activeCategory === 'Все' || catName === activeCategory);
    });
  }, [products, searchQuery, activeCategory]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black italic text-orange-500 uppercase tracking-widest animate-pulse">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-black pb-32">
      {/* HEADER */}
      <header className="bg-white px-6 pt-12 pb-6 rounded-b-[3.5rem] shadow-sm mb-4 sticky top-0 z-50">
        <div className="flex gap-4 items-center mb-4">
          <div className="flex-1 bg-zinc-100 rounded-2xl flex items-center px-4 py-4 border border-zinc-200/30 shadow-inner">
            <input 
              type="text" 
              placeholder="ПОИСК..." 
              className="bg-transparent outline-none w-full text-[11px] font-black uppercase italic"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setIsCartOpen(true)} className={`relative bg-black text-white p-4.5 rounded-[1.4rem] transition-all duration-300 ${cartBumping ? 'scale-110 bg-orange-500 shadow-lg shadow-orange-200' : 'active:scale-90'}`}>
              🛒 {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 w-6 h-6 rounded-full text-[10px] flex items-center justify-center border-2 border-white font-black animate-pop">{cart.length}</span>}
          </button>
        </div>
        
        <button onClick={() => setIsStatusModalOpen(true)} className="text-[9px] font-black uppercase italic text-zinc-400 mb-6 ml-2 hover:text-orange-500 transition-colors">🔍 ГДЕ МОЙ ЗАКАЗ?</button>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {stories.map((s) => (
            <div key={s.id} onClick={() => setSelectedStory(s.image_url)} className="flex-shrink-0 w-16 h-16 rounded-full p-[2px] border-2 border-orange-500 active:scale-90 transition-all cursor-pointer shadow-sm">
              <img src={s.image_url} className="w-full h-full rounded-full object-cover" alt="" />
            </div>
          ))}
        </div>
      </header>

      {/* CATEGORIES */}
      <div className="px-6 flex gap-2 overflow-x-auto no-scrollbar mb-6">
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setActiveCategory(cat)}
            className={`px-7 py-2.5 rounded-full text-[10px] font-black uppercase italic tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-orange-500 text-white shadow-lg -translate-y-1' : 'bg-white text-zinc-400 border border-zinc-100 active:scale-95'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* PRODUCT GRID */}
      <main className="px-4 grid grid-cols-2 gap-4">
        {filteredProducts.map((p, index) => {
          const count = getProductCount(p.id);
          return (
            <div key={p.id} className="bg-white rounded-[2.8rem] p-2 border border-zinc-100 shadow-sm animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
              <div className="relative aspect-square mb-3 overflow-hidden rounded-[2.4rem]">
                <img src={p.image_url} className="w-full h-full object-cover" alt={p.name} />
                <div className="absolute top-3 right-3 bg-white/95 px-3 py-1.5 rounded-full text-[9px] font-black italic shadow-sm">{p.price} ₽</div>
              </div>
              <div className="px-3 pb-3 text-center">
                <div onClick={() => window.location.href = `/seller/${p.seller_id}`} className="text-[7px] text-zinc-400 uppercase font-bold mb-1 cursor-pointer">{p.sellers?.shop_name || 'МАГАЗИН'}</div>
                <h3 className="font-bold text-[10px] uppercase tracking-tighter mb-4 h-8 line-clamp-2 leading-none">{p.name}</h3>
                <div className="relative h-[46px] w-full">
                  {count === 0 ? (
                    <button onClick={() => addToCart(p)} className="w-full h-full bg-black text-white rounded-[1.2rem] text-[9px] font-black uppercase italic active:scale-95 transition-all shadow-md">КУПИТЬ</button>
                  ) : (
                    <div className="flex items-center justify-between bg-zinc-100 rounded-[1.2rem] h-full border border-zinc-200 animate-pop">
                      <button onClick={() => removeFromCartOnce(p.id)} className="flex-1 h-full font-black text-lg active:scale-75 transition-all">—</button>
                      <span className="px-2 text-[12px] font-black italic">{count}</span>
                      <button onClick={() => addToCart(p)} className="flex-1 h-full font-black text-lg active:scale-75 transition-all">+</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* MODAL: STATUS TRACKING */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-end animate-fade-in" onClick={() => setIsStatusModalOpen(false)}>
          <div className="bg-white w-full rounded-t-[3.5rem] p-8 animate-slide-up shadow-2xl max-h-[80vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-8" />
            <div className="flex flex-col items-center mb-8 text-center">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">МОИ ЗАКАЗЫ</h2>
              <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Отслеживание по номеру</p>
            </div>
            <div className="relative flex items-center mb-10">
              <div className="absolute left-5 text-zinc-400 text-lg">📱</div>
              <input 
                type="tel" 
                placeholder="8 999 000 00 00" 
                className="w-full bg-zinc-100 border-2 border-transparent focus:border-orange-500/20 focus:bg-white p-5 pl-14 rounded-[2rem] text-sm font-black outline-none italic transition-all shadow-inner"
                value={checkPhone}
                onChange={(e) => setCheckPhone(e.target.value)}
              />
              <button 
                onClick={fetchMyOrders}
                disabled={isSearchingOrders}
                className={`absolute right-2 w-12 h-12 rounded-full flex items-center justify-center transition-all ${isSearchingOrders ? 'bg-zinc-200' : 'bg-black active:scale-90 shadow-lg'}`}
              >
                {isSearchingOrders ? (
                  <div className="w-5 h-5 border-2 border-zinc-400 border-t-black rounded-full animate-spin" />
                ) : (
                  <span className="text-white text-lg">🔍</span>
                )}
              </button>
            </div>
            <div className="space-y-4">
              {userOrders.length > 0 ? userOrders.map(order => (
                <div key={order.id} className="bg-zinc-50 border border-zinc-100 p-6 rounded-[2.5rem] flex justify-between items-center shadow-sm animate-fade-in">
                  <div className="max-w-[65%]">
                    <div className="text-[11px] font-black uppercase italic leading-tight">{order.product_name}</div>
                    <div className="text-[8px] text-zinc-400 font-bold mt-2 uppercase">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Недавно'} • #{order.id?.slice(0,5)}
                    </div>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-full border border-zinc-200 shadow-sm transition-all">
                    <span className="text-[9px] font-black uppercase italic text-orange-500 animate-pulse-slow">{order.status || 'Новый'}</span>
                  </div>
                </div>
              )) : hasSearched ? (
                <div className="text-center py-16 animate-fade-in">
                  <div className="text-4xl mb-4 grayscale">📦</div>
                  <p className="text-[11px] font-black uppercase italic text-zinc-500 tracking-widest">Заказы не найдены</p>
                </div>
              ) : (
                <div className="text-center py-16 opacity-30 font-black uppercase italic text-[10px] tracking-widest">Введите номер телефона</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CART */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-end animate-fade-in" onClick={() => setIsCartOpen(false)}>
          <div className="bg-white w-full rounded-t-[3.5rem] p-8 animate-slide-up shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-6" />
            <h2 className="text-2xl font-black uppercase italic mb-8 text-center tracking-tighter">КОРЗИНА</h2>
            {cart.length > 0 ? (
              <div className="space-y-4">
                {Array.from(new Set(cart.map(i => i.id))).map(id => {
                  const item = cart.find(c => c.id === id);
                  const qty = getProductCount(id);
                  if (!item) return null;
                  return (
                    <div key={id} className="flex items-center justify-between bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                      <div className="flex items-center gap-3">
                        <img src={item.image_url} className="w-12 h-12 rounded-xl object-cover shadow-sm" alt="" />
                        <div className="flex flex-col">
                          <span className="font-bold text-[10px] uppercase line-clamp-1">{item.name}</span>
                          <span className="text-[9px] text-orange-500 font-black italic">{item.price * qty} ₽</span>
                        </div>
                      </div>
                      <div className="flex items-center bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
                        <button onClick={() => removeFromCartOnce(id)} className="px-3 py-1 font-black active:scale-75 transition-all text-zinc-400">—</button>
                        <span className="text-[10px] font-black w-6 text-center animate-pop">{qty}</span>
                        <button onClick={() => addToCart(item)} className="px-3 py-1 font-black active:scale-75 transition-all">+</button>
                      </div>
                    </div>
                  );
                })}
                <button onClick={checkout} className="w-full bg-orange-500 text-white py-6 rounded-[2.2rem] font-black uppercase italic shadow-xl shadow-orange-500/30 active:scale-95 transition-all mt-6">
                    ОФОРМИТЬ ({cart.reduce((s, i) => s + Number(i.price), 0)} ₽)
                </button>
              </div>
            ) : <p className="text-center py-10 font-black uppercase italic opacity-20 tracking-widest">ПУСТО</p>}
          </div>
        </div>
      )}

      {/* STORY MODAL */}
      {selectedStory && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in" onClick={() => setSelectedStory(null)}>
          <img src={selectedStory} className="max-w-full max-h-[85vh] object-contain shadow-2xl" alt="" />
        </div>
      )}

      <style jsx global>{`
        body { -webkit-tap-highlight-color: transparent; scroll-behavior: smooth; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes pop { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-pop { animation: pop 0.25s cubic-bezier(0.17, 0.67, 0.83, 0.67); }
        .animate-spin { animation: spin 0.8s linear infinite; }
        .animate-pulse-slow { animation: pulse-slow 2s infinite; }
      `}</style>
    </div>
  );
}