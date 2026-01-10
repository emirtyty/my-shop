'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { App } from '@capacitor/app';

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

  // --- АДМИНКА (ULTRA DESIGN) ---
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [isAuthMode, setIsAuthMode] = useState<'login' | 'reg'>('login');
  const [sellerAuth, setSellerAuth] = useState({ login: '', pass: '', name: '', cat: '' });
  const [currentSeller, setCurrentSeller] = useState<any>(null);
  const [sellerActiveOrders, setSellerActiveOrders] = useState<any[]>([]);
  const [sellerArchivedOrders, setSellerArchivedOrders] = useState<any[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [adminTab, setAdminTab] = useState<'orders' | 'products'>('orders');

  // Управление товарами
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [currentSellerId, setCurrentSellerId] = useState<string | null>(null);
  const [sellerData, setSellerData] = useState<any>(null);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [sellerLoading, setSellerLoading] = useState(false);

  useEffect(() => {
    const handleBackButton = async () => {
      await App.addListener('backButton', () => {
        if (isCartOpen) setIsCartOpen(false);
        else if (isProductModalOpen) setIsProductModalOpen(false);
        else if (currentSellerId) window.location.hash = '';
        else if (isAdminRoute) { window.location.hash = ''; setIsAdminRoute(false); }
        else if (isStatusModalOpen) setIsStatusModalOpen(false);
        else if (selectedStory) setSelectedStory(null);
        else App.exitApp();
      });
    };
    handleBackButton();
    return () => { App.removeAllListeners(); };
  }, [isCartOpen, currentSellerId, isStatusModalOpen, selectedStory, isAdminRoute, isProductModalOpen]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/admin') {
        setIsAdminRoute(true);
      } else if (hash.includes('/seller?id=')) {
        const id = hash.split('id=')[1];
        setCurrentSellerId(id);
        fetchSellerData(id);
      } else {
        setIsAdminRoute(false);
        setCurrentSellerId(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  async function fetchSellerData(id: string) {
    setSellerLoading(true);
    try {
      const [sRes, pRes] = await Promise.all([
        supabase.from('sellers').select('*').eq('id', id).single(),
        supabase.from('product_market').select('*').eq('seller_id', id)
      ]);
      setSellerData(sRes.data);
      setSellerProducts(pRes.data || []);
    } catch (e) { console.error(e); } finally { setSellerLoading(false); }
  }

  const handleAuth = async () => {
    try {
      if (isAuthMode === 'reg') {
        if (!sellerAuth.login || !sellerAuth.pass || !sellerAuth.name) return alert("Заполните данные!");
        const { data, error } = await supabase.from('sellers').insert([{
          login: sellerAuth.login,
          password: sellerAuth.pass,
          shop_name: sellerAuth.name,
          category: sellerAuth.cat
        }]).select().single();
        if (error) throw error;
        setCurrentSeller(data);
      } else {
        const { data, error } = await supabase.from('sellers').select('*').eq('login', sellerAuth.login).eq('password', sellerAuth.pass).single();
        if (error || !data) throw new Error("Неверный логин или пароль");
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
    if (data) setSellerProducts(data);
  }

  const completeOrder = async (orderId: string) => {
    const { error } = await supabase.from('orders').update({ status: 'ЗАВЕРШЕН' }).eq('id', orderId);
    if (!error) fetchSellerOrders();
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = editingProduct;
    if (!p.name || !p.price || !p.image_url) return alert("Заполните поля!");
    const payload = { 
      name: p.name, 
      price: Number(p.price), 
      old_price: p.old_price ? Number(p.old_price) : null, 
      category: p.category, 
      image_url: p.image_url, 
      seller_id: currentSeller.id 
    };
    let error;
    if (p.id) { 
      const { error: err } = await supabase.from('product_market').update(payload).eq('id', p.id);
      error = err; 
    } else { 
      const { error: err } = await supabase.from('product_market').insert([payload]);
      error = err; 
    }
    if (!error) { 
      setIsProductModalOpen(false); 
      fetchSellerAdminProducts();
      const { data } = await supabase.from('product_market').select('*, sellers(id, shop_name)');
      if (data) setProducts(data);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Удалить этот товар?")) return;
    const { error } = await supabase.from('product_market').delete().eq('id', id);
    if (!error) { 
      fetchSellerAdminProducts();
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('cart');
    if (saved) { try { setCart(JSON.parse(saved)); } catch (e) { console.error(e); } }
    const savedPhone = localStorage.getItem('userPhone');
    if (savedPhone) setCheckPhone(savedPhone);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [prodRes, storyRes] = await Promise.all([
          supabase.from('product_market').select('*, sellers(id, shop_name)'),
          supabase.from('seller_stories').select('*').order('created_at', { ascending: false })
        ]);
        setProducts(prodRes.data || []);
        setStories(storyRes.data || []);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    fetchData();
  }, []);

  const addToCart = (product: any) => { 
    if (!product) return;
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

  const checkout = async () => {
    if (cart.length === 0 || !orderAddress.trim()) return alert("УКАЖИТЕ АДРЕС!");
    const phone = prompt("Введите номер телефона:");
    if (!phone) return;
    const cleanPhone = phone.trim();
    const ordersBySeller = cart.reduce((acc: any, item: any) => { 
      const sId = item.seller_id || 'default'; 
      if (!acc[sId]) acc[sId] = []; 
      acc[sId].push(item); 
      return acc; 
    }, {});
    try {
      for (const sId in ordersBySeller) {
        const items = ordersBySeller[sId];
        const pName = items.map((i: any) => i.name).join(', ');
        const totalPrice = items.reduce((sum: number, i: any) => sum + Number(i.price), 0);
        await supabase.from('orders').insert([{ product_name: pName, price: totalPrice, buyer_phone: cleanPhone, seller_id: sId, status: 'НОВЫЙ', address: orderAddress, notes: orderNotes }]);
      }
      alert("✅ ПРИНЯТО"); setCart([]); setIsCartOpen(false);
    } catch (e) { alert("❌ ОШИБКА"); }
  };

  const categories = useMemo(() => { 
    const cats = products.map(p => (typeof p.category === 'object' ? p.category?.name : p.category) || 'Без категории'); 
    return ['Все', ...Array.from(new Set(cats.map(String)))]; 
  }, [products]);

  const filteredProducts = useMemo(() => products.filter(p => { 
    const ms = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()); 
    const catName = String(typeof p.category === 'object' ? p.category?.name : p.category || 'Без категории'); 
    return ms && (activeCategory === 'Все' || catName === activeCategory); 
  }), [products, searchQuery, activeCategory]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black font-black italic text-orange-500 uppercase animate-pulse">RA DELL...</div>;

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-black pb-32 overflow-x-hidden">
      
      {/* --- АДМИНКА --- */}
      {isAdminRoute && (
        <div className="fixed inset-0 z-[300] bg-[#0A0A0A] overflow-y-auto animate-fade-in text-white selection:bg-orange-500">
          {!currentSeller ? (
            <div className="p-8 pt-24 max-w-md mx-auto min-h-screen flex flex-col">
              <button onClick={() => { window.location.hash = ''; setIsAdminRoute(false); }} className="text-[10px] font-black italic text-zinc-600 mb-16 uppercase tracking-[0.3em] text-left hover:text-white transition-colors">← ВЕРНУТЬСЯ В РЕАЛЬНОСТЬ</button>
              <h2 className="text-6xl font-black italic uppercase tracking-tighter leading-[0.8] mb-12">
                {isAuthMode === 'login' ? 'ENTER\nSYSTEM' : 'JOIN THE\nELITE'}
              </h2>
              <div className="space-y-4">
                {isAuthMode === 'reg' && (
                  <>
                    <input type="text" placeholder="НАЗВАНИЕ МАГАЗИНА" className="w-full bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl outline-none font-bold text-[10px] uppercase italic focus:border-orange-500 transition-all shadow-inner" onChange={e => setSellerAuth({...sellerAuth, name: e.target.value})}/>
                    <input type="text" placeholder="КАТЕГОРИЯ" className="w-full bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl outline-none font-bold text-[10px] uppercase italic focus:border-orange-500 transition-all shadow-inner" onChange={e => setSellerAuth({...sellerAuth, cat: e.target.value})}/>
                  </>
                )}
                <input type="text" placeholder="ЛОГИН" className="w-full bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl outline-none font-bold text-[10px] uppercase italic focus:border-orange-500 transition-all shadow-inner" onChange={e => setSellerAuth({...sellerAuth, login: e.target.value})}/>
                <input type="password" placeholder="ПАРОЛЬ" className="w-full bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl outline-none font-bold text-[10px] uppercase italic focus:border-orange-500 transition-all shadow-inner" onChange={e => setSellerAuth({...sellerAuth, pass: e.target.value})}/>
                <button onClick={handleAuth} className="w-full bg-white text-black py-7 rounded-[2rem] font-black italic uppercase shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-95 transition-all mt-4 hover:bg-orange-500 hover:text-white">
                  {isAuthMode === 'login' ? 'ENTER SYSTEM' : 'CREATE ACCOUNT'}
                </button>
                <button onClick={() => setIsAuthMode(isAuthMode === 'login' ? 'reg' : 'login')} className="w-full text-[9px] font-black italic uppercase text-zinc-500 mt-10 tracking-[0.4em]">
                  {isAuthMode === 'login' ? 'NO ACCESS? CREATE ONE' : 'ALREADY HAVE ACCESS? LOGIN'}
                </button>
              </div>
            </div>
          ) : (
            <div className="min-h-screen pb-20">
              <header className="sticky top-0 z-[310] bg-black/80 backdrop-blur-2xl p-8 pt-16 rounded-b-[4rem] border-b border-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-orange-500 font-black text-[9px] uppercase tracking-[0.4em] mb-2">PARTNER DASHBOARD</p>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">{currentSeller.shop_name}</h1>
                  </div>
                  <button onClick={() => setCurrentSeller(null)} className="bg-zinc-900 text-white w-12 h-12 rounded-full flex items-center justify-center text-xs border border-white/10 active:scale-90 transition-all">✕</button>
                </div>
                <div className="flex gap-3 mb-8">
                  <div className="flex-1 bg-zinc-900/50 rounded-3xl p-4 border border-white/5">
                    <p className="text-[8px] font-black text-zinc-500 uppercase mb-1">ЗАКАЗЫ</p>
                    <p className="text-xl font-black italic">{sellerActiveOrders.length}</p>
                  </div>
                  <div className="flex-1 bg-zinc-900/50 rounded-3xl p-4 border border-white/5">
                    <p className="text-[8px] font-black text-zinc-500 uppercase mb-1">ОБОРОТ</p>
                    <p className="text-xl font-black italic text-orange-500">{sellerActiveOrders.reduce((sum, o) => sum + Number(o.price), 0)} ₽</p>
                  </div>
                </div>
                <div className="flex bg-zinc-900/80 p-1.5 rounded-[2rem] border border-white/5">
                  <button onClick={() => setAdminTab('orders')} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase italic transition-all duration-500 ${adminTab === 'orders' ? 'bg-white text-black shadow-xl scale-105' : 'text-zinc-500'}`}>ORDERS</button>
                  <button onClick={() => setAdminTab('products')} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase italic transition-all duration-500 ${adminTab === 'products' ? 'bg-white text-black shadow-xl scale-105' : 'text-zinc-500'}`}>COLLECTION</button>
                </div>
              </header>
              <div className="px-6 mt-10">
                {adminTab === 'orders' ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center px-4">
                       <h2 className="text-[10px] font-black uppercase italic tracking-[0.3em] text-zinc-500">{showArchived ? 'ARCHIVE' : 'LIVE FEED'}</h2>
                       <button onClick={() => setShowArchived(!showArchived)} className="text-[9px] font-black uppercase italic bg-orange-500/10 text-orange-500 px-4 py-2 rounded-full border border-orange-500/20">{showArchived ? '← К АКТИВНЫМ' : 'АРХИВ →'}</button>
                    </div>
                    <div className="space-y-4">
                      {(showArchived ? sellerArchivedOrders : sellerActiveOrders).map(order => (
                        <div key={order.id} className="relative group overflow-hidden">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/30 to-transparent rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition duration-500"></div>
                          <div className="relative bg-zinc-900/60 border border-white/5 backdrop-blur-sm p-7 rounded-[2.5rem]">
                            <div className="flex justify-between items-start mb-6">
                              <span className="text-[10px] font-black text-zinc-600 italic">#{order.id.slice(0,6)}</span>
                              <div className="text-right">
                                <p className="text-[12px] font-black text-white italic">{order.price} ₽</p>
                                <p className="text-[7px] font-bold text-orange-500 uppercase tracking-widest">{order.status}</p>
                              </div>
                            </div>
                            <h3 className="text-sm font-black uppercase italic leading-tight mb-6 text-zinc-100">{order.product_name}</h3>
                            <div className="bg-black/40 rounded-2xl p-4 space-y-3 mb-6">
                              <div className="flex items-center gap-3">
                                <span className="text-[8px] font-black text-zinc-500 uppercase">TEL:</span>
                                <span className="text-[10px] font-bold text-zinc-300">{order.buyer_phone}</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-[8px] font-black text-zinc-500 uppercase">ADD:</span>
                                <span className="text-[10px] font-bold text-zinc-300 leading-relaxed">{order.address}</span>
                              </div>
                            </div>
                            {!showArchived && (
                              <button onClick={() => completeOrder(order.id)} className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase italic hover:bg-orange-500 hover:text-white transition-all shadow-lg active:scale-95">COMPLETE ORDER</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 animate-fade-in">
                    <button onClick={() => { setEditingProduct({ name: '', price: '', old_price: '', category: '', image_url: '' }); setIsProductModalOpen(true); }} className="w-full bg-zinc-900 text-white border border-white/10 py-8 rounded-[2.5rem] font-black italic uppercase tracking-widest shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all">
                      <span className="text-2xl">+</span> NEW PRODUCT
                    </button>
                    <div className="grid grid-cols-1 gap-4">
                      {sellerProducts.map(p => (
                        <div key={p.id} className="bg-zinc-900/40 p-4 rounded-[2.5rem] flex items-center gap-5 border border-white/5">
                          <div className="w-20 h-20 rounded-[1.8rem] overflow-hidden border border-white/10">
                            <img src={p.image_url} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-[10px] font-black uppercase italic mb-1 text-zinc-100">{p.name}</h3>
                            <p className="text-sm font-black text-orange-500 italic">{p.price} ₽</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-xs border border-white/5 active:bg-white active:text-black">✏️</button>
                            <button onClick={() => deleteProduct(p.id)} className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-xs border border-white/5 active:bg-red-500">🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* МОДАЛКА УПРАВЛЕНИЯ ТОВАРОМ */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-xl flex items-end animate-fade-in" onClick={() => setIsProductModalOpen(false)}>
          <div className="bg-zinc-900 w-full rounded-t-[4rem] p-10 animate-slide-up shadow-[0_-20px_80px_rgba(0,0,0,0.8)] max-h-[92vh] overflow-y-auto no-scrollbar border-t border-white/10" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-1 bg-zinc-800 rounded-full mx-auto mb-10" />
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-center mb-10 text-white">{editingProduct?.id ? 'EDIT\nITEM' : 'NEW\nITEM'}</h2>
            <form onSubmit={handleSaveProduct} className="space-y-5">
              <div className="space-y-1">
                <p className="text-[8px] font-black text-zinc-500 uppercase ml-4 tracking-widest">PRODUCT NAME</p>
                <input type="text" className="w-full bg-black/50 border border-white/5 p-6 rounded-2xl text-[11px] font-bold uppercase italic text-white outline-none focus:border-orange-500 transition-all" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <p className="text-[8px] font-black text-zinc-500 uppercase ml-4 tracking-widest">PRICE</p>
                  <input type="number" className="w-full bg-black/50 border border-white/5 p-6 rounded-2xl text-[11px] font-bold uppercase italic text-white outline-none" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-[8px] font-black text-zinc-500 uppercase ml-4 tracking-widest">OLD PRICE</p>
                  <input type="number" className="w-full bg-black/50 border border-white/5 p-6 rounded-2xl text-[11px] font-bold uppercase italic text-white outline-none" value={editingProduct.old_price} onChange={e => setEditingProduct({...editingProduct, old_price: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                 <p className="text-[8px] font-black text-zinc-500 uppercase ml-4 tracking-widest">IMAGE URL</p>
                 <input type="text" className="w-full bg-black/50 border border-white/5 p-6 rounded-2xl text-[11px] font-bold uppercase italic text-white outline-none" value={editingProduct.image_url} onChange={e => setEditingProduct({...editingProduct, image_url: e.target.value})} />
              </div>
              {editingProduct.image_url && (
                <div className="w-full h-40 rounded-3xl overflow-hidden border border-white/10 my-4 shadow-2xl">
                  <img src={editingProduct.image_url} className="w-full h-full object-cover" />
                </div>
              )}
              <button type="submit" className="w-full bg-white text-black py-7 rounded-[2.5rem] font-black uppercase italic shadow-2xl mt-6 hover:bg-orange-500 hover:text-white transition-all active:scale-95">SAVE CHANGES</button>
            </form>
          </div>
        </div>
      )}

      {/* --- ВИТРИНА (КЛИЕНТСКАЯ) --- */}
      <div className={`transition-all duration-700 ease-in-out ${currentSellerId || isAdminRoute ? 'opacity-0 scale-90 blur-xl pointer-events-none' : 'opacity-100 scale-100 blur-0'}`}>
        <header style={{ transform: `translateY(${scrollY > 50 ? '-100%' : '0'})`, opacity: scrollY > 50 ? 0 : 1 }} className="bg-white px-6 pt-12 pb-6 rounded-b-[3.5rem] shadow-sm mb-4 sticky top-0 z-50 transition-all duration-500">
          <div className="flex gap-4 items-center mb-4">
            <div className="flex-1 bg-zinc-100 rounded-2xl flex items-center px-4 py-4 border border-zinc-200/30">
              <input type="text" placeholder="ПОИСК..." className="bg-transparent outline-none w-full text-[11px] font-black uppercase italic" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <button onClick={() => setIsCartOpen(true)} className={`relative bg-black text-white p-4.5 rounded-[1.4rem] transition-all ${cartBumping ? 'scale-110 bg-orange-500' : ''}`}>
                🛒 {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 w-6 h-6 rounded-full text-[10px] flex items-center justify-center border-2 border-white font-black">{cart.length}</span>}
            </button>
          </div>
          <button onClick={() => setIsStatusModalOpen(true)} className="text-[9px] font-black uppercase italic text-zinc-400 mb-6 ml-2">🔍 ГДЕ МОЙ ЗАКАЗ?</button>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {stories.map((s) => (
              <div key={s.id} onClick={() => setSelectedStory(s.image_url)} className="flex-shrink-0 w-16 h-16 rounded-full p-[2px] border-2 border-orange-500 cursor-pointer">
                <img src={s.image_url} className="w-full h-full rounded-full object-cover" />
              </div>
            ))}
          </div>
        </header>

        <div className="px-6 flex gap-2 overflow-x-auto no-scrollbar mb-6">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-7 py-2.5 rounded-full text-[10px] font-black uppercase italic transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-zinc-400 border border-zinc-100'}`}>
              {cat}
            </button>
          ))}
        </div>

        <main className="px-4 grid grid-cols-2 gap-4">
          {filteredProducts.map((p, index) => {
            const count = getProductCount(p.id);
            const currentPrice = Number(p?.price || 0);
            const oldPrice = p?.old_price ? Number(p.old_price) : null;
            const hasDiscount = oldPrice !== null && oldPrice > currentPrice;
            const discountPercent = hasDiscount ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100) : 0;
            return (
              <div key={p.id || index} className="bg-white rounded-[2.8rem] p-2 border border-zinc-100 shadow-sm animate-fade-in group">
                <div className="relative aspect-square mb-3 overflow-hidden rounded-[2.4rem] bg-zinc-50">
                  <img src={p.image_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  {hasDiscount && <div className="absolute top-3 left-3 bg-orange-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black italic shadow-lg z-20">-{discountPercent}%</div>}
                  <div className="absolute bottom-3 right-3 flex flex-col items-end z-20">
                    {hasDiscount && <span className="bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full text-[8px] text-zinc-400 line-through font-bold mb-1 shadow-sm">{oldPrice} ₽</span>}
                    <div className="bg-black text-white px-4 py-2 rounded-full text-[12px] font-black italic shadow-2xl border border-white/10">{currentPrice} ₽</div>
                  </div>
                </div>
                <div className="px-3 pb-3 text-center">
                  <button onClick={() => { if (p.seller_id) window.location.hash = `/seller?id=${p.seller_id}`; }} className="mb-2 inline-flex items-center bg-zinc-100 px-3 py-1.5 rounded-full transition-all active:scale-90">
                    <span className="text-[8px] text-zinc-500 font-black uppercase italic tracking-widest">🏪 {p?.sellers?.shop_name || 'МАГАЗИН'}</span>
                  </button>
                  <h3 className="font-bold text-[10px] uppercase tracking-tighter mb-4 h-8 line-clamp-2 leading-none text-zinc-800">{p.name || 'Товар'}</h3>
                  <div className="relative h-[46px] w-full">
                    {count === 0 ? (
                      <button onClick={() => addToCart(p)} className="w-full h-full bg-black text-white rounded-[1.2rem] text-[9px] font-black uppercase italic shadow-md active:scale-95">КУПИТЬ</button>
                    ) : (
                      <div className="flex items-center justify-between bg-zinc-100 rounded-[1.2rem] h-full border border-zinc-200">
                        <button onClick={() => removeFromCartOnce(p.id)} className="flex-1 h-full font-black text-lg text-zinc-400">—</button>
                        <span className="px-2 text-[12px] font-black italic">{count}</span>
                        <button onClick={() => addToCart(p)} className="flex-1 h-full font-black text-lg">+</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </main>
      </div>

      {/* МОДАЛКА КОРЗИНЫ */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-end animate-fade-in" onClick={() => setIsCartOpen(false)}>
          <div className="bg-white w-full rounded-t-[3.5rem] p-8 animate-slide-up max-h-[90vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
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
                        <img src={item.image_url} className="w-12 h-12 rounded-xl object-cover" />
                        <div className="flex flex-col">
                          <span className="font-bold text-[10px] uppercase line-clamp-1">{item.name}</span>
                          <span className="text-[9px] text-orange-500 font-black italic">{(item.price || 0) * qty} ₽</span>
                        </div>
                      </div>
                      <div className="flex items-center bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
                        <button onClick={() => removeFromCartOnce(id)} className="px-3 py-1 font-black text-zinc-400">—</button>
                        <span className="text-[10px] font-black w-6 text-center">{qty}</span>
                        <button onClick={() => addToCart(item)} className="px-3 py-1 font-black">+</button>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-6 space-y-3">
                  <input type="text" placeholder="АДРЕС ДОСТАВКИ..." className="w-full bg-zinc-100 p-5 rounded-[1.8rem] text-[10px] font-black uppercase italic outline-none border border-transparent focus:border-zinc-300" value={orderAddress} onChange={(e) => setOrderAddress(e.target.value)} />
                  <textarea placeholder="ПРИМЕЧАНИЯ К ЗАКАЗУ..." className="w-full bg-zinc-100 p-5 rounded-[1.8rem] text-[10px] font-black uppercase italic outline-none h-24 resize-none border border-transparent focus:border-zinc-300" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
                </div>
                <button onClick={checkout} className="w-full bg-orange-500 text-white py-6 rounded-[2.2rem] font-black uppercase italic shadow-xl shadow-orange-500/30 mt-6 active:scale-95 transition-all">
                    ОФОРМИТЬ ({cart.reduce((s, i) => s + Number(i.price || 0), 0)} ₽)
                </button>
              </div>
            ) : <p className="text-center py-10 font-black uppercase italic opacity-20 text-[10px]">ПУСТО</p>}
          </div>
        </div>
      )}

      {/* --- СТИЛИ --- */}
      <style jsx global>{`
        body { -webkit-tap-highlight-color: transparent; font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}