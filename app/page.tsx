'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  // --- СОСТОЯНИЯ МАГАЗИНА ---
  const [products, setProducts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cartBumping, setCartBumping] = useState(false);
  
  // --- ФИЛЬТРЫ И ПОИСК ---
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Все');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [checkPhone, setCheckPhone] = useState('');
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [isSearchingOrders, setIsSearchingOrders] = useState(false);
  const [orderAddress, setOrderAddress] = useState('');

  // --- ВИТРИНА ПРОДАВЦА ---
  const [viewingSeller, setViewingSeller] = useState<any>(null);

  // --- СОСТОЯНИЯ АДМИНКИ ---
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [sellerAuth, setSellerAuth] = useState({ login: '', pass: '' });
  const [currentSeller, setCurrentSeller] = useState<any>(null);
  const [sellerActiveOrders, setSellerActiveOrders] = useState<any[]>([]);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<'витрина' | 'истории' | 'заказы' | 'архив'>('витрина');

  // --- РЕДАКТИРОВАНИЕ ---
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Следим за хешем для админки (#/admin)
  useEffect(() => {
    const handleHashChange = () => {
      setIsAdminRoute(window.location.hash === '#/admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Первичная загрузка данных
  async function fetchData() {
    setLoading(true);
    try {
      const [prodRes, storyRes] = await Promise.all([
        supabase.from('product_market').select('*, sellers(shop_name, id)'),
        supabase.from('seller_stories').select('*').order('created_at', { ascending: false })
      ]);
      if (prodRes.error) throw prodRes.error;
      setProducts(prodRes.data || []);
      setStories(storyRes.data || []);
    } catch (err) {
      console.error("Ошибка загрузки данных:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // --- ЛОГИКА АДМИНКИ ---
  const handleAuth = async () => {
    if (!sellerAuth.login || !sellerAuth.pass) return alert("Введите логин и пароль");
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('login', sellerAuth.login)
      .eq('password', sellerAuth.pass)
      .single();

    if (error || !data) {
      alert("Ошибка входа: проверьте данные");
    } else {
      setCurrentSeller(data);
    }
  };

  useEffect(() => {
    if (currentSeller) {
      fetchSellerOrders();
      fetchSellerAdminProducts();
    }
  }, [currentSeller, adminTab]);

  async function fetchSellerOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('seller_id', currentSeller.id)
      .order('created_at', { ascending: false });
    if (data) setSellerActiveOrders(data);
  }

  async function fetchSellerAdminProducts() {
    const { data } = await supabase
      .from('product_market')
      .select('*')
      .eq('seller_id', currentSeller.id);
    if (data) setSellerProducts(data);
  }

  const handleUpdateStatus = async (id: any, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);
    if (!error) fetchSellerOrders();
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPrice = parseFloat(String(editingProduct.price).replace(',', '.'));
    if (isNaN(newPrice)) return alert("Введите корректную цену");

    const { error } = await supabase
      .from('product_market')
      .update({ price: newPrice })
      .eq('id', editingProduct.id);

    if (!error) {
      setIsProductModalOpen(false);
      fetchSellerAdminProducts();
      fetchData(); 
    } else {
      alert("Ошибка обновления: " + error.message);
    }
  };

  // --- ЛОГИКА МАГАЗИНА ---
  const addToCart = (p: any) => {
    setCart([...cart, p]);
    setCartBumping(true);
    setTimeout(() => setCartBumping(false), 300);
  };

  const removeFromCartOnce = (id: string) => {
    const index = cart.findLastIndex(item => item.id === id);
    if (index > -1) {
      const newCart = [...cart];
      newCart.splice(index, 1);
      setCart(newCart);
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const handleCheckout = async () => {
    if (!orderAddress || !checkPhone) return alert("Заполните телефон и адрес доставки!");
    if (cart.length === 0) return alert("Корзина пуста");

    const orderData = {
      seller_id: cart[0].seller_id,
      buyer_phone: checkPhone,
      address: orderAddress,
      total_price: totalPrice,
      status: 'НОВЫЙ',
      product_name: cart.map(i => i.name).join(', ')
    };

    const { error } = await supabase.from('orders').insert([orderData]);

    if (!error) {
      alert("ЗАКАЗ УСПЕШНО ОТПРАВЛЕН!");
      setCart([]);
      setIsCartOpen(false);
      setOrderAddress('');
    } else {
      alert("Ошибка при оформлении: " + error.message);
    }
  };

  const handleCheckOrder = async () => {
    if (!checkPhone) return;
    setIsSearchingOrders(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_phone', checkPhone)
      .order('created_at', { ascending: false });
    
    if (error) console.error("Search error:", error.message);
    setUserOrders(data || []);
    setIsSearchingOrders(false);
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category || 'Меню'));
    return ['Все', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Все' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return (
    <div className="h-screen bg-black flex flex-col items-center justify-center text-orange-500 font-black italic">
      <div className="text-5xl animate-pulse tracking-tighter mb-4 uppercase">RA DELL</div>
      <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden">
        <div className="h-full bg-orange-500 animate-loading-bar"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-black pb-20 font-sans">
      
      {/* СЛОЙ АДМИНКИ */}
      {isAdminRoute && (
        <div className="fixed inset-0 z-[1000] bg-[#0A0A0A] text-white overflow-y-auto p-4 md:p-10 custom-scroll">
          {!currentSeller ? (
            <div className="max-w-md mx-auto pt-20">
              <div className="text-center mb-12">
                <h1 className="text-6xl font-black italic text-orange-500 tracking-tighter uppercase">Dark</h1>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.4em] font-bold">Terminal Access v2.0</p>
              </div>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="LOGIN" 
                  className="w-full bg-[#151515] p-6 rounded-[2rem] border border-white/5 outline-none focus:border-orange-500/50 transition-all font-black uppercase text-sm"
                  onChange={e => setSellerAuth({...sellerAuth, login: e.target.value})}
                />
                <input 
                  type="password" 
                  placeholder="PASSWORD" 
                  className="w-full bg-[#151515] p-6 rounded-[2rem] border border-white/5 outline-none focus:border-orange-500/50 transition-all font-black uppercase text-sm"
                  onChange={e => setSellerAuth({...sellerAuth, pass: e.target.value})}
                />
                <button 
                  onClick={handleAuth}
                  className="w-full bg-orange-500 text-white py-6 rounded-[2.5rem] font-black italic uppercase text-lg shadow-2xl shadow-orange-500/20 active:scale-95 transition-all"
                >
                  ENTER SYSTEM
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 border-b border-white/5 pb-8">
                <div>
                  <h2 className="text-3xl font-black italic uppercase text-orange-500 tracking-tighter">{currentSeller.shop_name}</h2>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Admin Dashboard Active</p>
                </div>
                <button onClick={() => setCurrentSeller(null)} className="px-6 py-2 rounded-full border border-white/10 text-[10px] uppercase font-black hover:bg-white hover:text-black transition-all">Logout</button>
              </div>

              <div className="flex bg-[#151515] p-2 rounded-[2.5rem] mb-12 gap-2 border border-white/5">
                {['витрина', 'заказы', 'архив'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setAdminTab(tab as any)}
                    className={`flex-1 py-5 rounded-[2rem] text-[10px] font-black uppercase italic transition-all ${adminTab === tab ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="grid gap-6">
                {adminTab === 'витрина' && sellerProducts.map(p => (
                  <div key={p.id} className="bg-[#111] p-6 rounded-[3rem] flex items-center gap-6 border border-white/5 group hover:border-orange-500/30 transition-all">
                    <div className="w-24 h-24 rounded-[2rem] overflow-hidden shadow-2xl">
                      <img src={p.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black italic uppercase text-sm mb-1 text-zinc-300">{p.name}</h4>
                      <div className="flex items-baseline gap-2">
                        <span className="text-orange-500 font-black italic text-3xl tracking-tighter">{p.price} ₽</span>
                        <span className="text-[10px] text-zinc-600 font-bold uppercase">Current Price</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setEditingProduct({...p}); setIsProductModalOpen(true); }}
                      className="bg-[#1A1A1A] w-14 h-14 rounded-2xl flex items-center justify-center text-2xl hover:bg-orange-500 transition-all group-hover:rotate-12"
                    >
                      ✏️
                    </button>
                  </div>
                ))}

                {adminTab === 'заказы' && sellerActiveOrders.filter(o => o.status !== 'ЗАВЕРШЕН').map(o => (
                  <div key={o.id} className="bg-[#111] p-8 rounded-[3.5rem] border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 bg-orange-500 px-6 py-2 rounded-bl-3xl text-[9px] font-black uppercase italic tracking-widest">
                      {o.status}
                    </div>
                    <div className="mb-6">
                      <p className="text-2xl font-black italic text-white mb-1 uppercase tracking-tight">{o.buyer_phone}</p>
                      <p className="text-zinc-500 text-[10px] font-bold uppercase leading-relaxed max-w-md">{o.address || 'Адрес не указан'}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl mb-8">
                      <p className="text-[9px] font-black text-zinc-400 uppercase mb-2">Состав заказа:</p>
                      <p className="text-xs font-bold text-zinc-200">{o.product_name || 'Не указано'}</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleUpdateStatus(o.id, 'ГОТОВИТСЯ')} className="flex-1 bg-white/5 py-5 rounded-[1.5rem] text-[10px] font-black uppercase italic hover:bg-zinc-800 transition-all border border-white/5">В работу</button>
                      <button onClick={() => handleUpdateStatus(o.id, 'ЗАВЕРШЕН')} className="flex-1 bg-orange-500 py-5 rounded-[1.5rem] text-[10px] font-black uppercase italic shadow-lg shadow-orange-500/20 active:scale-95 transition-all">Завершить</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ГЛАВНЫЙ САЙТ МАГАЗИНА */}
      <div className="max-w-[500px] mx-auto bg-white min-h-screen shadow-[0_0_100px_rgba(0,0,0,0.05)] relative overflow-hidden">
        
        {/* ХЕДЕР */}
        <header className="p-6 sticky top-0 z-[100] bg-white/80 backdrop-blur-2xl border-b border-zinc-100 flex items-center gap-4">
          <button 
            onClick={() => setIsStatusModalOpen(true)}
            className="h-14 bg-zinc-100 px-6 rounded-2xl flex items-center justify-center group active:scale-90 transition-all"
          >
            <span className="text-[10px] font-black italic uppercase text-zinc-400 group-hover:text-black">Статус</span>
          </button>
          
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="ПОИСК В МЕНЮ..." 
              className="w-full h-14 bg-zinc-100 px-6 rounded-2xl text-[11px] font-black italic outline-none border-none uppercase placeholder:text-zinc-300 focus:bg-zinc-200 transition-colors"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <button 
            onClick={() => setIsCartOpen(true)}
            className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${cartBumping ? 'scale-110 bg-orange-500 shadow-2xl' : 'bg-black active:scale-90'}`}
          >
            <span className="text-xl">🛒</span>
            {cart.length > 0 && (
              <div className="absolute -top-2 -right-2 bg-orange-500 w-7 h-7 rounded-full text-[10px] text-white flex items-center justify-center font-black border-4 border-white animate-bounce">
                {cart.length}
              </div>
            )}
          </button>
        </header>

        {/* СТОРИЗ */}
        <div className="flex gap-4 px-6 mt-8 mb-12 overflow-x-auto no-scrollbar py-2">
          {stories.map((story) => (
            <div 
              key={story.id} 
              onClick={() => setSelectedStory(story.media_url)}
              className="flex-shrink-0 w-20 h-20 rounded-full p-[3px] border-2 border-orange-500 cursor-pointer active:scale-90 transition-all"
            >
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-white">
                <img src={story.media_url} className="w-full h-full object-cover" alt="story" />
              </div>
            </div>
          ))}
        </div>

        {/* КАТЕГОРИИ */}
        <div className="flex gap-2 px-6 mb-10 overflow-x-auto no-scrollbar scroll-smooth">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-8 py-4 rounded-full text-[10px] font-black uppercase italic whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-black text-white shadow-2xl shadow-black/20 translate-y-[-2px]' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* СЕТКА ТОВАРОВ */}
        <main className="px-5 grid grid-cols-2 gap-5 pb-32">
          {filteredProducts.map(p => {
            const count = cart.filter(item => item.id === p.id).length;
            return (
              <div key={p.id} className="group bg-white rounded-[3rem] p-3 border border-zinc-100 shadow-sm hover:shadow-2xl transition-all duration-500">
                <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden mb-3">
                  <img src={p.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={p.name} />
                  <div className="absolute bottom-4 right-4 bg-black/90 backdrop-blur-xl text-white px-5 py-2.5 rounded-full text-[12px] font-black italic tracking-tighter shadow-2xl">
                    {p.price} ₽
                  </div>
                </div>

                {/* ВИТРИНА ПРОДАВЦА */}
                <button 
                  onClick={() => setViewingSeller(p.sellers)}
                  className="block w-full text-center text-[8px] font-black uppercase text-orange-500 mb-2 tracking-widest hover:underline"
                >
                  {p.sellers?.shop_name || 'Магазин'}
                </button>
                
                <h3 className="text-[11px] font-black italic h-10 line-clamp-2 leading-tight mb-5 uppercase text-center px-4 text-zinc-800 tracking-tighter">
                  {p.name}
                </h3>

                {count === 0 ? (
                  <button 
                    onClick={() => addToCart(p)}
                    className="w-full py-5 bg-black text-white rounded-[1.8rem] text-[10px] font-black uppercase italic active:scale-95 transition-all shadow-xl hover:bg-orange-500"
                  >
                    В КОРЗИНУ
                  </button>
                ) : (
                  <div className="flex items-center bg-zinc-100 rounded-[1.8rem] overflow-hidden h-14 border border-zinc-200/50">
                    <button onClick={() => removeFromCartOnce(p.id)} className="flex-1 font-black text-xl hover:bg-zinc-200 active:bg-zinc-300 transition-colors">-</button>
                    <span className="text-[13px] font-black px-4">{count}</span>
                    <button onClick={() => addToCart(p)} className="flex-1 font-black text-xl hover:bg-zinc-200 active:bg-zinc-300 transition-colors">+</button>
                  </div>
                )}
              </div>
            );
          })}
        </main>
      </div>

      {/* МОДАЛКА ВИТРИНЫ ПРОДАВЦА */}
      {viewingSeller && (
        <div className="fixed inset-0 z-[1200] bg-white overflow-y-auto animate-slide-up">
          <header className="p-6 sticky top-0 bg-white/90 backdrop-blur-xl border-b flex justify-between items-center z-10">
            <div>
              <p className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.3em] mb-1">Витрина</p>
              <h2 className="text-2xl font-black italic uppercase text-orange-500 tracking-tighter">{viewingSeller.shop_name}</h2>
            </div>
            <button onClick={() => setViewingSeller(null)} className="bg-zinc-100 w-14 h-14 rounded-full font-black text-3xl flex items-center justify-center active:scale-90 transition-all">×</button>
          </header>
          <div className="p-5 grid grid-cols-2 gap-5 pb-20">
            {products.filter(p => p.seller_id === viewingSeller.id).map(p => {
               const count = cart.filter(i => i.id === p.id).length;
               return (
                <div key={p.id} className="bg-white rounded-[2.5rem] p-3 border border-zinc-100 shadow-sm">
                  <div className="relative aspect-square rounded-[2rem] overflow-hidden mb-4">
                    <img src={p.image_url} className="w-full h-full object-cover" />
                    <div className="absolute bottom-3 right-3 bg-black text-white px-4 py-2 rounded-full text-[11px] font-black italic">{p.price} ₽</div>
                  </div>
                  <h3 className="text-[10px] font-black italic h-8 line-clamp-2 leading-tight mb-4 uppercase text-center text-zinc-800">{p.name}</h3>
                  {count === 0 ? (
                    <button onClick={() => addToCart(p)} className="w-full py-4 bg-black text-white rounded-2xl text-[9px] font-black uppercase italic shadow-lg">В КОРЗИНУ</button>
                  ) : (
                    <div className="flex items-center bg-zinc-100 rounded-2xl overflow-hidden h-11">
                      <button onClick={() => removeFromCartOnce(p.id)} className="flex-1 font-black text-lg">-</button>
                      <span className="text-[11px] font-black px-3">{count}</span>
                      <button onClick={() => addToCart(p)} className="flex-1 font-black text-lg">+</button>
                    </div>
                  )}
                </div>
               )
            })}
          </div>
        </div>
      )}

      {/* МОДАЛКА СТАТУСА ЗАКАЗА */}
      {isStatusModalOpen && (
        <div 
          className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setIsStatusModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-[420px] rounded-[4rem] p-10 md:p-14 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-10">
              <h3 className="text-4xl font-black italic uppercase tracking-tighter mb-2">Статус</h3>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-300">Tracking System Active</p>
            </div>

            <div className="flex gap-2 mb-10">
              <input 
                type="text" 
                placeholder="ТЕЛЕФОН" 
                className="flex-1 bg-zinc-100 p-6 rounded-[2rem] font-black outline-none text-[13px] border-none"
                value={checkPhone}
                onChange={e => setCheckPhone(e.target.value)}
              />
              <button 
                onClick={handleCheckOrder}
                className="bg-black text-white px-8 rounded-[2rem] font-black italic uppercase text-[10px] hover:bg-orange-500 transition-colors"
              >
                Ок
              </button>
            </div>

            <div className="space-y-4 max-h-[380px] overflow-y-auto no-scrollbar pr-2">
              {isSearchingOrders ? (
                <div className="py-20 flex flex-col items-center">
                  <div className="w-10 h-10 border-4 border-zinc-100 border-t-orange-500 rounded-full animate-spin mb-4"></div>
                </div>
              ) : userOrders.length > 0 ? (
                userOrders.map((order: any) => (
                  <div key={order.id} className="bg-zinc-50 p-8 rounded-[3rem] border border-zinc-100 group">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[9px] font-black uppercase text-zinc-300 tracking-widest">Заказ #{String(order.id)}</span>
                      <span className="bg-black text-white text-[9px] px-4 py-1.5 rounded-full font-black uppercase shadow-lg group-hover:bg-orange-500 transition-colors">
                        {order.status}
                      </span>
                    </div>
                    <p className="font-black italic text-4xl uppercase tracking-tighter text-zinc-900">{order.total_price} ₽</p>
                  </div>
                ))
              ) : checkPhone && (
                <p className="text-center text-[11px] font-black text-zinc-300 uppercase italic py-20">Заказов не найдено</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* КОРЗИНА (ВЫЕЗЖАЕТ СНИЗУ) */}
      {isCartOpen && (
        <div 
          className="fixed inset-0 z-[1500] bg-black/60 backdrop-blur-md flex items-end justify-center animate-fade-in"
          onClick={() => setIsCartOpen(false)}
        >
          <div 
            className="w-full max-w-[500px] bg-white h-[85vh] rounded-t-[4rem] shadow-2xl flex flex-col p-8 md:p-12 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-8" />
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-5xl font-black italic uppercase tracking-tighter">Корзина</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-4xl font-light">×</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll space-y-8 pr-2">
              {cart.length === 0 ? (
                <div className="text-center py-32 opacity-10">
                  <div className="text-9xl mb-6">🛒</div>
                  <p className="font-black italic uppercase text-2xl tracking-widest">Basket Empty</p>
                </div>
              ) : (
                Array.from(new Set(cart.map(i => i.id))).map(id => {
                  const item = cart.find(i => i.id === id);
                  const count = cart.filter(i => i.id === id).length;
                  return (
                    <div key={id} className="flex items-center gap-6 group border-b border-zinc-50 pb-8">
                      <div className="w-20 h-20 rounded-[1.8rem] overflow-hidden shadow-lg">
                        <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-black italic uppercase text-[11px] leading-tight mb-1 text-zinc-800 tracking-tighter">{item.name}</h4>
                        <p className="font-black italic text-orange-500 text-xl tracking-tighter">{item.price} ₽</p>
                      </div>
                      
                      {/* УПРАВЛЕНИЕ КОЛИЧЕСТВОМ В КОРЗИНЕ */}
                      <div className="flex items-center bg-zinc-100 rounded-[1.5rem] overflow-hidden h-12 w-28 border border-zinc-200/50">
                        <button onClick={() => removeFromCartOnce(item.id)} className="flex-1 font-black text-xl hover:bg-zinc-200 transition-colors">-</button>
                        <span className="text-[13px] font-black px-2">{count}</span>
                        <button onClick={() => addToCart(item)} className="flex-1 font-black text-xl hover:bg-zinc-200 transition-colors">+</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-10 border-t border-zinc-100 space-y-4">
                 <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="ВАШ ТЕЛЕФОН" 
                      className="w-full bg-zinc-100 p-6 rounded-[2rem] font-black outline-none uppercase text-[12px] focus:bg-zinc-200 transition-all"
                      value={checkPhone}
                      onChange={e => setCheckPhone(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="АДРЕС ДОСТАВКИ" 
                      className="w-full bg-zinc-100 p-6 rounded-[2rem] font-black outline-none uppercase text-[12px] focus:bg-zinc-200 transition-all"
                      value={orderAddress}
                      onChange={e => setOrderAddress(e.target.value)}
                    />
                 </div>
                 <div className="flex justify-between items-end pt-6 px-4">
                   <span className="text-[12px] font-black text-zinc-300 uppercase tracking-widest">Итого:</span>
                   <span className="text-5xl font-black italic tracking-tighter">{totalPrice} ₽</span>
                 </div>
                 <button 
                  onClick={handleCheckout}
                  className="w-full bg-black hover:bg-orange-500 text-white py-8 rounded-[2.5rem] font-black italic uppercase text-xl shadow-2xl transition-all active:scale-95"
                 >
                   ОФОРМИТЬ ЗАКАЗ
                 </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* МОДАЛКА ИЗМЕНЕНИЯ ЦЕНЫ */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[2100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[#111] w-full max-w-[420px] rounded-[4rem] p-12 md:p-16 border border-white/5 shadow-2xl">
            <h3 className="text-orange-500 font-black italic uppercase text-2xl tracking-tighter text-center mb-12">Price Update</h3>
            <form onSubmit={handleSaveProduct}>
              <div className="bg-black p-10 rounded-[2.5rem] mb-12 border border-white/5 relative">
                <input 
                  type="number" 
                  className="w-full bg-transparent text-white text-7xl font-black outline-none tracking-tighter text-center"
                  value={editingProduct?.price || ''}
                  onChange={e => setEditingProduct({...editingProduct, price: e.target.value})}
                  autoFocus
                />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 bg-zinc-900 py-6 rounded-[2rem] font-black uppercase text-[11px] text-zinc-500 italic transition-all">Cancel</button>
                <button type="submit" className="flex-[2] bg-orange-500 py-6 rounded-[2rem] font-black uppercase text-[11px] italic hover:bg-orange-400 active:scale-95 transition-all">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes loading-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-loading-bar { animation: loading-bar 1.5s infinite linear; }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        body { background: #F8F8F8; -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}