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

  // --- СОСТОЯНИЕ АДМИНКИ ---
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

  const [isUploading, setIsUploading] = useState(false);

  // Навигация и системная кнопка "Назад"
  useEffect(() => {
    const handleBackButton = async () => {
      await App.addListener('backButton', () => {
        if (isCartOpen) setIsCartOpen(false);
        else if (isProductModalOpen) setIsProductModalOpen(false);
        else if (currentSellerId) { window.location.hash = ''; setCurrentSellerId(null); }
        else if (isAdminRoute) { window.location.hash = ''; setIsAdminRoute(false); }
        else if (isStatusModalOpen) setIsStatusModalOpen(false);
        else if (selectedStory) setSelectedStory(null);
        else App.exitApp();
      });
    };
    handleBackButton();
    return () => { App.removeAllListeners(); };
  }, [isCartOpen, currentSellerId, isStatusModalOpen, selectedStory, isAdminRoute, isProductModalOpen]);

  // Следим за URL (хэшем)
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

  // --- ЛОГИКА АДМИНКИ ---
  const handleAuth = async () => {
    try {
      if (isAuthMode === 'reg') {
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
        if (error || !data) throw new Error("Неверный логин/пароль");
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
    await supabase.from('orders').update({ status: 'ЗАВЕРШЕН' }).eq('id', orderId);
    fetchSellerOrders();
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = editingProduct;
    const payload = { 
      name: p.name, 
      price: Number(p.price), 
      old_price: p.old_price ? Number(p.old_price) : null, 
      category: p.category, 
      image_url: p.image_url, 
      seller_id: currentSeller.id 
    };
    if (p.id) await supabase.from('product_market').update(payload).eq('id', p.id);
    else await supabase.from('product_market').insert([payload]);
    setIsProductModalOpen(false); 
    fetchSellerAdminProducts();
    fetchData();
  };

  const handleUploadStory = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !currentSeller) return;
    setIsUploading(true);
    try {
      const fileName = `story_${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('products').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
      await supabase.from('seller_stories').insert([{ seller_id: currentSeller.id, image_url: publicUrl }]);
      fetchData();
      alert("СТОРИС ОПУБЛИКОВАНА");
    } catch (err: any) { alert(err.message); } finally { setIsUploading(false); }
  };

  // --- ОБЩАЯ ЛОГИКА ---
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
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  const checkout = async () => {
    if (cart.length === 0 || !orderAddress.trim()) return alert("УКАЖИТЕ АДРЕС!");
    const phone = prompt("ТЕЛЕФОН:");
    if (!phone) return;
    const ordersBySeller = cart.reduce((acc: any, item: any) => { 
      const sId = item.seller_id || 'default'; 
      if (!acc[sId]) acc[sId] = []; 
      acc[sId].push(item); 
      return acc; 
    }, {});
    for (const sId in ordersBySeller) {
      const items = ordersBySeller[sId];
      const pName = items.map((i: any) => i.name).join(', ');
      const totalPrice = items.reduce((sum: number, i: any) => sum + Number(i.price), 0);
      await supabase.from('orders').insert([{ product_name: pName, price: totalPrice, buyer_phone: phone, seller_id: sId, status: 'НОВЫЙ', address: orderAddress, notes: orderNotes }]);
    }
    alert("ГОТОВО!"); setCart([]); setIsCartOpen(false);
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-orange-500 font-black italic uppercase animate-pulse">RA DELL...</div>;

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-black pb-32 font-sans overflow-x-hidden">
      
      {/* ЦЕНТРАЛЬНЫЙ КОНТЕЙНЕР */}
      <div className="max-w-[480px] mx-auto bg-white min-h-screen shadow-2xl relative border-x border-zinc-100">
        
        {/* ==========================================================
            АДМИНКА (ВИДНА ТОЛЬКО ПО URL #/admin)
            ========================================================== */}
        {isAdminRoute && (
          <div className="absolute inset-0 z-[300] bg-[#0A0A0A] text-white overflow-y-auto p-6">
            {!currentSeller ? (
              <div className="pt-20">
                <button onClick={() => { window.location.hash = ''; setIsAdminRoute(false); }} className="text-[10px] font-black italic text-zinc-600 mb-10 tracking-[0.2em] uppercase">← НАЗАД В МАГАЗИН</button>
                <h2 className="text-5xl font-black italic mb-10 tracking-tighter uppercase">ADMIN</h2>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-zinc-500 ml-4 uppercase">Ваш логин</p>
                    <input type="text" className="w-full bg-zinc-900 p-6 rounded-2xl font-bold text-[10px] outline-none border border-zinc-800" onChange={e => setSellerAuth({...sellerAuth, login: e.target.value})}/>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-zinc-500 ml-4 uppercase">Ваш пароль</p>
                    <input type="password"  className="w-full bg-zinc-900 p-6 rounded-2xl font-bold text-[10px] outline-none border border-zinc-800" onChange={e => setSellerAuth({...sellerAuth, pass: e.target.value})}/>
                  </div>
                  <button onClick={handleAuth} className="w-full bg-orange-500 text-white py-6 rounded-3xl font-black italic uppercase mt-4">ВОЙТИ В КАБИНЕТ</button>
                </div>
              </div>
            ) : (
              <div className="pb-24">
                <div className="flex justify-between items-center py-8 border-b border-white/5 mb-6">
                   <h1 className="text-xl font-black italic uppercase tracking-tighter">{currentSeller.shop_name}</h1>
                   <button onClick={() => setCurrentSeller(null)} className="text-[9px] font-black opacity-30 uppercase">ВЫЙТИ</button>
                </div>
                
                {/* ТАБЫ В АДМИНКЕ */}
                <div className="flex bg-zinc-900 p-1 rounded-full mb-8">
                  <button onClick={() => setAdminTab('orders')} className={`flex-1 py-3 rounded-full text-[9px] font-black italic uppercase ${adminTab === 'orders' ? 'bg-white text-black' : 'text-zinc-500'}`}>ЗАКАЗЫ</button>
                  <button onClick={() => setAdminTab('products')} className={`flex-1 py-3 rounded-full text-[9px] font-black italic uppercase ${adminTab === 'products' ? 'bg-white text-black' : 'text-zinc-500'}`}>ТОВАРЫ</button>
                  <button onClick={() => setAdminTab('stories')} className={`flex-1 py-3 rounded-full text-[9px] font-black italic uppercase ${adminTab === 'stories' ? 'bg-white text-black' : 'text-zinc-500'}`}>СТОРИС</button>
                </div>

                {/* КОНТЕНТ ТАБОВ */}
                {adminTab === 'stories' && (
                  <div className="space-y-6">
                    <label className="block border-2 border-dashed border-zinc-800 rounded-[2.5rem] p-12 text-center cursor-pointer hover:border-orange-500 transition-all">
                      {isUploading ? <p className="animate-pulse text-orange-500 font-black italic">ЗАГРУЗКА...</p> : (
                        <>
                          <p className="text-3xl mb-4">📸</p>
                          <p className="text-[10px] font-black italic text-zinc-400 uppercase">ВЫБРАТЬ ФОТО ИЗ ГАЛЕРЕИ</p>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadStory} disabled={isUploading} />
                    </label>
                  </div>
                )}

                {adminTab === 'products' && (
                  <div className="space-y-4">
                    <button onClick={() => { setEditingProduct({ name: '', price: '', image_url: '' }); setIsProductModalOpen(true); }} className="w-full bg-zinc-800 py-6 rounded-3xl font-black italic uppercase text-[10px] tracking-widest">+ НОВЫЙ ТОВАР</button>
                    {sellerProducts.map(p => (
                      <div key={p.id} className="flex items-center gap-4 bg-zinc-900/40 p-3 rounded-3xl border border-white/5">
                        <img src={p.image_url} className="w-14 h-14 rounded-2xl object-cover" />
                        <div className="flex-1 font-black italic text-[9px] uppercase tracking-tighter leading-none">{p.name}</div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-orange-500">{p.price} ₽</p>
                          <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="mt-1 text-[18px] opacity-40">✏️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {adminTab === 'orders' && (
                  <div className="space-y-4">
                    {sellerActiveOrders.length > 0 ? sellerActiveOrders.map(o => (
                      <div key={o.id} className="bg-zinc-900/60 p-6 rounded-[2.2rem] border border-white/5">
                        <div className="flex justify-between font-black italic text-[10px] mb-4 text-zinc-500 uppercase tracking-widest">
                          <span>ЗАКАЗ #{o.id.slice(0,6)}</span>
                          <span>{o.price} ₽</span>
                        </div>
                        <div className="text-[11px] font-black italic uppercase mb-4 leading-tight">{o.product_name}</div>
                        <div className="bg-black/40 p-4 rounded-2xl mb-6 space-y-2">
                           <p className="text-[9px] text-zinc-400 uppercase">Тел: <span className="text-white">{o.buyer_phone}</span></p>
                           <p className="text-[9px] text-zinc-400 uppercase">Адрес: <span className="text-white">{o.address}</span></p>
                        </div>
                        <button onClick={() => completeOrder(o.id)} className="w-full py-4 bg-white text-black rounded-2xl font-black italic text-[10px] uppercase">ЗАВЕРШИТЬ</button>
                      </div>
                    )) : <p className="text-center py-20 opacity-20 font-black italic text-[10px] uppercase tracking-widest">НЕТ ЗАКАЗОВ</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==========================================================
            ВИТРИНА МАГАЗИНА (ПОЛЬЗОВАТЕЛЬСКАЯ)
            ========================================================== */}
        {!currentSellerId && !isAdminRoute && (
          <>
            <header className="p-6 sticky top-0 z-[100] bg-white/90 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsStatusModalOpen(true)} className="bg-zinc-100 text-[8px] font-black italic h-[54px] px-4 rounded-2xl uppercase text-zinc-400">СТАТУС</button>
                <input type="text" placeholder="ПОИСК ТОВАРОВ..." className="flex-1 bg-zinc-100 h-[54px] px-5 rounded-2xl text-[10px] font-black italic outline-none uppercase" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <button onClick={() => setIsCartOpen(true)} className={`relative bg-black text-white h-[54px] w-[54px] rounded-2xl flex items-center justify-center transition-all ${cartBumping ? 'scale-110' : ''}`}>
                   <span className="text-xl">🛒</span>
                   {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-black border-2 border-white">{cart.length}</span>}
                </button>
              </div>
              
              {/* СТОРИС */}
              <div className="flex gap-4 overflow-x-auto no-scrollbar mt-6 py-1">
                {stories.map(s => (
                  <div key={s.id} onClick={() => setSelectedStory(s.image_url)} className="flex-shrink-0 w-14 h-14 rounded-full p-0.5 border-2 border-orange-500 active:scale-90 transition-transform">
                    <img src={s.image_url} className="w-full h-full rounded-full object-cover" />
                  </div>
                ))}
              </div>
            </header>

            <div className="px-6 flex gap-2 overflow-x-auto no-scrollbar mb-4">
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full text-[9px] font-black italic uppercase whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-orange-500 text-white shadow-lg' : 'bg-zinc-100 text-zinc-400'}`}>{cat}</button>
              ))}
            </div>

            <main className="p-4 grid grid-cols-2 gap-3">
              {filteredProducts.map(p => {
                const count = getProductCount(p.id);
                return (
                  <div key={p.id} className="bg-white rounded-[2rem] p-2 border border-zinc-100 shadow-sm flex flex-col">
                    <div className="relative aspect-square rounded-[1.6rem] overflow-hidden mb-3">
                      <img src={p.image_url} className="w-full h-full object-cover" />
                      <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur text-white px-3 py-1.5 rounded-full text-[10px] font-black italic">{p.price} ₽</div>
                    </div>
                    <div className="px-1 flex flex-col flex-1">
                      <button onClick={() => { window.location.hash = `#/seller?id=${p.seller_id}`; }} className="text-[8px] font-black italic text-zinc-300 uppercase mb-2 text-center block tracking-widest truncate">🏪 {p?.sellers?.shop_name}</button>
                      <h3 className="text-[9px] font-black italic h-7 line-clamp-2 leading-tight mb-3 text-center uppercase tracking-tighter">{p.name}</h3>
                      <div className="mt-auto h-[38px]">
                        {count === 0 ? (
                          <button onClick={() => addToCart(p)} className="w-full h-full bg-black text-white rounded-xl text-[8px] font-black italic uppercase">В КОРЗИНУ</button>
                        ) : (
                          <div className="flex items-center bg-zinc-100 rounded-xl overflow-hidden h-full border border-zinc-200">
                            <button onClick={() => removeFromCartOnce(p.id)} className="flex-1 font-black text-zinc-400">-</button>
                            <span className="text-[10px] font-black px-2">{count}</span>
                            <button onClick={() => addToCart(p)} className="flex-1 font-black">+</button>
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

        {/* --- ЭКРАН ОТДЕЛЬНОГО ПРОДАВЦА --- */}
        {currentSellerId && sellerData && (
          <div className="absolute inset-0 z-[200] bg-white overflow-y-auto p-6">
            <header className="pt-10 mb-8 border-b border-zinc-50 pb-8 text-center">
              <button onClick={() => { window.location.hash = ''; setCurrentSellerId(null); }} className="text-[10px] font-black italic text-zinc-400 mb-6 uppercase tracking-[0.2em] block mx-auto">← НА ГЛАВНУЮ</button>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-2">{sellerData.shop_name}</h1>
              <p className="text-[10px] font-black text-orange-500 uppercase italic tracking-widest">{sellerData.category}</p>
            </header>
            <div className="grid grid-cols-2 gap-3 pb-20">
              {sellerProducts.map(p => (
                <div key={p.id} className="bg-white rounded-[2rem] p-3 border border-zinc-100 shadow-sm">
                  <img src={p.image_url} className="w-full aspect-square object-cover rounded-[1.6rem] mb-4" />
                  <h3 className="text-[9px] font-black italic mb-4 text-center uppercase leading-tight h-7 line-clamp-2">{p.name}</h3>
                  <button onClick={() => addToCart(p)} className="w-full py-4 bg-black text-white rounded-2xl text-[9px] font-black italic uppercase tracking-widest">{p.price} ₽</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- КОРЗИНА --- */}
        {isCartOpen && (
          <div className="absolute inset-0 z-[500] bg-black/40 backdrop-blur-sm flex items-end animate-fade-in" onClick={() => setIsCartOpen(false)}>
            <div className="bg-white w-full rounded-t-[2.5rem] p-8 max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-black italic uppercase text-center mb-8 tracking-widest">ВАША КОРЗИНА</h2>
              {cart.length > 0 ? (
                <div className="space-y-4">
                  {Array.from(new Set(cart.map(i => i.id))).map(id => {
                    const item = cart.find(c => c.id === id);
                    const qty = getProductCount(id);
                    return (
                      <div key={id} className="flex items-center justify-between bg-zinc-50 p-4 rounded-[1.8rem]">
                        <div className="flex items-center gap-3">
                          <img src={item.image_url} className="w-10 h-10 rounded-xl object-cover" />
                          <div className="font-black italic text-[9px] uppercase leading-tight w-24 truncate">{item.name}</div>
                        </div>
                        <div className="flex items-center bg-white rounded-xl border border-zinc-200 px-2">
                           <button onClick={() => removeFromCartOnce(id)} className="p-2 font-black text-zinc-300">-</button>
                           <span className="text-[10px] font-black px-2">{qty}</span>
                           <button onClick={() => addToCart(item)} className="p-2 font-black">+</button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-4 space-y-3">
                     <p className="text-[8px] font-black text-zinc-400 ml-4 uppercase">Адрес доставки</p>
                     <input type="text" className="w-full bg-zinc-100 p-5 rounded-2xl text-[10px] font-black italic outline-none border-none uppercase" value={orderAddress} onChange={e => setOrderAddress(e.target.value)} />
                  </div>
                  <button onClick={checkout} className="w-full bg-orange-500 text-white py-6 rounded-3xl font-black italic uppercase mt-4 shadow-lg tracking-widest">ОФОРМИТЬ ({cart.reduce((s,i) => s + Number(i.price), 0)} ₽)</button>
                </div>
              ) : <p className="text-center py-10 opacity-20 font-black italic text-[9px] uppercase">КОРЗИНА ПУСТА</p>}
            </div>
          </div>
        )}

        {/* --- МОДАЛКА ТОВАРА В АДМИНКЕ (С ПОДПИСЯМИ ПОЛЕЙ) --- */}
        {isProductModalOpen && (
          <div className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-6" onClick={() => setIsProductModalOpen(false)}>
            <div className="bg-zinc-900 w-full max-w-[400px] rounded-[3rem] p-10 border border-white/5 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-orange-500 font-black italic uppercase text-center mb-10 tracking-widest">РЕДАКТИРОВАНИЕ</h3>
              <form onSubmit={handleSaveProduct} className="space-y-5">
                <div className="space-y-1">
                  <p className="text-[8px] font-black italic text-zinc-500 uppercase ml-4">Название товара</p>
                  <input type="text" className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl text-[11px] font-bold text-white outline-none" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} required />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-[8px] font-black italic text-zinc-500 uppercase ml-4">Цена (₽)</p>
                    <input type="number" className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl text-[11px] font-bold text-white outline-none" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} required />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-[8px] font-black italic text-zinc-500 uppercase ml-4">Старая цена</p>
                    <input type="number" className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl text-[11px] font-bold text-white outline-none" value={editingProduct.old_price} onChange={e => setEditingProduct({...editingProduct, old_price: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                   <p className="text-[8px] font-black italic text-zinc-500 uppercase ml-4">Ссылка на фото (URL)</p>
                   <input type="text" className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl text-[11px] font-bold text-white outline-none" value={editingProduct.image_url} onChange={e => setEditingProduct({...editingProduct, image_url: e.target.value})} required />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-5 bg-zinc-800 rounded-2xl text-[10px] font-black italic uppercase">ОТМЕНА</button>
                  <button type="submit" className="flex-[2] py-5 bg-orange-500 text-white rounded-2xl text-[10px] font-black italic uppercase shadow-lg">СОХРАНИТЬ</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* --- ПРОСМОТР СТОРИС --- */}
      {selectedStory && (
        <div className="fixed inset-0 z-[2000] bg-black flex items-center justify-center animate-fade-in" onClick={() => setSelectedStory(null)}>
           <img src={selectedStory} className="max-w-full max-h-full object-contain" />
           <button className="absolute top-10 right-6 text-white text-3xl font-light">✕</button>
        </div>
      )}

      {/* --- СТАТУС ЗАКАЗА --- */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-end animate-fade-in" onClick={() => setIsStatusModalOpen(false)}>
           <div className="bg-white w-full max-w-[480px] mx-auto rounded-t-[3rem] p-10 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-black italic uppercase mb-8 text-center tracking-tighter">СТАТУС ЗАКАЗА</h2>
              <div className="flex gap-2 mb-8">
                 <input type="text" placeholder="НОМЕР ТЕЛЕФОНА..." className="flex-1 bg-zinc-100 p-6 rounded-2xl text-[10px] font-black italic outline-none uppercase" value={checkPhone} onChange={e => setCheckPhone(e.target.value)} />
                 <button onClick={async () => {
                    setIsSearchingOrders(true);
                    const { data } = await supabase.from('orders').select('*').eq('buyer_phone', checkPhone).order('created_at', { ascending: false });
                    setUserOrders(data || []);
                    setHasSearched(true);
                    setIsSearchingOrders(false);
                 }} className="bg-orange-500 text-white px-8 rounded-2xl font-black uppercase italic text-[10px]">{isSearchingOrders ? '...' : 'ОК'}</button>
              </div>
              <div className="space-y-4">
                 {userOrders.map(o => (
                   <div key={o.id} className="bg-zinc-50 p-6 rounded-[2rem] flex justify-between items-center border border-zinc-100">
                      <div>
                        <p className="text-[9px] font-black text-zinc-400 mb-1">ID: {o.id.slice(0,8)}</p>
                        <p className={`font-black uppercase italic text-[10px] ${o.status === 'ЗАВЕРШЕН' ? 'text-zinc-300' : 'text-orange-500'}`}>{o.status}</p>
                      </div>
                      <p className="font-black italic text-sm">{o.price} ₽</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      <style jsx global>{`
        body { -webkit-tap-highlight-color: transparent; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}