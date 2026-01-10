'use client';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// Инициализация напрямую для стабильности
const supabase = createClient(
  'https://mnzsmbqwvlrmoahtosux.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uenNtYnF3dmxybW9haHRvc3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTA4OTcsImV4cCI6MjA4MjY4Njg5N30.PBoo9FHj4_SjdXZBy-gABjLo4OfF0NW7cIgVSYemkr8'
);

const BOT_USERNAME = 'RaDell_bot'; 

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

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [checkPhone, setCheckPhone] = useState('');
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [isSearchingOrders, setIsSearchingOrders] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [scrollY, setScrollY] = useState(0);

  // Оформление
  const [orderAddress, setOrderAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // --- АДМИНКА ---
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [isAuthMode, setIsAuthMode] = useState<'login' | 'reg'>('login');
  const [sellerAuth, setSellerAuth] = useState({ login: '', pass: '', name: '', cat: '' });
  const [currentSeller, setCurrentSeller] = useState<any>(null);
  const [sellerActiveOrders, setSellerActiveOrders] = useState<any[]>([]);
  const [sellerArchivedOrders, setSellerArchivedOrders] = useState<any[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [adminTab, setAdminTab] = useState<'orders' | 'products'>('orders');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // --- ВИТРИНА ПРОДАВЦА ---
  const [currentSellerId, setCurrentSellerId] = useState<string | null>(null);
  const [sellerData, setSellerData] = useState<any>(null);
  const [sellerStoreProducts, setSellerStoreProducts] = useState<any[]>([]);
  const [sellerLoading, setSellerLoading] = useState(false);

  // Безопасный вызов Capacitor только на клиенте
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('backButton', () => {
          if (isCartOpen) setIsCartOpen(false);
          else if (isProductModalOpen) setIsProductModalOpen(false);
          else if (currentSellerId) { window.location.hash = ''; setCurrentSellerId(null); }
          else if (isAdminRoute) { window.location.hash = ''; setIsAdminRoute(false); }
          else if (isStatusModalOpen) setIsStatusModalOpen(false);
          else if (selectedStory) setSelectedStory(null);
        });
      }).catch(() => {});
    }
  }, [isCartOpen, isProductModalOpen, currentSellerId, isAdminRoute, isStatusModalOpen, selectedStory]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/admin') {
        setIsAdminRoute(true);
        setCurrentSellerId(null);
      } else if (hash.includes('/seller?id=')) {
        const id = hash.split('id=')[1];
        setCurrentSellerId(id);
        setIsAdminRoute(false);
        fetchSellerData(id);
      } else {
        setIsAdminRoute(false);
        setCurrentSellerId(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  async function fetchSellerData(id: string) {
    setSellerLoading(true);
    try {
      const { data: sData } = await supabase.from('sellers').select('*').eq('id', id).single();
      const { data: pData } = await supabase.from('product_market').select('*').eq('seller_id', id);
      setSellerData(sData);
      setSellerStoreProducts(pData || []);
    } catch (e) { console.error(e); }
    setSellerLoading(false);
  }

  // Загрузка основного контента
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) { try { setCart(JSON.parse(savedCart)); } catch (e) {} }

    async function load() {
      try {
        const [prodRes, storyRes] = await Promise.all([
          supabase.from('product_market').select('*, sellers(id, shop_name)'),
          supabase.from('seller_stories').select('*').order('created_at', { ascending: false })
        ]);
        setProducts(prodRes.data || []);
        setStories(storyRes.data || []);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // --- ЛОГИКА АДМИНКИ ---
  const handleAuth = async () => {
    try {
      if (isAuthMode === 'reg') {
        if (!sellerAuth.login || !sellerAuth.pass || !sellerAuth.name) return alert("Заполните всё!");
        const { data, error } = await supabase.from('sellers').insert([{
          login: sellerAuth.login, password: sellerAuth.pass, shop_name: sellerAuth.name, category: sellerAuth.cat
        }]).select().single();
        if (error) throw error;
        setCurrentSeller(data);
      } else {
        const { data, error } = await supabase.from('sellers').select('*').eq('login', sellerAuth.login).eq('password', sellerAuth.pass).single();
        if (error || !data) throw new Error("Неверные данные");
        setCurrentSeller(data);
      }
    } catch (e: any) { alert(e.message); }
  };

  useEffect(() => {
    if (currentSeller) {
      fetchSellerOrders();
      fetchSellerAdminProducts();
    }
  }, [currentSeller]);

  async function fetchSellerOrders() {
    const { data } = await supabase.from('orders').select('*').eq('seller_id', currentSeller.id).order('created_at', { ascending: false });
    if (data) {
      setSellerActiveOrders(data.filter(o => o.status !== 'ЗАВЕРШЕН'));
      setSellerArchivedOrders(data.filter(o => o.status === 'ЗАВЕРШЕН'));
    }
  }

  async function fetchSellerAdminProducts() {
    const { data } = await supabase.from('product_market').select('*').eq('seller_id', currentSeller.id).order('created_at', { ascending: false });
    if (data) setSellerStoreProducts(data);
  }

  const handleSaveProduct = async (e: any) => {
    e.preventDefault();
    const p = editingProduct;
    const payload = { 
      name: p.name, price: Number(p.price), old_price: p.old_price ? Number(p.old_price) : null,
      category: p.category, image_url: p.image_url, seller_id: currentSeller.id 
    };
    let error;
    if (p.id) { error = (await supabase.from('product_market').update(payload).eq('id', p.id)).error; }
    else { error = (await supabase.from('product_market').insert([payload])).error; }
    
    if (!error) { 
      setIsProductModalOpen(false); 
      fetchSellerAdminProducts(); 
      const { data } = await supabase.from('product_market').select('*, sellers(id, shop_name)');
      if (data) setProducts(data);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Удалить?")) return;
    const { error } = await supabase.from('product_market').delete().eq('id', id);
    if (!error) { fetchSellerAdminProducts(); setProducts(prev => prev.filter(x => x.id !== id)); }
  };

  // --- КОРЗИНА И ЗАКАЗЫ ---
  const addToCart = (p: any) => { 
    setCart(prev => [...prev, p]); 
    setCartBumping(true); 
    setTimeout(() => setCartBumping(false), 300); 
  };
  const removeFromCartOnce = (id: string) => {
    setCart(prev => {
      const idx = prev.findLastIndex(x => x.id === id);
      if (idx === -1) return prev;
      const copy = [...prev]; copy.splice(idx, 1); return copy;
    });
  };
  const getCount = (id: string) => cart.filter(x => x.id === id).length;

  const checkout = async () => {
    if (cart.length === 0 || !orderAddress) return alert("Введите данные!");
    const phone = prompt("Ваш номер:");
    if (!phone) return;
    
    try {
      const bySeller = cart.reduce((acc: any, i: any) => {
        const sid = i.seller_id || 'default';
        if (!acc[sid]) acc[sid] = [];
        acc[sid].push(i);
        return acc;
      }, {});

      for (const sid in bySeller) {
        const items = bySeller[sid];
        const names = items.map((x: any) => x.name).join(', ');
        const total = items.reduce((s: number, x: any) => s + Number(x.price), 0);
        await supabase.from('orders').insert({
          product_name: names, price: total, buyer_phone: phone, 
          address: orderAddress, notes: orderNotes, seller_id: sid, status: 'НОВЫЙ'
        });
      }
      alert("ПРИНЯТО!"); setCart([]); setIsCartOpen(false);
    } catch { alert("Ошибка!"); }
  };

  const checkStatus = async () => {
    setIsSearchingOrders(true);
    setHasSearched(true);
    const { data } = await supabase.from('orders').select('*').or(`buyer_phone.eq.${checkPhone},id.ilike.${checkPhone}%`).order('created_at', { ascending: false });
    setUserOrders(data || []);
    setIsSearchingOrders(false);
  };

  const categories = useMemo(() => ['Все', ...Array.from(new Set(products.map(p => String(p.category || 'Без категории'))))], [products]);
  const filtered = useMemo(() => products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = activeCategory === 'Все' || String(p.category) === activeCategory;
    return matchSearch && matchCat;
  }), [products, searchQuery, activeCategory]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-orange-500 font-black italic animate-pulse">RA DELL...</div>;

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-black pb-32 overflow-x-hidden selection:bg-orange-500 selection:text-white">

      {/* --- АДМИНКА --- */}
      {isAdminRoute && (
        <div className="fixed inset-0 z-[300] bg-[#0A0A0A] overflow-y-auto text-white">
          {!currentSeller ? (
            <div className="p-8 pt-24 max-w-md mx-auto min-h-screen flex flex-col">
              <button onClick={() => { window.location.hash = ''; setIsAdminRoute(false); }} className="text-[10px] font-black italic text-zinc-600 mb-16 uppercase tracking-[0.3em]">← НА ГЛАВНУЮ</button>
              <h2 className="text-6xl font-[1000] italic uppercase tracking-tighter leading-[0.8] mb-12 text-white">DARK<br/>PANEL</h2>
              <div className="space-y-4">
                {isAuthMode === 'reg' && (
                  <>
                    <input type="text" placeholder="НАЗВАНИЕ МАГАЗИНА" className="w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl outline-none font-bold text-[10px] uppercase italic" onChange={e => setSellerAuth({...sellerAuth, name: e.target.value})}/>
                    <input type="text" placeholder="КАТЕГОРИЯ" className="w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl outline-none font-bold text-[10px] uppercase italic" onChange={e => setSellerAuth({...sellerAuth, cat: e.target.value})}/>
                  </>
                )}
                <input type="text" placeholder="ЛОГИН" className="w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl outline-none font-bold text-[10px] uppercase italic" onChange={e => setSellerAuth({...sellerAuth, login: e.target.value})}/>
                <input type="password" placeholder="ПАРОЛЬ" className="w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl outline-none font-bold text-[10px] uppercase italic" onChange={e => setSellerAuth({...sellerAuth, pass: e.target.value})}/>
                <button onClick={handleAuth} className="w-full bg-white text-black py-7 rounded-[2rem] font-black italic uppercase shadow-xl active:scale-95 transition-all">
                  {isAuthMode === 'login' ? 'ВОЙТИ' : 'СОЗДАТЬ'}
                </button>
                <button onClick={() => setIsAuthMode(isAuthMode === 'login' ? 'reg' : 'login')} className="w-full text-[9px] font-black italic uppercase text-zinc-500 mt-10 tracking-[0.4em]">
                  {isAuthMode === 'login' ? 'НЕТ ДОСТУПА? РЕГИСТРАЦИЯ' : 'ЕСТЬ АККАУНТ? ВХОД'}
                </button>
              </div>
            </div>
          ) : (
            <div className="min-h-screen">
              <header className="p-8 pt-16 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-[310] rounded-b-[4rem] border-b border-white/5">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-orange-500 font-black text-[9px] uppercase tracking-[0.4em] mb-2">PARTNER DASHBOARD</p>
                    <h1 className="text-4xl font-[1000] italic uppercase tracking-tighter leading-none">{currentSeller.shop_name}</h1>
                  </div>
                  <button onClick={() => setCurrentSeller(null)} className="bg-zinc-800 text-white w-12 h-12 rounded-full flex items-center justify-center">✕</button>
                </div>
                <div className="flex bg-black/50 p-1.5 rounded-[2rem] border border-white/5 mb-4">
                  <button onClick={() => setAdminTab('orders')} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase italic transition-all ${adminTab === 'orders' ? 'bg-white text-black' : 'text-zinc-500'}`}>ЗАКАЗЫ</button>
                  <button onClick={() => setAdminTab('products')} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase italic transition-all ${adminTab === 'products' ? 'bg-white text-black' : 'text-zinc-500'}`}>ТОВАРЫ</button>
                </div>
              </header>

              <div className="p-6">
                {adminTab === 'orders' ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center px-2 mb-4">
                       <h2 className="text-[10px] font-black uppercase italic tracking-widest text-zinc-500">{showArchived ? 'АРХИВ' : 'АКТИВНЫЕ'}</h2>
                       <button onClick={() => setShowArchived(!showArchived)} className="text-[9px] font-black uppercase italic bg-orange-500/10 text-orange-500 px-4 py-2 rounded-full border border-orange-500/20">{showArchived ? 'К АКТИВНЫМ' : 'АРХИВ'}</button>
                    </div>
                    {(showArchived ? sellerArchivedOrders : sellerActiveOrders).map(o => (
                      <div key={o.id} className="bg-zinc-900/60 p-6 rounded-[2.5rem] border border-white/5">
                        <div className="flex justify-between mb-4">
                          <span className="text-[10px] font-black text-zinc-600">#{o.id.slice(0,6)}</span>
                          <div className="text-right">
                            <p className="text-sm font-black italic">{o.price} ₽</p>
                            <p className="text-[7px] text-orange-500 font-bold uppercase">{o.status}</p>
                          </div>
                        </div>
                        <h3 className="text-sm font-black uppercase italic mb-6 leading-tight">{o.product_name}</h3>
                        <div className="bg-black/40 p-4 rounded-2xl text-[10px] space-y-2 mb-6">
                          <p className="text-zinc-400">ТЕЛ: <span className="text-white">{o.buyer_phone}</span></p>
                          <p className="text-zinc-400">АДРЕС: <span className="text-white">{o.address}</span></p>
                          {o.notes && <p className="text-zinc-400">ИНФО: <span className="text-white italic">{o.notes}</span></p>}
                        </div>
                        {!showArchived && (
                          <button onClick={async () => { await supabase.from('orders').update({status: 'ЗАВЕРШЕН'}).eq('id', o.id); fetchSellerOrders(); }} className="w-full py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase">ЗАВЕРШИТЬ</button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <button onClick={() => { setEditingProduct({name: '', price: '', old_price: '', category: '', image_url: ''}); setIsProductModalOpen(true); }} className="w-full py-8 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-[2.5rem] font-black italic text-sm uppercase tracking-widest">+ НОВЫЙ ТОВАР</button>
                    {sellerStoreProducts.map(p => (
                      <div key={p.id} className="bg-zinc-900/40 p-4 rounded-[2.2rem] flex items-center gap-5 border border-white/5">
                        <img src={p.image_url} className="w-20 h-20 rounded-[1.5rem] object-cover grayscale" />
                        <div className="flex-1">
                          <h3 className="text-[10px] font-black uppercase italic mb-1 text-zinc-100">{p.name}</h3>
                          <p className="text-sm font-black text-orange-500 italic">{p.price} ₽</p>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">✏️</button>
                           <button onClick={() => deleteProduct(p.id)} className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- ГЛАВНАЯ ВИТРИНА --- */}
      <div className={`${(currentSellerId || isAdminRoute) ? 'hidden' : 'block'}`}>
        <header style={{ transform: `translateY(${scrollY > 50 ? '-20px' : '0'})`, transition: 'all 0.5s' }} className="bg-white px-6 pt-14 pb-8 rounded-b-[4rem] shadow-sm sticky top-0 z-50">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-[1000] italic uppercase tracking-tighter text-black">DARK<span className="text-orange-500">STORE</span></h1>
            <button onClick={() => setIsCartOpen(true)} className={`bg-black text-white p-5 rounded-[1.8rem] relative transition-all ${cartBumping ? 'scale-110 bg-orange-500' : ''}`}>
              🛒 {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-black border-2 border-white">{cart.length}</span>}
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar mb-6">
            {stories.map(s => (
              <div key={s.id} onClick={() => setSelectedStory(s.image_url)} className="flex-shrink-0 w-20 h-20 rounded-full p-[3px] border-2 border-orange-500 cursor-pointer">
                <img src={s.image_url} className="w-full h-full rounded-full object-cover" />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
             <div className="flex-1 bg-zinc-100 p-5 rounded-2xl flex items-center gap-3">
               <span className="opacity-30">🔍</span>
               <input type="text" placeholder="ПОИСК..." className="bg-transparent flex-1 outline-none font-black text-[10px] uppercase italic" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
             </div>
             <button onClick={() => setIsStatusModalOpen(true)} className="bg-zinc-100 px-6 rounded-2xl text-[10px] font-black uppercase italic text-orange-500">ЗАКАЗЫ</button>
          </div>
        </header>

        <div className="px-6 flex gap-2 overflow-x-auto no-scrollbar my-8">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-8 py-3.5 rounded-full text-[9px] font-[1000] uppercase italic transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-orange-500 text-white shadow-xl scale-105' : 'bg-white text-zinc-400 border border-zinc-100'}`}>
              {cat}
            </button>
          ))}
        </div>

        <main className="px-4 grid grid-cols-2 gap-4 animate-fade-in">
          {filtered.map(p => {
            const count = getCount(p.id);
            return (
              <div key={p.id} className="bg-white rounded-[3.2rem] p-3 border border-zinc-100 shadow-sm group">
                <div className="relative aspect-square mb-4 overflow-hidden rounded-[2.8rem] bg-zinc-50">
                  <img src={p.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-[12px] font-black italic shadow-2xl border border-white/10">{p.price} ₽</div>
                </div>
                <div className="px-3 pb-3 text-center">
                  <button onClick={() => window.location.hash = `#/seller?id=${p.seller_id}`} className="mb-3 inline-block bg-zinc-100 px-3 py-1.5 rounded-full text-[8px] font-black text-zinc-500 uppercase tracking-widest italic">🏪 {p.sellers?.shop_name || 'SHOP'}</button>
                  <h3 className="font-bold text-[11px] uppercase tracking-tighter mb-4 h-8 line-clamp-2 leading-[1] text-zinc-800">{p.name}</h3>
                  <div className="relative h-14">
                    {count === 0 ? (
                      <button onClick={() => addToCart(p)} className="w-full h-full bg-black text-white rounded-[1.4rem] text-[9px] font-black uppercase italic shadow-lg active:scale-95 transition-all">КУПИТЬ</button>
                    ) : (
                      <div className="flex items-center justify-between bg-zinc-100 rounded-[1.4rem] h-full border border-zinc-200 overflow-hidden">
                        <button onClick={() => removeFromCartOnce(p.id)} className="flex-1 h-full font-black text-xl text-zinc-400 active:bg-zinc-200">—</button>
                        <span className="px-2 text-xs font-black italic">{count}</span>
                        <button onClick={() => addToCart(p)} className="flex-1 h-full font-black text-xl active:bg-zinc-200">+</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </main>
      </div>

      {/* --- ЭКРАН ВИТРИНЫ ПРОДАВЦА --- */}
      {currentSellerId && sellerData && (
        <div className="min-h-screen bg-[#F8F8F8] animate-fade-in">
           <header className="p-8 pt-16 bg-white rounded-b-[4.5rem] shadow-sm mb-10">
             <button onClick={() => { window.location.hash = ''; setCurrentSellerId(null); }} className="text-[10px] font-black text-zinc-400 uppercase italic tracking-[0.3em] mb-10">← ВЕРНУТЬСЯ В МАРКЕТ</button>
             <p className="text-orange-500 font-black text-[10px] uppercase tracking-[0.5em] mb-2">OFFICIAL STORE</p>
             <h1 className="text-5xl font-[1000] italic uppercase tracking-tighter leading-[0.85]">{sellerData.shop_name}</h1>
             <p className="text-zinc-400 text-[10px] font-black uppercase italic mt-4 tracking-widest">{sellerData.category || 'PREMIUM BRAND'}</p>
           </header>
           <div className="px-4 grid grid-cols-2 gap-4">
             {sellerStoreProducts.map(p => (
               <div key={p.id} className="bg-white rounded-[3rem] p-3 border border-zinc-100 shadow-sm">
                  <div className="relative aspect-square mb-4 rounded-[2.5rem] overflow-hidden">
                    <img src={p.image_url} className="w-full h-full object-cover" />
                    <div className="absolute bottom-3 right-3 bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-black">{p.price} ₽</div>
                  </div>
                  <h3 className="text-[10px] font-black uppercase h-8 line-clamp-2 text-center mb-4">{p.name}</h3>
                  <button onClick={() => addToCart(p)} className="w-full py-4 bg-black text-white rounded-2xl text-[9px] font-black uppercase italic active:scale-95 transition-all">В КОРЗИНУ</button>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* --- ВСЕ МОДАЛКИ (КОРЗИНА, СТАТУС, ТОВАР) --- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-md flex items-end animate-fade-in" onClick={() => setIsCartOpen(false)}>
          <div className="bg-white w-full rounded-t-[4rem] p-8 animate-slide-up max-h-[90vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-8" />
            <h2 className="text-3xl font-[1000] italic uppercase text-center mb-10 tracking-tighter">КОРЗИНА</h2>
            {cart.length > 0 ? (
              <div className="space-y-4 pb-10">
                {Array.from(new Set(cart.map(i => i.id))).map(id => {
                  const item = cart.find(x => x.id === id);
                  const qty = getCount(id);
                  return (
                    <div key={id} className="flex items-center gap-5 bg-zinc-50 p-5 rounded-[2.5rem] border border-zinc-100">
                      <img src={item.image_url} className="w-16 h-16 rounded-[1.2rem] object-cover" />
                      <div className="flex-1">
                        <p className="text-[11px] font-[1000] uppercase italic leading-none mb-1">{item.name}</p>
                        <p className="text-orange-500 font-black text-sm italic">{item.price * qty} ₽</p>
                      </div>
                      <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-zinc-100 shadow-sm">
                        <button onClick={() => removeFromCartOnce(id)} className="w-8 h-8 font-black text-zinc-300">—</button>
                        <span className="text-xs font-black italic">{qty}</span>
                        <button onClick={() => addToCart(item)} className="w-8 h-8 font-black">+</button>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-6 space-y-4">
                  <input type="text" placeholder="АДРЕС ДОСТАВКИ..." className="w-full bg-zinc-100 p-6 rounded-[2rem] text-[10px] font-black uppercase italic outline-none border-2 border-transparent focus:border-zinc-200" value={orderAddress} onChange={e => setOrderAddress(e.target.value)} />
                  <textarea placeholder="ПРИМЕЧАНИЯ..." className="w-full bg-zinc-100 p-6 rounded-[2rem] text-[10px] font-black uppercase italic outline-none h-32 resize-none" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} />
                </div>
                <button onClick={checkout} className="w-full bg-orange-500 text-white py-7 rounded-[2.5rem] font-black uppercase italic shadow-2xl shadow-orange-500/30 mt-8 active:scale-95 transition-all text-sm">
                  ОФОРМИТЬ ({cart.reduce((s, i) => s + Number(i.price), 0)} ₽)
                </button>
              </div>
            ) : <p className="text-center py-20 opacity-20 font-black uppercase italic tracking-widest">ПУСТО</p>}
          </div>
        </div>
      )}

      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-md flex items-end animate-fade-in" onClick={() => setIsStatusModalOpen(false)}>
           <div className="bg-white w-full rounded-t-[4rem] p-10 animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-1.5 bg-zinc-100 rounded-full mx-auto mb-10" />
              <h2 className="text-3xl font-[1000] italic uppercase mb-10 text-center tracking-tighter">ТРЕКИНГ</h2>
              <div className="flex gap-3 mb-10">
                 <input type="text" placeholder="ТЕЛЕФОН ИЛИ ID" className="flex-1 bg-zinc-50 border border-zinc-100 p-6 rounded-[2rem] text-xs font-black outline-none italic uppercase" value={checkPhone} onChange={e => setCheckPhone(e.target.value)} />
                 <button onClick={checkStatus} className="bg-black text-white px-8 rounded-[2rem] font-black uppercase italic text-[10px] active:scale-90 transition-all">ПОИСК</button>
              </div>
              <div className="space-y-4 max-h-[40vh] overflow-y-auto no-scrollbar pb-10">
                 {userOrders.map(o => (
                   <div key={o.id} className="bg-zinc-50 p-7 rounded-[2.8rem] flex justify-between items-center border border-zinc-100 shadow-sm">
                      <div>
                        <p className="text-[10px] font-black text-zinc-400 mb-1 tracking-widest uppercase">ID: {o.id.slice(0,8)}</p>
                        <p className="font-black uppercase italic text-sm">{o.status}</p>
                      </div>
                      <p className="text-orange-500 font-[1000] italic">{o.price} ₽</p>
                   </div>
                 ))}
                 {hasSearched && userOrders.length === 0 && !isSearchingOrders && <p className="text-center py-10 opacity-20 font-black uppercase italic text-[10px] tracking-[0.4em]">НИЧЕГО НЕ НАЙДЕНО</p>}
              </div>
           </div>
        </div>
      )}

      {isProductModalOpen && (
        <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-xl flex items-end animate-fade-in" onClick={() => setIsProductModalOpen(false)}>
           <div className="bg-zinc-900 w-full rounded-t-[4rem] p-10 animate-slide-up border-t border-white/10" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-10" />
              <form onSubmit={handleSaveProduct} className="space-y-5 pb-10">
                 <input type="text" className="w-full bg-black/50 border border-white/5 p-6 rounded-2xl text-white outline-none font-black text-[11px] uppercase italic focus:border-orange-500" placeholder="НАЗВАНИЕ ТОВАРА" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
                 <div className="grid grid-cols-2 gap-4">
                    <input type="number" className="bg-black/50 border border-white/5 p-6 rounded-2xl text-white outline-none font-black text-[11px] uppercase italic" placeholder="ЦЕНА" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} />
                    <input type="number" className="bg-black/50 border border-white/5 p-6 rounded-2xl text-white outline-none font-black text-[11px] uppercase italic" placeholder="СТАРАЯ ЦЕНА" value={editingProduct.old_price} onChange={e => setEditingProduct({...editingProduct, old_price: e.target.value})} />
                 </div>
                 <input type="text" className="w-full bg-black/50 border border-white/5 p-6 rounded-2xl text-white outline-none font-black text-[11px] uppercase italic" placeholder="КАТЕГОРИЯ" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} />
                 <input type="text" className="w-full bg-black/50 border border-white/5 p-6 rounded-2xl text-white outline-none font-black text-[11px] uppercase italic" placeholder="URL КАРТИНКИ" value={editingProduct.image_url} onChange={e => setEditingProduct({...editingProduct, image_url: e.target.value})} />
                 <button type="submit" className="w-full py-7 bg-white text-black rounded-[2.5rem] font-black uppercase italic shadow-2xl hover:bg-orange-500 hover:text-white transition-all">СОХРАНИТЬ ИЗМЕНЕНИЯ</button>
              </form>
           </div>
        </div>
      )}

      {selectedStory && (
        <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedStory(null)}>
           <img src={selectedStory} className="max-h-[85vh] max-w-full rounded-[3.5rem] shadow-[0_0_100px_rgba(255,165,0,0.2)] border border-white/10" />
           <button className="absolute top-10 right-10 text-white text-4xl font-thin">✕</button>
        </div>
      )}

      <style jsx global>{`
        body { -webkit-tap-highlight-color: transparent; font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background: #F8F8F8; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes fade-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.35s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}