'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from './lib/supabase';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  discount: number;
  category: string;
  seller_id: string;
  sellers?: { id: string; shop_name: string };
}

interface CartItem {
  product: Product & { effectivePrice?: number };
  quantity: number;
}

interface Story {
  id: string;
  media_url: string;
  created_at: string;
}

interface Order {
  id: string;
  seller_id: string;
  buyer_phone: string;
  address: string;
  total_price: number;
  status: string;
  product_name: string;
  created_at: string;
}

interface Seller {
  id: string;
  login: string;
  password: string;
  shop_name: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Все');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [checkPhone, setCheckPhone] = useState('');
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isSearchingOrders, setIsSearchingOrders] = useState(false);
  const [orderAddress, setOrderAddress] = useState('');
  const [viewingSeller, setViewingSeller] = useState<Seller | null>(null);
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [sellerAuth, setSellerAuth] = useState({ login: '', pass: '' });
  const [currentSeller, setCurrentSeller] = useState<Seller | null>(null);
  const [sellerActiveOrders, setSellerActiveOrders] = useState<Order[]>([]);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [adminTab, setAdminTab] = useState<'витрина' | 'заказы' | 'архив'>('витрина');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', image_url: '', discount: '' });
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    if (diffX < -50 && Math.abs(diffY) < 50) {
      if (viewingSeller) setViewingSeller(null);
      if (isCartOpen) setIsCartOpen(false);
      if (isStatusModalOpen) setIsStatusModalOpen(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('radell_cart');
    if (saved) setCart(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('radell_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const handleHashChange = () => setIsAdminRoute(window.location.hash === '#/admin');
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [prodRes, storyRes] = await Promise.all([
        supabase.from('product_market').select('*, sellers(shop_name, id)'),
        supabase.from('seller_stories').select('*').order('created_at', { ascending: false })
      ]);
      
      // Устанавливаем данные даже если есть ошибка, но устанавливаем пустой массив
      setProducts(prodRes.data || []);
      setStories(storyRes.data || []);
      
      if (prodRes.error) console.warn('Ошибка загрузки товаров:', prodRes.error.message);
      if (storyRes.error) console.warn('Ошибка загрузки историй:', storyRes.error.message);
    } catch (err) {
      console.error('Ошибка при загрузке данных:', err);
      setProducts([]);
      setStories([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleAuth = async () => {
    if (!sellerAuth.login || !sellerAuth.pass) {
      alert('Введите логин и пароль');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('login', sellerAuth.login)
        .eq('password', sellerAuth.pass);
      
      if (error) {
        console.error('Ошибка входа:', error.message);
        alert(`Ошибка: ${error.message}`);
      } else if (!data || data.length === 0) {
        alert('Неверный логин или пароль');
      } else {
        setCurrentSeller(data[0] as Seller);
        setSellerAuth({ login: '', pass: '' });
      }
    } catch (err) {
      console.error('Ошибка при входе:', err);
      alert('Ошибка подключения к серверу');
    }
  };

  useEffect(() => {
    if (currentSeller) {
      fetchSellerOrders();
      fetchSellerAdminProducts();
    }
  }, [currentSeller, adminTab]);

  async function fetchSellerOrders() {
    if (!currentSeller) return;
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('seller_id', currentSeller.id)
      .order('created_at', { ascending: false });
    if (data) setSellerActiveOrders(data as Order[]);
  }

  async function fetchSellerAdminProducts() {
    if (!currentSeller) return;
    const { data } = await supabase.from('product_market').select('*').eq('seller_id', currentSeller.id);
    if (data) setSellerProducts(data as Product[]);
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchSellerOrders();
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const newPrice = parseFloat(String(editingProduct.price));
    if (isNaN(newPrice)) return alert('Некорректная цена');
    await supabase.from('product_market').update({ price: newPrice }).eq('id', editingProduct.id);
    setIsProductModalOpen(false);
    fetchSellerAdminProducts();
    fetchData();
  };

  const handleAddProduct = async () => {
    if (!currentSeller || !newProduct.name.trim() || !newProduct.price.trim() || !newProduct.image_url.trim()) {
      return alert('Заполните все поля!');
    }
    const price = parseFloat(newProduct.price);
    if (isNaN(price)) return alert('Некорректная цена');
    const discount = newProduct.discount ? parseFloat(newProduct.discount) : null;
    await supabase.from('product_market').insert({
      seller_id: currentSeller.id,
      name: newProduct.name.trim(),
      price,
      image_url: newProduct.image_url.trim(),
      discount,
      category: 'Меню'
    });
    setIsAddProductModalOpen(false);
    setNewProduct({ name: '', price: '', image_url: '', discount: '' });
    fetchSellerAdminProducts();
    fetchData();
  };

  const addToCart = (product: Product) => {
    const effectivePrice = product.discount > 0 ? Math.round(product.price * (1 - product.discount / 100)) : product.price;
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { product: { ...product, effectivePrice }, quantity: 1 }];
    });
  };

  const decreaseQuantity = (id: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === id);
      if (!existing) return prev;
      return existing.quantity > 1 ? prev.map(item => (item.product.id === id ? { ...item, quantity: item.quantity - 1 } : item)) : prev.filter(item => item.product.id !== id);
    });
  };

  const clearCart = () => {
    if (confirm('Очистить корзину?')) setCart([]);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.product.effectivePrice || item.product.price) * item.quantity, 0);

  const handleCheckout = async () => {
    if (!orderAddress || !checkPhone) return alert('Заполните телефон и адрес!');
    if (cart.length === 0) return alert('Корзина пуста');
    const groups = new Map<string, CartItem[]>();
    cart.forEach(item => {
      const sellerId = item.product.seller_id;
      if (!groups.has(sellerId)) groups.set(sellerId, []);
      groups.get(sellerId)!.push(item);
    });
    const orders = Array.from(groups).map(([sellerId, items]) => ({
      seller_id: sellerId,
      buyer_phone: checkPhone,
      address: orderAddress,
      total_price: items.reduce((sum, i) => sum + (i.product.effectivePrice || i.product.price) * i.quantity, 0),
      status: 'НОВЫЙ',
      product_name: items.map(i => `${i.product.name} x${i.quantity}`).join(', ')
    }));
    await supabase.from('orders').insert(orders);
    setCart([]);
    setIsCartOpen(false);
    setOrderAddress('');
    setCheckPhone('');
    alert('Заказ отправлен!');
  };

  const handleCheckOrder = async () => {
    if (!checkPhone) return;
    setIsSearchingOrders(true);
    const { data } = await supabase.from('orders').select('*').eq('buyer_phone', checkPhone).order('created_at', { ascending: false });
    setUserOrders((data as Order[]) || []);
    setIsSearchingOrders(false);
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category || 'Меню'));
    return ['Все', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) && (activeCategory === 'Все' || p.category === activeCategory));

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl font-black mb-12 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-bounce">RA DELL</div>
          <div className="w-64 h-2 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full overflow-hidden shadow-2xl shadow-purple-500/50">
            <div className="h-full bg-white animate-loading-bar"></div>
          </div>
          <p className="mt-8 text-purple-300 font-bold text-lg">Маркетплейс будущего</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* АДМИНКА */}
      {isAdminRoute && (
        <div className="fixed inset-0 z-[1000] bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white overflow-y-auto p-6">
          {!currentSeller ? (
            <div className="max-w-md mx-auto pt-20">
              <h1 className="text-8xl font-black italic bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-4 text-center">Admin</h1>
              <p className="text-center text-purple-300 text-sm mb-12 font-bold">MARKETPLACE TERMINAL v2.0</p>
              <div className="space-y-4">
                <input type="text" placeholder="LOGIN" className="w-full bg-slate-800/50 p-4 rounded-xl border border-purple-500/30 outline-none focus:border-cyan-500 focus:shadow-lg focus:shadow-cyan-500/20 font-bold text-sm backdrop-blur" onChange={e => setSellerAuth({ ...sellerAuth, login: e.target.value })} />
                <input type="password" placeholder="PASSWORD" className="w-full bg-slate-800/50 p-4 rounded-xl border border-purple-500/30 outline-none focus:border-cyan-500 focus:shadow-lg focus:shadow-cyan-500/20 font-bold text-sm backdrop-blur" onChange={e => setSellerAuth({ ...sellerAuth, pass: e.target.value })} />
                <button onClick={handleAuth} className="w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white py-4 rounded-xl font-black uppercase text-lg shadow-2xl shadow-purple-500/50 hover:shadow-cyan-500/50 active:scale-95 transition-all">ENTER SYSTEM</button>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="mb-12">
                <h2 className="text-4xl font-black italic bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">{currentSeller.shop_name}</h2>
                <button onClick={() => setCurrentSeller(null)} className="text-xs uppercase font-bold mt-4 px-4 py-2 border border-slate-600 rounded hover:bg-slate-800">Logout</button>
              </div>
              <div className="flex gap-2 mb-8 bg-slate-800 p-2 rounded-lg">
                {(['витрина', 'заказы', 'архив'] as const).map(tab => (
                  <button key={tab} onClick={() => setAdminTab(tab)} className={`flex-1 py-3 rounded font-bold uppercase text-xs ${adminTab === tab ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'text-slate-400'}`}>
                    {tab}
                  </button>
                ))}
              </div>
              {adminTab === 'витрина' && (
                <button onClick={() => setIsAddProductModalOpen(true)} className="mb-8 bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 rounded-lg font-bold uppercase text-sm">+ Товар</button>
              )}
              <div className="grid gap-6">
                {adminTab === 'витрина' && sellerProducts.map(p => {
                  const price = p.discount > 0 ? Math.round(p.price * (1 - p.discount / 100)) : p.price;
                  return (
                    <div key={p.id} className="bg-slate-800 p-6 rounded-xl flex items-center gap-6 border border-purple-500/20">
                      <img src={p.image_url} className="w-24 h-24 rounded-lg object-cover" alt={p.name} />
                      <div className="flex-1">
                        <h4 className="font-bold text-sm mb-2">{p.name}</h4>
                        <p className="text-purple-400 font-bold">{price}₽</p>
                      </div>
                      <button onClick={() => { setEditingProduct({ ...p }); setIsProductModalOpen(true); }} className="text-2xl">✏️</button>
                    </div>
                  );
                })}
                {adminTab === 'заказы' && sellerActiveOrders.filter(o => o.status !== 'ЗАВЕРШЕН').map(o => (
                  <div key={o.id} className="bg-slate-800 p-6 rounded-xl border border-purple-500/20">
                    <p className="font-bold text-white mb-2">{o.buyer_phone}</p>
                    <p className="text-slate-400 text-sm mb-4">{o.address}</p>
                    <div className="flex gap-3">
                      <button onClick={() => handleUpdateStatus(o.id, 'ГОТОВИТСЯ')} className="flex-1 bg-slate-700 py-2 rounded text-xs uppercase font-bold">В работу</button>
                      <button onClick={() => handleUpdateStatus(o.id, 'ЗАВЕРШЕН')} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 py-2 rounded text-xs uppercase font-bold">Готово</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isAddProductModalOpen && (
            <div className="fixed inset-0 z-[2100] bg-black/80 flex items-center justify-center p-4">
              <div className="bg-slate-800 w-full max-w-md rounded-xl p-8 border border-purple-500/30">
                <h3 className="text-2xl font-bold italic bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-8">Новый товар</h3>
                <div className="space-y-4">
                  <input type="text" placeholder="Изображение URL" value={newProduct.image_url} onChange={e => setNewProduct({ ...newProduct, image_url: e.target.value })} className="w-full bg-slate-700 p-3 rounded-lg border border-slate-600 outline-none focus:border-purple-500 text-sm" />
                  <input type="text" placeholder="Название" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full bg-slate-700 p-3 rounded-lg border border-slate-600 outline-none focus:border-purple-500 text-sm" />
                  <input type="number" placeholder="Цена" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} className="w-full bg-slate-700 p-3 rounded-lg border border-slate-600 outline-none focus:border-purple-500 text-sm" />
                  <input type="number" placeholder="Скидка %" value={newProduct.discount} onChange={e => setNewProduct({ ...newProduct, discount: e.target.value })} className="w-full bg-slate-700 p-3 rounded-lg border border-slate-600 outline-none focus:border-purple-500 text-sm" />
                  <button onClick={handleAddProduct} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-3 rounded-lg font-bold uppercase text-sm">Добавить</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ГЛАВНЫЙ САЙТ */}
      <div className="min-h-screen">
        <header className="sticky top-0 z-[100] bg-slate-900/80 backdrop-blur-xl border-b border-purple-500/20 p-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-4xl font-black italic bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-lg">RA DELL</h1>
              <div className="flex gap-4">
                <button onClick={() => setIsStatusModalOpen(true)} className="text-3xl hover:scale-125 transition-transform duration-300 drop-shadow-lg">📦</button>
                <button onClick={() => setIsCartOpen(true)} className="relative text-3xl hover:scale-125 transition-transform duration-300 drop-shadow-lg">
                  🛒{totalItems > 0 && <span className="absolute -top-2 -right-2 bg-gradient-to-r from-cyan-500 to-pink-500 text-white w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shadow-lg">{totalItems}</span>}
                </button>
              </div>
            </div>
            <div className="relative">
              <input type="text" placeholder="Поиск товаров..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full px-4 py-3 bg-slate-800/50 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 backdrop-blur border border-purple-500/20 text-white placeholder-slate-400" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2">🔍</span>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex gap-3 overflow-x-auto pb-4 mb-8 scrollbar-hide">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white shadow-xl shadow-purple-500/30 scale-105' : 'bg-slate-800/50 border border-purple-500/20 text-slate-200 hover:bg-slate-800'}`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pb-32">
            {filteredProducts.map(p => {
              const cartItem = cart.find(item => item.product.id === p.id);
              const count = cartItem?.quantity || 0;
              const hasDiscount = p.discount > 0;
              const displayPrice = hasDiscount ? Math.round(p.price * (1 - p.discount / 100)) : p.price;
              return (
                <div key={p.id} className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 backdrop-blur border border-purple-500/20 hover:border-purple-500/50 hover:-translate-y-2">
                  <div className="relative aspect-square overflow-hidden bg-slate-800">
                    <img src={p.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name} />
                    {hasDiscount && <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg">-{p.discount}%</div>}
                    <div className="absolute bottom-3 left-3 right-3 bg-slate-900/80 backdrop-blur px-3 py-2 rounded-lg border border-purple-500/30">
                      {hasDiscount ? (
                        <>
                          <del className="text-slate-400 text-xs block">{p.price}₽</del>
                          <div className="text-lg text-cyan-400 font-black">{displayPrice}₽</div>
                        </>
                      ) : (
                        <div className="text-lg text-cyan-400 font-black">{p.price}₽</div>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <button onClick={() => setViewingSeller(p.sellers ? { ...p.sellers, login: '', password: '' } : null)} className="text-xs font-bold text-cyan-400 hover:text-pink-400 transition-colors mb-2 block w-full text-center">{p.sellers?.shop_name || 'Магазин'}</button>
                    <h3 className="text-xs font-black uppercase line-clamp-2 mb-3 text-center h-8 flex items-center justify-center text-purple-100">{p.name}</h3>
                    {count === 0 ? (
                      <button onClick={() => addToCart(p)} className="w-full py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg text-xs font-black uppercase hover:shadow-lg hover:shadow-purple-500/30 active:scale-95 transition-all">В корзину</button>
                    ) : (
                      <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-1 border border-purple-500/20">
                        <button onClick={() => decreaseQuantity(p.id)} className="flex-1 font-black text-cyan-400 hover:text-white transition-colors">−</button>
                        <span className="flex-1 text-center font-black text-sm text-white">{count}</span>
                        <button onClick={() => addToCart(p)} className="flex-1 font-black text-cyan-400 hover:text-white transition-colors">+</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ВИТРИНА ПРОДАВЦА */}
      {viewingSeller && (
        <div className="fixed inset-0 z-[1200] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-y-auto">
          <header className="sticky top-0 bg-slate-900/80 backdrop-blur-xl border-b border-purple-500/20 p-4 flex justify-between items-center">
            <h2 className="text-2xl font-black italic bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">{viewingSeller.shop_name}</h2>
            <button onClick={() => setViewingSeller(null)} className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white w-10 h-10 rounded-full font-bold hover:scale-110 transition-transform">←</button>
          </header>
          <div className="max-w-6xl mx-auto p-4 pb-20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {products.filter(p => p.seller_id === viewingSeller.id).map(p => {
                const cartItem = cart.find(item => item.product.id === p.id);
                const count = cartItem?.quantity || 0;
                const hasDiscount = p.discount > 0;
                const displayPrice = hasDiscount ? Math.round(p.price * (1 - p.discount / 100)) : p.price;
                return (
                  <div key={p.id} className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl overflow-hidden shadow-xl hover:shadow-purple-500/30 transition-all backdrop-blur border border-purple-500/20 hover:border-purple-500/50">
                    <div className="relative aspect-square bg-slate-800 overflow-hidden">
                      <img src={p.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name} />
                      {hasDiscount && <div className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-black">-{p.discount}%</div>}
                      <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur px-2 py-1 rounded">
                        {hasDiscount ? (<><del className="text-slate-400 text-xs">{p.price}₽</del><div className="text-cyan-400 font-bold">{displayPrice}₽</div></>) : (<div className="text-cyan-400 font-bold">{p.price}₽</div>)}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-xs font-bold line-clamp-2 mb-2 text-center text-purple-100">{p.name}</h3>
                      {count === 0 ? (
                        <button onClick={() => addToCart(p)} className="w-full py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg text-xs font-bold">В корзину</button>
                      ) : (
                        <div className="flex items-center gap-1 bg-slate-700/50 rounded p-1 border border-purple-500/20">
                          <button onClick={() => decreaseQuantity(p.id)} className="flex-1 font-bold text-cyan-400">−</button>
                          <span className="flex-1 text-center font-bold text-xs text-white">{count}</span>
                          <button onClick={() => addToCart(p)} className="flex-1 font-bold text-cyan-400">+</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* МОИ ЗАКАЗЫ */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col" onClick={() => setIsStatusModalOpen(false)}>
          <div className="flex-1 flex flex-col px-4 pt-12" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setIsStatusModalOpen(false)} className="text-2xl text-cyan-400 hover:text-pink-400 transition-colors">←</button>
              <h2 className="text-xl font-black bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">Мои заказы</h2>
              <div />
            </div>
            <div className="flex gap-3 mb-8">
              <input type="text" placeholder="Номер телефона..." className="flex-1 h-14 bg-slate-800/50 rounded-xl px-4 outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 backdrop-blur text-white placeholder-slate-400" value={checkPhone} onChange={e => setCheckPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCheckOrder()} autoFocus />
              <button onClick={() => { setIsStatusModalOpen(false); setIsCartOpen(true); }} className="w-14 h-14 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl text-2xl hover:shadow-lg hover:shadow-purple-500/30 transition-all">🛒</button>
            </div>
            {isSearchingOrders && <div className="flex-1 flex items-center justify-center"><div className="w-12 h-12 border-4 border-purple-500/30 border-t-cyan-400 rounded-full animate-spin"></div></div>}
            {userOrders.length > 0 && (
              <div className="flex-1 overflow-y-auto space-y-4 pb-20">
                {userOrders.map(order => (
                  <div key={order.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 rounded-2xl border border-purple-500/20 backdrop-blur hover:border-purple-500/50 transition-all">
                    <p className="text-xs font-bold text-purple-400 mb-2 uppercase">Заказ #{String(order.id).slice(0, 8)}</p>
                    <p className="font-black text-4xl bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent mb-3">{order.total_price}₽</p>
                    <p className="text-sm text-slate-200 mb-2">{order.product_name}</p>
                    <p className="text-xs text-slate-400">📍 {order.address}</p>
                    <p className="text-xs text-cyan-400 font-bold mt-3">Статус: {order.status}</p>
                  </div>
                ))}
              </div>
            )}
            {checkPhone && !isSearchingOrders && userOrders.length === 0 && <div className="flex-1 flex items-center justify-center text-slate-400 text-lg">Заказы не найдены</div>}
          </div>
        </div>
      )}

      {/* КОРЗИНА */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[1500] bg-black/60 backdrop-blur-md flex items-end justify-center" onClick={() => setIsCartOpen(false)}>
          <div className="w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-t-3xl shadow-2xl shadow-purple-500/50 flex flex-col p-6 max-h-[90vh] border-t border-purple-500/20" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-6" />
            <div className="flex justify-between items-center mb-6">
              {cart.length > 0 && <button onClick={clearCart} className="text-xs font-bold text-cyan-400 hover:text-pink-400 transition-colors uppercase">Очистить</button>}
              <h2 className="flex-1 text-center text-lg font-black bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">Корзина</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-2xl text-slate-400 hover:text-slate-200 transition-colors">×</button>
            </div>
            <div className="flex-1 overflow-y-auto pb-20 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4 opacity-30">🛒</div>
                  <p className="font-bold text-slate-400">Корзина пуста</p>
                </div>
              ) : (
                cart.map(cartItem => (
                  <div key={cartItem.product.id} className="flex items-center gap-4 py-4 px-3 rounded-xl bg-slate-800/50 border border-purple-500/20 backdrop-blur hover:border-purple-500/50 transition-all">
                    <img src={cartItem.product.image_url} className="w-16 h-16 rounded-lg object-cover shadow-lg" alt={cartItem.product.name} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold uppercase text-xs text-purple-100 line-clamp-2">{cartItem.product.name}</h4>
                      <p className="text-sm font-black bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">{cartItem.product.effectivePrice || cartItem.product.price}₽</p>
                    </div>
                    <div className="flex items-center bg-slate-700/50 rounded-lg h-10 border border-purple-500/20">
                      <button onClick={() => decreaseQuantity(cartItem.product.id)} className="w-10 font-black text-cyan-400 hover:text-white transition-colors">−</button>
                      <span className="w-10 text-center font-bold text-sm text-white">{cartItem.quantity}</span>
                      <button onClick={() => addToCart(cartItem.product)} className="w-10 font-black text-cyan-400 hover:text-white transition-colors">+</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t border-purple-500/20 pt-6 space-y-4 bg-slate-900/50 -mx-6 -mb-6 px-6 py-6 rounded-b-3xl backdrop-blur">
                <input type="text" placeholder="Телефон" className="w-full bg-slate-800/50 px-4 py-3 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 backdrop-blur text-white placeholder-slate-400" value={checkPhone} onChange={e => setCheckPhone(e.target.value)} />
                <input type="text" placeholder="Адрес доставки" className="w-full bg-slate-800/50 px-4 py-3 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 backdrop-blur text-white placeholder-slate-400" value={orderAddress} onChange={e => setOrderAddress(e.target.value)} />
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-slate-400 uppercase">Итого:</span>
                  <span className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">{totalPrice}₽</span>
                </div>
                <button onClick={handleCheckout} className="w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white py-4 rounded-xl font-black uppercase text-lg shadow-xl shadow-purple-500/50 hover:shadow-cyan-500/50 active:scale-95 transition-all">Оформить</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* РЕДАКТИРОВАНИЕ ЦЕНЫ */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[2100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 w-full max-w-md rounded-2xl p-8 border border-purple-500/30 backdrop-blur shadow-2xl shadow-purple-500/50">
            <h3 className="text-2xl font-black text-center mb-8 bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">Цена товара</h3>
            <form onSubmit={handleSaveProduct}>
              <div className="bg-gradient-to-br from-cyan-500/10 to-pink-500/10 p-8 rounded-2xl mb-8 border border-purple-500/30 backdrop-blur">
                <input type="number" className="w-full bg-transparent text-6xl font-black text-center outline-none bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent" value={editingProduct?.price || 0} onChange={e => setEditingProduct({ ...editingProduct!, price: parseFloat(e.target.value) || 0 })} autoFocus />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-3 rounded-lg font-bold uppercase text-sm border border-purple-500/30 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all">Отмена</button>
                <button type="submit" className="flex-1 py-3 rounded-lg font-bold uppercase text-sm bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-lg hover:shadow-purple-500/30 active:scale-95 transition-all">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
