'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from './lib/supabase';

/**
 * ПОЛНЫЙ КОД ПРИЛОЖЕНИЯ RA DELL
 * Включает: Магазин, Истории, Корзину, Поиск заказов и Полную Админку.
 */

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

  // --- СОСТОЯНИЯ АДМИНКИ ---
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [sellerAuth, setSellerAuth] = useState({ login: '', pass: '' });
  const [currentSeller, setCurrentSeller] = useState<any>(null);
  const [sellerActiveOrders, setSellerActiveOrders] = useState<any[]>([]);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<'витрина' | 'истории' | 'заказы' | 'архив'>('витрина');

  // --- РЕДАКТИРОВАНИЕ ТОВАРА ---
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // 1. СЛЕДИМ ЗА ПЕРЕХОДОМ В АДМИНКУ (#/admin)
  useEffect(() => {
    const handleHashChange = () => {
      setIsAdminRoute(window.location.hash === '#/admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 2. ЗАГРУЗКА ДАННЫХ ПРИ СТАРТЕ
  async function fetchData() {
    setLoading(true);
    try {
      const [prodRes, storyRes] = await Promise.all([
        supabase.from('product_market').select('*, sellers(id, shop_name)'),
        supabase.from('seller_stories').select('*').order('created_at', { ascending: false })
      ]);
      
      if (prodRes.error) throw prodRes.error;
      if (storyRes.error) throw storyRes.error;

      setProducts(prodRes.data || []);
      setStories(storyRes.data || []);
    } catch (err: any) {
      console.error("Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // 3. ЛОГИКА АВТОРИЗАЦИИ ПРОДАВЦА
  const handleAuth = async () => {
    if (!sellerAuth.login || !sellerAuth.pass) {
      alert("Введите логин и пароль");
      return;
    }
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('login', sellerAuth.login)
        .eq('password', sellerAuth.pass)
        .single();
      
      if (error || !data) throw new Error("Неверные данные для входа");
      setCurrentSeller(data);
    } catch (e: any) { 
      alert(e.message); 
    }
  };

  // 4. ЗАГРУЗКА ДАННЫХ ДЛЯ АДМИН-ПАНЕЛИ
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
    if (!error) setSellerActiveOrders(data || []);
  }

  async function fetchSellerAdminProducts() {
    const { data, error } = await supabase
      .from('product_market')
      .select('*')
      .eq('seller_id', currentSeller.id)
      .order('created_at', { ascending: false });
    if (!error) setSellerProducts(data || []);
  }

  // 5. УПРАВЛЕНИЕ СТАТУСАМИ ЗАКАЗОВ
  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId);
      
      if (error) throw error;
      fetchSellerOrders();
    } catch (err: any) {
      alert("Ошибка обновления статуса: " + err.message);
    }
  };

  // 6. СОХРАНЕНИЕ ИЗМЕНЕНИЙ ТОВАРА (ЦЕНА)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    // Очищаем цену от запятых и лишних символов
    const cleanPrice = String(editingProduct.price).replace(',', '.');
    const newPrice = parseFloat(cleanPrice);

    if (isNaN(newPrice)) {
      alert("Введите корректное число");
      return;
    }

    try {
      const { error } = await supabase
        .from('product_market')
        .update({ price: newPrice })
        .eq('id', editingProduct.id);

      if (error) throw error;

      alert("ИЗМЕНЕНИЯ СОХРАНЕНЫ");
      setIsProductModalOpen(false);
      fetchSellerAdminProducts();
      fetchData();
    } catch (err: any) {
      alert("Ошибка Supabase: " + err.message);
    }
  };

  // 7. ЛОГИКА КОРЗИНЫ
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

  const clearCart = () => setCart([]);
  const getProductCount = (id: string) => cart.filter(item => item.id === id).length;
  const totalPrice = cart.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  // 8. ОФОРМЛЕНИЕ ЗАКАЗА
  const handleCheckout = async () => {
    if (!orderAddress || !checkPhone) { 
      alert("Заполните адрес и телефон!"); 
      return; 
    }
    if (cart.length === 0) return;

    const sellerId = cart[0].seller_id;
    const orderData = {
      seller_id: sellerId,
      customer_phone: checkPhone,
      address: orderAddress,
      total_price: totalPrice,
      status: 'НОВЫЙ',
      items: cart.map(i => ({ name: i.name, price: i.price }))
    };

    try {
      const { error } = await supabase.from('orders').insert([orderData]);
      if (error) throw error;
      
      alert("ЗАКАЗ ПРИНЯТ В ОБРАБОТКУ!");
      setCart([]);
      setIsCartOpen(false);
    } catch (err: any) {
      alert("Ошибка заказа: " + err.message);
    }
  };

  // 9. ПОИСК ЗАКАЗОВ ДЛЯ ПОЛЬЗОВАТЕЛЯ
  const handleCheckOrder = async () => {
    if (!checkPhone) return;
    setIsSearchingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_phone', checkPhone)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUserOrders(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSearchingOrders(false);
    }
  };

  // 10. ФИЛЬТРАЦИЯ
  const categories = useMemo(() => { 
    const cats = products.map(p => p.category || 'Без категории'); 
    return ['Все', ...Array.from(new Set(cats))]; 
  }, [products]);

  const filteredProducts = useMemo(() => products.filter(p => { 
    const nameMatch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()); 
    const categoryMatch = activeCategory === 'Все' || p.category === activeCategory;
    return nameMatch && categoryMatch;
  }), [products, searchQuery, activeCategory]);

  // --- РЕНДЕР ПРИ ЗАГРУЗКЕ ---
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="text-orange-500 text-6xl font-black italic animate-pulse mb-4 tracking-tighter">RA DELL</div>
        <div className="text-white/20 text-[10px] font-black uppercase tracking-[0.5em]">System Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F1F1] text-black font-sans selection:bg-orange-500 selection:text-white">
      
      {/* =========================================
          АДМИН-ПАНЕЛЬ (ТЕМНАЯ)
          ========================================= */}
      {isAdminRoute && (
        <div className="fixed inset-0 z-[1000] bg-[#0A0A0A] text-white overflow-y-auto custom-scroll">
          {!currentSeller ? (
            <div className="max-w-[420px] mx-auto pt-32 px-8">
              <div className="text-center mb-12">
                <h1 className="text-5xl font-black italic text-orange-500 uppercase tracking-tighter leading-none mb-2">DARK<br/>ADMIN</h1>
                <p className="text-white/20 text-[9px] font-black uppercase tracking-widest">Authorized Access Only</p>
              </div>
              <div className="space-y-4">
                <div className="group">
                  <input type="text" placeholder="ЛОГИН" className="w-full bg-[#151515] p-6 rounded-[2rem] border border-white/5 outline-none focus:border-orange-500/50 transition-all text-sm font-bold" onChange={e => setSellerAuth({...sellerAuth, login: e.target.value})}/>
                </div>
                <div className="group">
                  <input type="password" placeholder="ПАРОЛЬ" className="w-full bg-[#151515] p-6 rounded-[2rem] border border-white/5 outline-none focus:border-orange-500/50 transition-all text-sm font-bold" onChange={e => setSellerAuth({...sellerAuth, pass: e.target.value})}/>
                </div>
                <button onClick={handleAuth} className="w-full bg-orange-500 hover:bg-orange-600 py-6 rounded-[2.5rem] font-black italic uppercase text-lg shadow-2xl shadow-orange-500/20 active:scale-95 transition-all mt-4">ВОЙТИ В СИСТЕМУ</button>
              </div>
            </div>
          ) : (
            <div className="p-6 max-w-[600px] mx-auto pb-32">
              <header className="flex justify-between items-end mb-12 border-b border-white/5 pb-8">
                <div>
                  <p className="text-orange-500 text-[10px] font-black uppercase mb-1 tracking-widest">Панель управления</p>
                  <h2 className="text-3xl font-black italic uppercase leading-none">{currentSeller.shop_name}</h2>
                </div>
                <button onClick={() => setCurrentSeller(null)} className="bg-white/5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-red-500 transition-colors">Выйти</button>
              </header>

              {/* Табы админки */}
              <nav className="flex bg-[#151515] p-2 rounded-[2.5rem] mb-10 gap-2 border border-white/5">
                {['витрина', 'заказы', 'архив'].map(tab => (
                  <button key={tab} onClick={() => setAdminTab(tab as any)} className={`flex-1 py-4 rounded-[2rem] text-[11px] font-black uppercase italic transition-all ${adminTab === tab ? 'bg-orange-500 text-white shadow-xl' : 'text-zinc-600 hover:text-white'}`}>{tab}</button>
                ))}
              </nav>

              {/* Контент Табов */}
              <div className="space-y-6">
                {adminTab === 'витрина' && sellerProducts.map(p => (
                  <div key={p.id} className="bg-[#121212] p-5 rounded-[2.5rem] flex items-center gap-6 border border-white/5 group hover:border-orange-500/30 transition-all">
                    <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden shadow-2xl">
                      <img src={p.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black italic uppercase text-[12px] text-zinc-400 mb-1">{p.name}</h4>
                      <p className="text-orange-500 font-black italic text-2xl tracking-tighter">{p.price} ₽</p>
                    </div>
                    <button onClick={() => { setEditingProduct({...p}); setIsProductModalOpen(true); }} className="bg-white/5 w-14 h-14 rounded-2xl flex items-center justify-center text-xl hover:bg-orange-500 transition-all">✏️</button>
                  </div>
                ))}

                {adminTab === 'заказы' && sellerActiveOrders.filter(o => o.status !== 'ЗАВЕРШЕН').map(o => (
                  <div key={o.id} className="bg-[#121212] p-8 rounded-[3rem] border border-white/5 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 bg-orange-500 px-6 py-2 rounded-bl-[1.5rem] text-[9px] font-black uppercase italic">Новый заказ</div>
                    <div className="grid grid-cols-2 gap-8 mb-8">
                      <div>
                        <span className="text-zinc-600 text-[9px] font-black uppercase block mb-2">Контакт:</span>
                        <p className="text-xl font-black italic tracking-tight">{o.customer_phone}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-600 text-[9px] font-black uppercase block mb-2">Сумма:</span>
                        <p className="text-2xl font-black italic text-orange-500 leading-none">{o.total_price} ₽</p>
                      </div>
                    </div>
                    <div className="mb-8">
                      <span className="text-zinc-600 text-[9px] font-black uppercase block mb-2">Адрес доставки:</span>
                      <p className="text-zinc-400 text-xs font-bold leading-relaxed uppercase">{o.address}</p>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => handleUpdateStatus(o.id, 'ГОТОВИТСЯ')} className="flex-1 bg-white/5 py-5 rounded-[1.5rem] text-[10px] font-black uppercase hover:bg-zinc-800 transition-all">В работу</button>
                      <button onClick={() => handleUpdateStatus(o.id, 'ЗАВЕРШЕН')} className="flex-1 bg-orange-500 py-5 rounded-[1.5rem] text-[10px] font-black uppercase shadow-lg shadow-orange-500/20 active:scale-95 transition-all">Завершить</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================
          МАГАЗИН (СВЕТЛЫЙ ДИЗАЙН)
          ========================================= */}
      <div className="max-w-[500px] mx-auto bg-white min-h-screen shadow-[0_0_100px_rgba(0,0,0,0.05)] relative border-x border-zinc-100">
        
        {/* Фиксированный Хедер */}
        <header className="p-6 sticky top-0 z-[100] bg-white/95 backdrop-blur-xl border-b border-zinc-50">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsStatusModalOpen(true)} className="bg-zinc-100 h-14 px-6 rounded-2xl text-[9px] font-black uppercase italic text-zinc-400 hover:bg-zinc-200 transition-all">Status</button>
            <div className="flex-1 relative">
              <input type="text" placeholder="ПОИСК ПО МЕНЮ..." className="w-full bg-zinc-100 h-14 px-6 rounded-2xl text-[11px] font-black italic outline-none border-none uppercase placeholder:text-zinc-300" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <button onClick={() => setIsCartOpen(true)} className={`relative bg-black text-white h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${cartBumping ? 'scale-115 shadow-2xl' : 'hover:scale-105'}`}>
               <span className="text-xl">🛒</span>
               {cart.length > 0 && (
                 <span className="absolute -top-1 -right-1 bg-orange-500 w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-black border-[3px] border-white animate-bounce">{cart.length}</span>
               )}
            </button>
          </div>
        </header>

        {/* Секция Историй */}
        <div className="flex gap-5 px-6 mt-8 mb-12 overflow-x-auto no-scrollbar py-2">
          {stories.map(s => (
            <div key={s.id} onClick={() => setSelectedStory(s.media_url)} className="flex-shrink-0 text-center group cursor-pointer">
              <div className="w-[76px] h-[76px] rounded-full p-[3px] border-2 border-orange-500 group-active:scale-90 transition-all duration-300 mb-2">
                <img src={s.media_url} className="w-full h-full rounded-full object-cover shadow-xl" />
              </div>
              <span className="text-[8px] font-black uppercase text-zinc-400 italic">Story</span>
            </div>
          ))}
        </div>

        {/* Горизонтальные категории */}
        <div className="flex gap-2 px-6 mb-10 overflow-x-auto no-scrollbar pb-2">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-8 py-3.5 rounded-full text-[10px] font-black uppercase italic whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-black text-white shadow-xl translate-y-[-2px]' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}>{cat}</button>
          ))}
        </div>

        {/* Сетка товаров */}
        <main className="px-6 grid grid-cols-2 gap-5 pb-32">
          {filteredProducts.map(p => {
            const count = getProductCount(p.id);
            return (
              <div key={p.id} className="bg-white rounded-[2.8rem] p-3 border border-zinc-100 shadow-sm hover:shadow-2xl transition-all duration-500 group">
                <div className="relative aspect-square rounded-[2.2rem] overflow-hidden mb-5">
                  <img src={p.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute bottom-3 right-3 bg-black/90 backdrop-blur-md text-white px-5 py-2 rounded-full text-[12px] font-black italic tracking-tighter">{p.price} ₽</div>
                </div>
                <div className="px-3 text-center">
                  <h3 className="text-[10px] font-black italic h-9 line-clamp-2 leading-tight mb-5 uppercase tracking-tighter text-zinc-800">{p.name}</h3>
                  {count === 0 ? (
                    <button onClick={() => addToCart(p)} className="w-full py-4.5 bg-black text-white rounded-[1.5rem] text-[9px] font-black uppercase italic active:scale-95 transition-all shadow-lg hover:bg-orange-500">В КОРЗИНУ</button>
                  ) : (
                    <div className="flex items-center bg-zinc-100 rounded-[1.5rem] overflow-hidden h-[48px] border border-zinc-200/50">
                      <button onClick={() => removeFromCartOnce(p.id)} className="flex-1 font-black text-zinc-400 text-xl active:bg-zinc-200 transition-colors">-</button>
                      <span className="text-[12px] font-black px-4">{count}</span>
                      <button onClick={() => addToCart(p)} className="flex-1 font-black text-xl active:bg-zinc-200 transition-colors">+</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </main>
      </div>

      {/* =========================================
          МОДАЛЬНЫЕ ОКНА И КОРЗИНА
          ========================================= */}

      {/* КОРЗИНА (SIDE DRAWER) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[1500] bg-black/40 backdrop-blur-md flex justify-end" onClick={() => setIsCartOpen(false)}>
          <div className="w-full max-w-[440px] bg-white h-full shadow-2xl flex flex-col p-10 animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-4xl font-black italic uppercase tracking-tighter">Корзина</h2>
              <button onClick={() => setIsCartOpen(false)} className="bg-zinc-100 w-12 h-12 rounded-full flex items-center justify-center font-black text-2xl">×</button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll space-y-8 pr-2">
              {cart.length === 0 ? (
                <div className="text-center py-32">
                  <span className="text-8xl block mb-6 grayscale opacity-20">🛒</span>
                  <p className="opacity-20 font-black italic uppercase text-2xl tracking-widest">Пусто</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-6 group">
                    <img src={item.image_url} className="w-20 h-20 rounded-[1.5rem] object-cover shadow-lg" />
                    <div className="flex-1">
                      <h4 className="font-black italic uppercase text-[11px] leading-tight mb-1 text-zinc-800">{item.name}</h4>
                      <p className="font-black italic text-orange-500 text-lg tracking-tighter">{item.price} ₽</p>
                    </div>
                    <button onClick={() => removeFromCartOnce(item.id)} className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-300 hover:text-red-500 transition-colors">×</button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-10 border-t border-zinc-100 space-y-5">
                 <div className="space-y-3">
                    <input type="text" placeholder="ТЕЛЕФОН" className="w-full bg-zinc-100 p-6 rounded-[1.5rem] font-black outline-none uppercase text-[12px] border-2 border-transparent focus:border-black/5 transition-all" value={checkPhone} onChange={e => setCheckPhone(e.target.value)} />
                    <input type="text" placeholder="АДРЕС ДОСТАВКИ" className="w-full bg-zinc-100 p-6 rounded-[1.5rem] font-black outline-none uppercase text-[12px] border-2 border-transparent focus:border-black/5 transition-all" value={orderAddress} onChange={e => setOrderAddress(e.target.value)} />
                 </div>
                 <div className="flex justify-between items-end pt-4 px-2">
                   <span className="text-[11px] font-black text-zinc-300 uppercase tracking-widest">Итого к оплате:</span>
                   <span className="text-4xl font-black italic tracking-tighter">{totalPrice} ₽</span>
                 </div>
                 <button onClick={handleCheckout} className="w-full bg-black hover:bg-orange-500 text-white py-7 rounded-[2.5rem] font-black italic uppercase text-xl shadow-2xl transition-all active:scale-95">ОФОРМИТЬ ЗАКАЗ</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* РЕДАКТИРОВАНИЕ ЦЕНЫ (АДМИНКА) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="bg-[#151515] w-full max-w-[400px] rounded-[3.5rem] p-12 border border-white/5 shadow-2xl shadow-orange-500/5">
            <h3 className="text-orange-500 font-black italic uppercase mb-10 text-center text-xl tracking-tighter">
               РЕДАКТИРОВАНИЕ<br/>СТОИМОСТИ
            </h3>
            <form onSubmit={handleSaveProduct}>
              <div className="bg-black p-8 rounded-[2rem] mb-10 border border-white/5 shadow-inner">
                <span className="text-[10px] font-black text-zinc-700 block mb-4 uppercase tracking-[0.2em] text-center">Укажите новую сумму (₽)</span>
                <input type="number" className="w-full bg-transparent text-white text-6xl font-black outline-none tracking-tighter text-center" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} autoFocus />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 bg-zinc-900 py-6 rounded-[2rem] font-black uppercase text-[11px] text-zinc-600 italic tracking-widest hover:text-white transition-colors">ОТМЕНА</button>
                <button type="submit" className="flex-[2] bg-orange-500 py-6 rounded-[2rem] font-black uppercase text-[11px] shadow-2xl shadow-orange-500/20 italic tracking-widest active:scale-95 transition-all">СОХРАНИТЬ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* СТАТУС ЗАКАЗА (ДЛЯ КЛИЕНТА) */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setIsStatusModalOpen(false)}>
          <div className="bg-white w-full max-w-[420px] rounded-[3.5rem] p-12 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-10">
              <h3 className="text-black font-black italic uppercase text-3xl tracking-tighter leading-none mb-3">ГДЕ МОЙ<br/>ЗАКАЗ?</h3>
              <p className="text-zinc-300 text-[10px] font-black uppercase tracking-widest">Проверка по номеру телефона</p>
            </div>
            <div className="flex gap-3 mb-10">
              <input type="text" placeholder="8 (___) ___ - __ - __" className="flex-1 bg-zinc-100 p-6 rounded-[1.8rem] font-black outline-none uppercase text-[13px] border-none" value={checkPhone} onChange={e => setCheckPhone(e.target.value)} />
              <button onClick={handleCheckOrder} className="bg-black text-white px-8 rounded-[1.8rem] font-black italic uppercase text-[10px] shadow-xl hover:bg-orange-500 active:scale-95 transition-all">Найти</button>
            </div>
            <div className="space-y-5 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
              {isSearchingOrders ? ( 
                <div className="py-20 flex flex-col items-center">
                  <div className="w-10 h-10 border-4 border-zinc-100 border-t-orange-500 rounded-full animate-spin mb-4"></div>
                  <p className="font-black italic uppercase text-[10px] text-zinc-300 tracking-widest">Синхронизация...</p>
                </div>
              ) : userOrders.length > 0 ? (
                userOrders.map((o: any) => (
                  <div key={o.id} className="bg-zinc-50 p-7 rounded-[2.5rem] border border-zinc-100 hover:scale-[1.02] transition-transform">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black uppercase text-zinc-300 tracking-tighter">Заказ ID: {o.id.slice(0,8)}</span>
                      <span className="bg-black text-white text-[9px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest">{o.status}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <p className="font-black italic text-3xl tracking-tighter text-zinc-900">{o.total_price} ₽</p>
                      <span className="text-[9px] font-black text-orange-500 uppercase italic mb-1">Смотреть детали</span>
                    </div>
                  </div>
                ))
              ) : checkPhone && (
                <div className="text-center py-20 bg-zinc-50 rounded-[2.5rem] border-2 border-dashed border-zinc-100">
                  <p className="text-[11px] font-black text-zinc-300 uppercase italic tracking-widest">История заказов пуста</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ГЛОБАЛЬНЫЕ СТИЛИ --- */}
      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in { animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        body { background: #F1F1F1; -webkit-tap-highlight-color: transparent; }
      `}</style>

    </div>
  );
}