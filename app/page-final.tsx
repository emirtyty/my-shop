'use client';

import { useEffect, useState, useMemo } from 'react';
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

interface Order {
  id: string;
  product_name: string;
  total_price: number;
  address: string;
  buyer_phone: string;
  status: string;
  created_at: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Все');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [checkPhone, setCheckPhone] = useState('');
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isSearchingOrders, setIsSearchingOrders] = useState(false);
  const [orderAddress, setOrderAddress] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['Все', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = activeCategory === 'Все' || p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  const totalPrice = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.effectivePrice || item.product.price) * item.quantity, 0);
  }, [cart]);

  const totalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

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
    setCart([]);
  };

  const handleCheckout = async () => {
    if (!checkPhone || !orderAddress) {
      alert('Заполните телефон и адрес доставки');
      return;
    }
    
    const order = {
      product_name: cart.map(item => item.product.name).join(', '),
      total_price: totalPrice,
      address: orderAddress,
      buyer_phone: checkPhone,
      status: 'Новый'
    };

    const { error } = await supabase
      .from('orders')
      .insert([order]);

    if (error) {
      alert('Ошибка при оформлении заказа');
      return;
    }

    clearCart();
    setOrderAddress('');
    setCheckPhone('');
    setIsCartOpen(false);
    alert('Заказ оформлен!');
  };

  const handleCheckOrder = async () => {
    if (!checkPhone) return;
    
    setIsSearchingOrders(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_phone', checkPhone)
      .order('created_at', { ascending: false });

    if (error) {
      alert('Ошибка при загрузке заказов');
    } else {
      setUserOrders(data || []);
    }
    setIsSearchingOrders(false);
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: productsData, error } = await supabase
      .from('product_market')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading products:', error);
    } else {
      setProducts(productsData || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="sticky top-0 z-[100] bg-slate-900/80 backdrop-blur-xl border-b border-purple-500/20 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-black italic bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-lg">RA DELL</h1>
            <div className="flex gap-4">
              <button onClick={() => setIsStatusModalOpen(true)} className="text-3xl hover:scale-125 transition-transform duration-300 drop-shadow-lg">📦</button>
              <button onClick={() => setIsCartOpen(true)} className="relative text-3xl hover:scale-125 transition-transform duration-300 drop-shadow-lg">
                🛒
                {totalItems > 0 && <span className="absolute -top-2 -right-2 bg-gradient-to-r from-cyan-500 to-pink-500 text-white w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shadow-lg">{totalItems}</span>}
              </button>
            </div>
            <div className="relative">
              <input type="text" placeholder="Поиск товаров..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full px-4 py-3 bg-slate-800/50 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 backdrop-blur border border-purple-500/20 text-white placeholder-slate-400" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2">🔍</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-12">
          <h2 className="text-2xl font-black text-center mb-6">Категории товаров</h2>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {categories.map(cat => (
              <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)} 
                className={`px-6 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat 
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-xl scale-105' 
                    : 'bg-slate-800/50 border border-purple-500/20 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-32">
          {loading ? (
            <div className="col-span-full text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500"></div>
            </div>
          ) : (
            filteredProducts.map(p => {
              const cartItem = cart.find(item => item.product.id === p.id);
              const count = cartItem?.quantity || 0;
              const hasDiscount = p.discount > 0;
              const displayPrice = hasDiscount ? Math.round(p.price * (1 - p.discount / 100)) : p.price;
              
              return (
                <div key={p.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all">
                  <div className="relative aspect-square overflow-hidden bg-slate-800">
                    <img 
                      src={p.image_url} 
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" 
                      alt={p.name} 
                    />
                    {hasDiscount && (
                      <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg">
                        -{p.discount}%
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur px-4 py-3 rounded-xl">
                      {hasDiscount ? (
                        <>
                          <del className="text-slate-400 text-sm">{p.price}₽</del>
                          <div className="text-xl text-cyan-400 font-black">{displayPrice}₽</div>
                        </>
                      ) : (
                        <div className="text-xl text-cyan-400 font-black">{p.price}₽</div>
                      )}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-sm font-black uppercase line-clamp-2 mb-4 text-center text-purple-100">{p.name}</h3>
                    {count === 0 ? (
                      <button 
                        onClick={() => addToCart(p)} 
                        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl text-sm font-bold hover:shadow-xl transition-all"
                      >
                        🛒 В корзину
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-slate-700/50 rounded-xl p-2">
                        <button 
                          onClick={() => decreaseQuantity(p.id)} 
                          className="w-10 font-black text-cyan-400 hover:text-white bg-slate-600 rounded-lg py-2"
                        >
                          −
                        </button>
                        <span className="flex-1 text-center font-bold text-white">{count}</span>
                        <button 
                          onClick={() => addToCart(p)} 
                          className="w-10 font-black text-cyan-400 hover:text-white bg-slate-600 rounded-lg py-2"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isCartOpen && (
        <div className="fixed inset-0 z-[1500] bg-black/60 backdrop-blur-md flex items-end justify-center">
          <div className="w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-t-3xl shadow-2xl flex flex-col p-6 max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-white">Корзина</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-2xl text-slate-400 hover:text-slate-200">×</button>
            </div>
            <div className="flex-1 overflow-y-auto pb-20 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">🛒</div>
                  <p className="font-bold text-slate-400">Корзина пуста</p>
                </div>
              ) : (
                cart.map((cartItem, index) => (
                  <div key={cartItem.product.id} className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl">
                    <img 
                      src={cartItem.product.image_url} 
                      className="w-16 h-16 rounded-lg object-cover" 
                      alt={cartItem.product.name}
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-purple-100 line-clamp-2">{cartItem.product.name}</h4>
                      <p className="text-xl font-black text-cyan-400">
                        {cartItem.product.effectivePrice || cartItem.product.price}₽
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => decreaseQuantity(cartItem.product.id)} 
                        className="w-10 font-black text-cyan-400 hover:text-white bg-slate-600 rounded-lg py-2"
                      >
                        −
                      </button>
                      <span className="flex-1 text-center font-bold text-white">{cartItem.quantity}</span>
                      <button 
                        onClick={() => addToCart(cartItem.product)} 
                        className="w-10 font-black text-cyan-400 hover:text-white bg-slate-600 rounded-lg py-2"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t border-purple-500/20 pt-6 space-y-4 bg-slate-900/50 -mx-6 -mb-6 px-6 py-6 rounded-b-3xl">
                <input 
                  type="text" 
                  placeholder="Телефон" 
                  className="w-full bg-slate-800/50 px-4 py-3 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 backdrop-blur text-white placeholder-slate-400" 
                  value={checkPhone} 
                  onChange={e => setCheckPhone(e.target.value)} 
                />
                <input 
                  type="text" 
                  placeholder="Адрес доставки" 
                  className="w-full bg-slate-800/50 px-4 py-3 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 backdrop-blur text-white placeholder-slate-400" 
                  value={orderAddress} 
                  onChange={e => setOrderAddress(e.target.value)} 
                />
                <div className="flex justify-between items-end">
                  <span className="text-sm text-slate-400">Итого:</span>
                  <span className="text-4xl font-black text-cyan-400">{totalPrice}₽</span>
                </div>
                <button 
                  onClick={handleCheckout} 
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all"
                >
                  Оформить заказ
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
          <div className="flex-1 flex flex-col px-4 pt-12">
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setIsStatusModalOpen(false)} className="text-2xl text-cyan-400 hover:text-pink-400">←</button>
              <h2 className="text-xl font-black text-white">Мои заказы</h2>
            </div>
            <div className="flex gap-3 mb-8">
              <input 
                type="text" 
                placeholder="Номер телефона..." 
                className="flex-1 h-14 bg-slate-800/50 rounded-xl px-4 outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 backdrop-blur text-white placeholder-slate-400" 
                value={checkPhone} 
                onChange={e => setCheckPhone(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleCheckOrder()} 
                autoFocus 
              />
              <button onClick={() => { setIsStatusModalOpen(false); setIsCartOpen(true); }} className="w-14 h-14 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl text-xl hover:shadow-lg">🛒</button>
            </div>
            {isSearchingOrders && (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500"></div>
              </div>
            )}
            {userOrders.length > 0 && (
              <div className="flex-1 overflow-y-auto space-y-4 pb-20">
                {userOrders.map(order => (
                  <div key={order.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 rounded-2xl border border-purple-500/20">
                    <p className="text-xs font-bold text-purple-400 mb-2">Заказ #{String(order.id).slice(0, 8)}</p>
                    <p className="font-black text-4xl text-cyan-400 mb-3">{order.total_price}₽</p>
                    <p className="text-sm text-slate-200 mb-2">{order.product_name}</p>
                    <p className="text-xs text-slate-400">📍 {order.address}</p>
                    <p className="text-xs text-cyan-400 font-bold">Статус: {order.status}</p>
                  </div>
                ))}
              </div>
            )}
            {checkPhone && !isSearchingOrders && userOrders.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-lg">Заказы не найдены</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
