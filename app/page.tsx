'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { App } from '@capacitor/app';

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
  const [adminTab, setAdminTab] = useState<'orders' | 'products' | 'stories'>('orders');

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [currentSellerId, setCurrentSellerId] = useState<string | null>(null);
  const [sellerData, setSellerData] = useState<any>(null);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [sellerLoading, setSellerLoading] = useState(false);

  // Для загрузки истории
  const [isUploading, setIsUploading] = useState(false);

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

  // --- ЗАГРУЗКА ИСТОРИИ (ФАЙЛ) ---
  const handleUploadStory = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !currentSeller) return;

    setIsUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('seller_stories').insert([{
        seller_id: currentSeller.id,
        image_url: publicUrl
      }]);

      if (dbError) throw dbError;
      
      alert("ИСТОРИЯ ЗАГРУЖЕНА!");
      fetchData();
    } catch (err: any) {
      alert("ОШИБКА: " + err.message);
    } finally {
      setIsUploading(false);
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

  useEffect(() => {
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

  const checkStatus = async () => {
    setIsSearchingOrders(true);
    const { data } = await supabase.from('orders').select('*').or(`buyer_phone.eq.${checkPhone},id.ilike.${checkPhone}%`).order('created_at', { ascending: false });
    setUserOrders(data || []);
    setHasSearched(true);
    setIsSearchingOrders(false);
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
        <div className="fixed inset-0 z-[300] bg-[#0A0A0A] overflow-y-auto animate-fade-in text-white">
          {!currentSeller ? (
            <div className="p-8 pt-24 max-w-md mx-auto min-h-screen flex flex-col">
              <button onClick={() => { window.location.hash = ''; setIsAdminRoute(false); }} className="text-[10px] font-black italic text-zinc-600 mb-16 uppercase tracking-[0.3em] text-left">← НАЗАД</button>
              <h2 className="text-6xl font-black italic uppercase tracking-tighter leading-[0.8] mb-12">ADMIN</h2>
              <div className="space-y-4">
                {isAuthMode === 'reg' && (
                  <>
                    <input type="text" placeholder="НАЗВАНИЕ МАГАЗИНА" className="w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl outline-none font-bold text-[10px] uppercase italic" onChange={e => setSellerAuth({...sellerAuth, name: e.target.value})}/>
                    <input type="text" placeholder="КАТЕГОРИЯ" className="w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl outline-none font-bold text-[10px] uppercase italic" onChange={e => setSellerAuth({...sellerAuth, cat: e.target.value})}/>
                  </>
                )}
                <input type="text" placeholder="ЛОГИН" className="w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl outline-none font-bold text-[10px] uppercase italic" onChange={e => setSellerAuth({...sellerAuth, login: e.target.value})}/>
                <input type="password" placeholder="ПАРОЛЬ" className="w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl outline-none font-bold text-[10px] uppercase italic" onChange={e => setSellerAuth({...sellerAuth, pass: e.target.value})}/>
                <button onClick={handleAuth} className="w-full bg-white text-black py-7 rounded-[2rem] font-black italic uppercase transition-all mt-4 hover:bg-orange-500 hover:text-white">
                  {isAuthMode === 'login' ? 'ВОЙТИ' : 'СОЗДАТЬ'}
                </button>
                <button onClick={() => setIsAuthMode(isAuthMode === 'login' ? 'reg' : 'login')} className="w-full text-[9px] font-black italic uppercase text-zinc-500 mt-10">
                  {isAuthMode === 'login' ? 'РЕГИСТРАЦИЯ' : 'ЕСТЬ АККАУНТ'}
                </button>
              </div>
            </div>
          ) : (
            <div className="min-h-screen pb-20">
              <header className="sticky top-0 z-[310] bg-black/80 backdrop-blur-2xl p-8 pt-16 rounded-b-[4rem] border-b border-white/5">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-orange-500 font-black text-[9px] uppercase tracking-[0.4em] mb-2">PARTNER DASHBOARD</p>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">{currentSeller.shop_name}</h1>
                  </div>
                  <button onClick={() => setCurrentSeller(null)} className="bg-zinc-900 text-white w-12 h-12 rounded-full flex items-center justify-center text-xs">✕</button>
                </div>
                <div className="flex bg-zinc-900 p-1.5 rounded-[2rem]">
                  <button onClick={() => setAdminTab('orders')} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase italic ${adminTab === 'orders' ? 'bg-white text-black' : 'text-zinc-500'}`}>ЗАКАЗЫ</button>
                  <button onClick={() => setAdminTab('products')} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase italic ${adminTab === 'products' ? 'bg-white text-black' : 'text-zinc-500'}`}>ТОВАРЫ</button>
                  <button onClick={() => setAdminTab('stories')} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase italic ${adminTab === 'stories' ? 'bg-white text-black' : 'text-zinc-500'}`}>СТОРИС</button>
                </div>
              </header>
              <div className="px-6 mt-10">
                {adminTab === 'orders' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center px-4">
                       <h2 className="text-[10px] font-black uppercase italic text-zinc-500">{showArchived ? 'АРХИВ' : 'НОВЫЕ'}</h2>
                       <button onClick={() => setShowArchived(!showArchived)} className="text-[9px] font-black uppercase italic bg-orange-500/10 text-orange-500 px-4 py-2 rounded-full">{showArchived ? '← ТЕКУЩИЕ' : 'АРХИВ →'}</button>
                    </div>
                    {(showArchived ? sellerArchivedOrders : sellerActiveOrders).map(order => (
                      <div key={order.id} className="bg-zinc-900/60 border border-white/5 p-7 rounded-[2.5rem] mb-4">
                        <div className="flex justify-between items-start mb-6">
                          <span className="text-[10px] font-black text-zinc-600 italic">#{order.id.slice(0,6)}</span>
                          <p className="text-[12px] font-black text-white italic">{order.price} ₽</p>
                        </div>
                        <h3 className="text-sm font-black uppercase italic leading-tight mb-6">{order.product_name}</h3>
                        <div className="bg-black/40 rounded-2xl p-4 space-y-3 mb-6">
                          <p className="text-[10px] text-zinc-300">TEL: {order.buyer_phone}</p>
                          <p className="text-[10px] text-zinc-300">ADD: {order.address}</p>
                        </div>
                        {!showArchived && (
                          <button onClick={() => completeOrder(order.id)} className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase italic">ЗАВЕРШИТЬ</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {adminTab === 'products' && (
                  <div className="space-y-8">
                    <button onClick={() => { setEditingProduct({ name: '', price: '', old_price: '', category: '', image_url: '' }); setIsProductModalOpen(true); }} className="w-full bg-zinc-900 text-white border border-white/10 py-8 rounded-[2.5rem] font-black italic uppercase flex items-center justify-center gap-4">
                      + НОВЫЙ ТОВАР
                    </button>
                    {sellerProducts.map(p => (
                      <div key={p.id} className="bg-zinc-900/40 p-4 rounded-[2.5rem] flex items-center gap-5 border border-white/5">
                        <img src={p.image_url} className="w-20 h-20 rounded-[1.8rem] object-cover" />
                        <div className="flex-1">
                          <h3 className="text-[10px] font-black uppercase italic text-zinc-100">{p.name}</h3>
                          <p className="text-sm font-black text-orange-500 italic">{p.price} ₽</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-xs">✏️</button>
                          <button onClick={() => deleteProduct(p.id)} className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-xs">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {adminTab === 'stories' && (
                  <div className="space-y-6">
                    <div className="bg-zinc-900 p-8 rounded-[3rem] border border-white/10 text-center">
                      <h3 className="text-[12px] font-black uppercase italic mb-6 text-orange-500 tracking-widest">ЗАГРУЗИТЬ СТОРИС</h3>
                      <label className="block w-full cursor-pointer">
                        <div className={`border-2 border-dashed border-zinc-800 rounded-[2rem] p-12 transition-all ${isUploading ? 'opacity-50' : 'hover:border-orange-500'}`}>
                          {isUploading ? (
                            <p className="text-orange-500 font-black animate-pulse">ЗАГРУЗКА...</p>
                          ) : (
                            <>
                              <span className="text-4xl mb-4 block">📸</span>
                              <p className="text-[10px] font-black uppercase italic text-zinc-400">ВЫБРАТЬ ФОТО С ТЕЛЕФОНА</p>
                            </>
                          )}
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleUploadStory} disabled={isUploading} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* МОДАЛКА ТОВАРА (ДЛЯ АДМИНКИ) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-xl flex items-end" onClick={() => setIsProductModalOpen(false)}>
          <div className="bg-zinc-900 w-full rounded-t-[4rem] p-10 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-3xl font-black italic uppercase text-center mb-10 text-white">ТОВАР</h2>
            <form onSubmit={handleSaveProduct} className="space-y-5">
              <input type="text" placeholder="НАЗВАНИЕ" className="w-full bg-black/50 border border-white/5 p-6 rounded-2xl text-[11px] font-bold uppercase text-white outline-none" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
              <div className="flex gap-4">
                <input type="number" placeholder="ЦЕНА" className="w-full bg-black/50 border border-white/5 p-6 rounded-2xl text-[11px] font-bold uppercase text-white outline-none" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} />
                <input type="number" placeholder="СТАРАЯ ЦЕНА" className="w-full bg-black/50 border border-white/5 p-6 rounded-2xl text-[11px] font-bold uppercase text-white outline-none" value={editingProduct.old_price} onChange={e => setEditingProduct({...editingProduct, old_price: e.target.value})} />
              </div>
              <input type="text" placeholder="URL КАРТИНКИ" className="w-full bg-black/50 border border-white/5 p-6 rounded-2xl text-[11px] font-bold uppercase text-white outline-none" value={editingProduct.image_url} onChange={e => setEditingProduct({...editingProduct, image_url: e.target.value})} />
              <button type="submit" className="w-full bg-white text-black py-7 rounded-[2.5rem] font-black uppercase italic mt-6 transition-all active:scale-95">СОХРАНИТЬ</button>
            </form>
          </div>
        </div>
      )}

      {/* --- ГЛАВНАЯ СТРАНИЦА --- */}
      {!currentSellerId && !isAdminRoute && (
        <>
          <header className={`bg-white px-6 pt-10 pb-6 rounded-b-[3.5rem] shadow-sm sticky top-0 z-[100] transition-all duration-500 ${scrollY > 50 ? 'shadow-xl' : ''}`}>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsStatusModalOpen(true)} className="flex-shrink-0 bg-zinc-50 border border-zinc-100 text-[8px] font-black uppercase italic text-zinc-400 h-[58px] px-4 rounded-2xl transition-all active:scale-95">
                ГДЕ МОЙ ЗАКАЗ?
              </button>
              <div className="flex-1 relative">
                <input type="text" placeholder="ПОИСК..." className="w-full bg-zinc-100 h-[58px] px-6 rounded-2xl text-[10px] font-black uppercase italic outline-none border border-transparent focus:border-zinc-200 transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <button onClick={() => setIsCartOpen(true)} className={`flex-shrink-0 relative bg-black text-white h-[58px] w-[58px] rounded-2xl flex items-center justify-center transition-all ${cartBumping ? 'scale-110 bg-orange-500' : 'active:scale-95'}`}>
                <span className="text-xl">🛒</span>
                {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 w-5 h-5 rounded-full text-[9px] flex items-center justify-center border-2 border-white font-black animate-fade-in">{cart.length}</span>}
              </button>
            </div>
          </header>

          <div className="px-6 mt-6 overflow-hidden">
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
              {stories.length > 0 ? stories.map(s => (
                <div key={s.id} onClick={() => setSelectedStory(s.image_url)} className="flex-shrink-0 w-16 h-16 rounded-full p-[2.5px] border-2 border-orange-500 cursor-pointer transition-transform active:scale-90 bg-white">
                  <img src={s.image_url} className="w-full h-full rounded-full object-cover" />
                </div>
              )) : (
                <div className="h-16 w-full flex items-center justify-center opacity-10 text-[10px] font-black italic uppercase">Нет историй</div>
              )}
            </div>
          </div>

          <div className="px-6 flex gap-2 overflow-x-auto no-scrollbar my-8">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-7 py-2.5 rounded-full text-[10px] font-black uppercase italic transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-zinc-400 border border-zinc-100'}`}>
                {cat}
              </button>
            ))}
          </div>

          <main className="px-4 grid grid-cols-2 gap-4">
            {filteredProducts.map(p => {
              const count = getProductCount(p.id);
              return (
                <div key={p.id} className="bg-white rounded-[2.8rem] p-2 border border-zinc-100 shadow-sm group">
                  <div className="relative aspect-square mb-3 overflow-hidden rounded-[2.4rem]">
                    <img src={p.image_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    <div className="absolute bottom-3 right-3 bg-black text-white px-4 py-2 rounded-full text-[12px] font-black italic">{p.price} ₽</div>
                  </div>
                  <div className="px-3 pb-3 text-center">
                    <button onClick={() => { if (p.seller_id) window.location.hash = `#/seller?id=${p.seller_id}`; }} className="mb-2 inline-flex items-center bg-zinc-100 px-3 py-1.5 rounded-full transition-all active:scale-90">
                      <span className="text-[8px] text-zinc-500 font-black uppercase italic tracking-widest">🏪 {p?.sellers?.shop_name || 'МАГАЗИН'}</span>
                    </button>
                    <h3 className="font-bold text-[10px] uppercase tracking-tighter mb-4 h-8 line-clamp-2 leading-none text-zinc-800">{p.name}</h3>
                    <div className="relative h-[46px] w-full">
                      {count === 0 ? (
                        <button onClick={() => addToCart(p)} className="w-full h-full bg-black text-white rounded-[1.2rem] text-[9px] font-black uppercase italic shadow-md active:scale-95 transition-all">КУПИТЬ</button>
                      ) : (
                        <div className="flex items-center justify-between bg-zinc-100 rounded-[1.2rem] h-full border border-zinc-200">
                          <button onClick={() => removeFromCartOnce(p.id)} className="flex-1 h-full font-black text-lg text-zinc-400 active:scale-90 transition-all">—</button>
                          <span className="px-2 text-[12px] font-black italic">{count}</span>
                          <button onClick={() => addToCart(p)} className="flex-1 h-full font-black text-lg active:scale-90 transition-all">+</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </main>
        </>
      )}

      {/* --- КОРЗИНА И ОСТАЛЬНОЕ --- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-md flex items-end animate-fade-in" onClick={() => setIsCartOpen(false)}>
          <div className="bg-white w-full rounded-t-[3.5rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
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
                          <span className="text-[9px] text-orange-500 font-black italic">{item.price * qty} ₽</span>
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
                  <textarea placeholder="ПРИМЕЧАНИЯ..." className="w-full bg-zinc-100 p-5 rounded-[1.8rem] text-[10px] font-black uppercase italic outline-none h-24 resize-none" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
                </div>
                <button onClick={checkout} className="w-full bg-orange-500 text-white py-6 rounded-[2.2rem] font-black uppercase italic shadow-xl shadow-orange-500/30 mt-6 active:scale-95 transition-all">
                    ОФОРМИТЬ ({cart.reduce((s, i) => s + Number(i.price || 0), 0)} ₽)
                </button>
              </div>
            ) : <p className="text-center py-10 opacity-20 font-black uppercase italic text-[10px]">ПУСТО</p>}
          </div>
        </div>
      )}

      {selectedStory && (
        <div className="fixed inset-0 z-[2000] bg-black flex items-center justify-center" onClick={() => setSelectedStory(null)}>
           <div className="relative w-full h-full">
              <img src={selectedStory} className="w-full h-full object-contain" />
              <button className="absolute top-12 right-6 text-white text-4xl font-light">✕</button>
           </div>
        </div>
      )}

      <style jsx global>{`
        body { -webkit-tap-highlight-color: transparent; margin: 0; padding: 0; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}