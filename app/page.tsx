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

  // Для отслеживания статуса
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [checkPhone, setCheckPhone] = useState('');
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [isSearchingOrders, setIsSearchingOrders] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('cart');
    if (saved) { try { setCart(JSON.parse(saved)); } catch (e) { setCart([]); } }
    const savedPhone = localStorage.getItem('userPhone');
    if (savedPhone) setCheckPhone(savedPhone);
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

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
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_phone', checkPhone)
      .order('created_at', { ascending: false });
    if (data) setUserOrders(data);
    setIsSearchingOrders(false);
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    const phone = prompt("Введите ваш номер телефона для связи:");
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
      alert("✅ Заказ успешно оформлен!");
      setCart([]);
      setIsCartOpen(false);
    } catch (e) { alert("❌ Ошибка"); }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const catName = String(typeof p.category === 'object' ? p.category.name : p.category || 'Без категории');
      return matchesSearch && (activeCategory === 'Все' || catName === activeCategory);
    });
  }, [products, searchQuery, activeCategory]);

  const categories = useMemo(() => {
    const cats = products.map(p => String(typeof p.category === 'object' ? p.category.name : p.category || 'Без категории'));
    return ['Все', ...Array.from(new Set(cats))];
  }, [products]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black italic text-orange-500 uppercase tracking-widest">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-black pb-32">
      <header className="bg-white px-6 pt-12 pb-6 rounded-b-[3.5rem] shadow-sm mb-4 sticky top-0 z-50">
        <div className="flex gap-4 items-center mb-4">
          <div className="flex-1 bg-zinc-100 rounded-2xl flex items-center px-4 py-4 border border-zinc-200/30">
            <input 
              type="text" 
              placeholder="ПОИСК..." 
              className="bg-transparent outline-none w-full text-[11px] font-black uppercase italic"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setIsCartOpen(true)} className={`relative bg-black text-white p-4.5 rounded-[1.4rem] transition-all duration-300 ${cartBumping ? 'scale-110 bg-orange-500' : 'active:scale-90'}`}>
              🛒 {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 w-6 h-6 rounded-full text-[10px] flex items-center justify-center border-2 border-white font-black">{cart.length}</span>}
          </button>
        </div>
        
        {/* Кнопка статуса заказа */}
        <div className="flex justify-between items-center mb-6 px-2">
            <button 
                onClick={() => setIsStatusModalOpen(true)}
                className="text-[9px] font-black uppercase italic text-zinc-400 hover:text-orange-500 transition-colors flex items-center gap-1"
            >
                🔍 ГДЕ МОЙ ЗАКАЗ?
            </button>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {stories.map((s) => (
            <div key={s.id} onClick={() => setSelectedStory(s.image_url)} className="flex-shrink-0 w-16 h-16 rounded-full p-[2px] border-2 border-orange-500 active:scale-90 transition-all cursor-pointer">
              <img src={s.image_url} className="w-full h-full rounded-full object-cover" alt="" />
            </div>
          ))}
        </div>
      </header>

      {/* КАТЕГОРИИ */}
      <div className="px-6 flex gap-2 overflow-x-auto no-scrollbar mb-6">
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setActiveCategory(cat)}
            className={`px-7 py-2.5 rounded-full text-[10px] font-black uppercase italic tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-zinc-400 border border-zinc-100 active:scale-95'}`}
          >
            {cat}
          </button>
        ))}
      </div>

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
                    <button onClick={() => addToCart(p)} className="w-full h-full bg-black text-white rounded-[1.2rem] text-[9px] font-black uppercase italic active:scale-95 transition-all">КУПИТЬ</button>
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

      {/* МОДАЛКА СТАТУСА ЗАКАЗА */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-end animate-fade-in" onClick={() => setIsStatusModalOpen(false)}>
          <div className="bg-white w-full rounded-t-[3.5rem] p-8 animate-slide-up shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-6" />
            <h2 className="text-xl font-black uppercase italic mb-6">МОИ ЗАКАЗЫ</h2>
            
            <div className="flex gap-2 mb-8">
                <input 
                    type="text" 
                    placeholder="ВАШ ТЕЛЕФОН..." 
                    className="flex-1 bg-zinc-100 p-4 rounded-2xl text-[10px] font-black outline-none italic"
                    value={checkPhone}
                    onChange={(e) => setCheckPhone(e.target.value)}
                />
                <button 
                    onClick={fetchMyOrders}
                    className="bg-black text-white px-6 rounded-2xl font-black uppercase italic text-[10px] active:scale-95 transition-all"
                >
                    {isSearchingOrders ? '...' : 'ОК'}
                </button>
            </div>

            <div className="space-y-3">
                {userOrders.length > 0 ? userOrders.map(order => (
                    <div key={order.id} className="bg-zinc-50 border border-zinc-100 p-5 rounded-[2rem] flex justify-between items-center animate-fade-in">
                        <div className="max-w-[60%]">
                            <div className="text-[10px] font-black uppercase italic leading-tight">{order.product_name}</div>
                            <div className="text-[8px] text-zinc-400 font-bold uppercase mt-1">№{order.id.slice(0,8)} • {new Date(order.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-full border border-zinc-200 shadow-sm">
                            <span className="text-[9px] font-black uppercase italic text-orange-500">{order.status || 'Новый'}</span>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10 opacity-20 font-black uppercase italic text-[10px] tracking-widest">
                        Введите номер для поиска
                    </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* КОРЗИНА И СТОРИЗ ОСТАЛИСЬ ПРЕЖНИМИ... */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-end animate-fade-in" onClick={() => setIsCartOpen(false)}>
          <div className="bg-white w-full rounded-t-[3.5rem] p-8 animate-slide-up shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-6" />
            <h2 className="text-2xl font-black uppercase italic mb-8">КОРЗИНА</h2>
            {cart.length > 0 ? (
                <div className="space-y-4">
                    {Array.from(new Set(cart.map(i => i.id))).map(id => {
                        const item = cart.find(c => c.id === id);
                        const qty = getProductCount(id);
                        return (
                            <div key={id} className="flex items-center justify-between bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                                <div className="flex items-center gap-3">
                                    <img src={item.image_url} className="w-12 h-12 rounded-xl object-cover" alt="" />
                                    <div className="flex flex-col">
                                      <span className="font-bold text-[10px] uppercase line-clamp-1">{item.name}</span>
                                      <span className="text-[9px] text-orange-500 font-black italic">{item.price * qty} ₽</span>
                                    </div>
                                </div>
                                <div className="flex items-center bg-white rounded-xl border border-zinc-200 overflow-hidden">
                                    <button onClick={() => removeFromCartOnce(id)} className="px-3 py-1 font-black active:scale-75 transition-all">—</button>
                                    <span className="text-[10px] font-black w-6 text-center animate-pop">{qty}</span>
                                    <button onClick={() => addToCart(item)} className="px-3 py-1 font-black active:scale-75 transition-all">+</button>
                                </div>
                            </div>
                        );
                    })}
                    <button onClick={checkout} className="w-full bg-orange-500 text-white py-6 rounded-[2.2rem] font-black uppercase italic shadow-xl active:scale-95 transition-all mt-6">
                        ОФОРМИТЬ ({cart.reduce((s, i) => s + Number(i.price), 0)} ₽)
                    </button>
                </div>
            ) : <p className="text-center py-10 font-black uppercase italic opacity-20">ПУСТО</p>}
          </div>
        </div>
      )}

      {selectedStory && (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center animate-fade-in" onClick={() => setSelectedStory(null)}>
          <img src={selectedStory} className="max-w-full max-h-full object-contain" alt="" />
        </div>
      )}

      <style jsx global>{`
        body { -webkit-tap-highlight-color: transparent; scroll-behavior: smooth; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes pop { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-pop { animation: pop 0.2s ease-out; }
      `}</style>
    </div>
  );
}