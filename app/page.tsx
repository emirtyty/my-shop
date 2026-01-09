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

  useEffect(() => {
    const syncCart = () => {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) setCart(JSON.parse(savedCart));
    };
    syncCart();
    window.addEventListener('storage', syncCart);
    window.addEventListener('cartUpdated', syncCart);
    return () => {
      window.removeEventListener('storage', syncCart);
      window.removeEventListener('cartUpdated', syncCart);
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      // Имитация задержки для демонстрации скелетонов (можно убрать)
      // await new Promise(resolve => setTimeout(resolve, 1000));
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

  const getProductCount = (id: string) => cart.filter(item => item.id === id).length;

  const addToCart = (product: any) => {
    const newCart = [...cart, product];
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    setCartBumping(true);
    setTimeout(() => setCartBumping(false), 300);
  };
  
  const removeFromCartOnce = (productId: string) => {
    const index = cart.findLastIndex(item => item.id === productId);
    if (index !== -1) {
      const newCart = [...cart];
      newCart.splice(index, 1);
      setCart(newCart);
      localStorage.setItem('cart', JSON.stringify(newCart));
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const catName = String(typeof p.category === 'object' ? p.category.name : p.category || 'Без категории');
      return matchesSearch && (activeCategory === 'Все' || catName === activeCategory);
    });
  }, [products, searchQuery, activeCategory]);

  // --- ЭКРАН ЗАГРУЗКИ (СКЕЛЕТОНЫ) ---
  if (loading) return (
    <div className="min-h-screen bg-[#F8F8F8] p-6 space-y-8">
      <div className="h-16 w-full bg-white rounded-3xl animate-pulse" />
      <div className="flex gap-4 overflow-hidden">
        {[1,2,3,4,5].map(i => <div key={i} className="w-16 h-16 rounded-full bg-white animate-pulse flex-shrink-0" />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-white rounded-[2.8rem] animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-black pb-32 scroll-smooth">
      {/* Сториз модалка с плавным появлением */}
      {selectedStory && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in" onClick={() => setSelectedStory(null)}>
          <img src={selectedStory} className="max-w-full max-h-[80vh] object-contain shadow-2xl" alt="Story" />
          <div className="absolute top-10 right-10 text-white text-4xl font-thin cursor-pointer">×</div>
        </div>
      )}

      <header className="bg-white px-6 pt-12 pb-6 rounded-b-[3.5rem] shadow-sm mb-4 sticky top-0 z-50 transition-all">
        <div className="flex gap-4 items-center mb-8">
          <div className="flex-1 bg-zinc-100 rounded-2xl flex items-center px-4 py-4 border border-zinc-200/30 focus-within:ring-2 ring-orange-500/20 transition-all group">
            <span className="mr-3 text-zinc-400 group-focus-within:scale-110 transition-transform">🔍</span>
            <input 
              type="text" 
              placeholder="Найти в маркете..." 
              className="bg-transparent outline-none w-full text-[11px] font-black uppercase italic tracking-tighter"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsCartOpen(true)} 
            className={`relative bg-black text-white p-4.5 rounded-[1.4rem] transition-all duration-300 shadow-xl shadow-black/20 ${cartBumping ? 'scale-125 -translate-y-2 bg-orange-500' : 'active:scale-90 hover:scale-105'}`}
          >
              🛒 {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 w-6 h-6 rounded-full text-[10px] flex items-center justify-center border-2 border-white font-black animate-bounce">{cart.length}</span>}
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth active:cursor-grabbing">
          {stories.map((s) => (
            <div key={s.id} onClick={() => setSelectedStory(s.image_url)} className="flex-shrink-0 w-16 h-16 rounded-full p-[2px] border-2 border-orange-500 hover:rotate-6 active:scale-95 transition-all cursor-pointer shadow-md">
              <img src={s.image_url} className="w-full h-full rounded-full object-cover" alt="Story preview" />
            </div>
          ))}
        </div>
      </header>

      <div className="px-6 flex gap-2 overflow-x-auto no-scrollbar mb-6 scroll-smooth">
        {['Все', ...Array.from(new Set(products.map(p => String(typeof p.category === 'object' ? p.category.name : p.category || 'Без категории'))))].map(cat => (
          <button 
            key={cat} 
            onClick={() => setActiveCategory(cat)}
            className={`px-7 py-2.5 rounded-full text-[10px] font-black uppercase italic tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30 -translate-y-1' : 'bg-white text-zinc-400 border border-zinc-100 hover:bg-zinc-50 active:scale-95'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <main className="px-4 grid grid-cols-2 gap-4">
        {filteredProducts.map((p, index) => {
          const count = getProductCount(p.id);
          return (
            <div 
              key={p.id} 
              className="bg-white rounded-[2.8rem] p-2 border border-zinc-100 shadow-sm hover:shadow-xl transition-all duration-500 animate-fade-in group overflow-hidden" 
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="relative aspect-square mb-3 overflow-hidden rounded-[2.4rem]">
                <img src={p.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full text-[9px] font-black italic shadow-sm group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  {p.price} ₽
                </div>
              </div>
              <div className="px-3 pb-3 text-center">
                <div onClick={() => window.location.href = `/seller/${p.seller_id}`} className="text-[7px] text-zinc-400 uppercase font-bold tracking-widest mb-1 cursor-pointer hover:text-orange-500 transition-colors">
                  {p.sellers?.shop_name || 'Магазин'}
                </div>
                <h3 className="font-bold text-[10px] uppercase tracking-tighter mb-4 h-8 line-clamp-2 leading-none group-hover:text-orange-500 transition-colors">{p.name}</h3>
                
                <div className="relative h-[46px]">
                  {count === 0 ? (
                    <button 
                      onClick={() => addToCart(p)}
                      className="absolute inset-0 w-full bg-black text-white rounded-[1.4rem] text-[9px] font-black uppercase italic active:bg-orange-500 transition-all hover:shadow-lg shadow-black/20"
                    >
                      КУПИТЬ
                    </button>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-between bg-zinc-100 rounded-[1.4rem] overflow-hidden animate-scale-up">
                      <button onClick={() => removeFromCartOnce(p.id)} className="w-12 h-full text-black font-black hover:bg-red-500 hover:text-white transition-colors active:scale-75">—</button>
                      <span className="text-[11px] font-black italic animate-pop">{count}</span>
                      <button onClick={() => addToCart(p)} className="w-12 h-full text-black font-black hover:bg-green-500 hover:text-white transition-colors active:scale-75">+</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {isCartOpen && (
        <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-md flex items-end animate-fade-in" onClick={() => setIsCartOpen(false)}>
          <div className="bg-white w-full rounded-t-[4rem] p-10 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-zinc-200 rounded-full mx-auto mb-8" />
            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-10">Корзина</h2>
            
            {cart.length > 0 ? (
                <>
                <div className="space-y-4 mb-10">
                    {Array.from(new Set(cart.map(i => i.id))).map(id => {
                        const item = cart.find(c => c.id === id);
                        const count = getProductCount(id);
                        return (
                            <div key={id} className="flex items-center justify-between bg-zinc-50/50 p-4 rounded-[1.8rem] border border-zinc-100 hover:bg-white transition-colors animate-fade-in">
                                <div className="flex items-center gap-4">
                                    <img src={item.image_url} className="w-14 h-14 rounded-2xl object-cover shadow-sm" alt="" />
                                    <div className="flex flex-col">
                                      <span className="font-bold text-[10px] uppercase leading-tight line-clamp-1">{item.name}</span>
                                      <span className="text-[9px] text-zinc-400 font-bold uppercase italic mt-1">{item.price} ₽ / шт.</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                                        <button onClick={() => removeFromCartOnce(id)} className="px-3 py-2 hover:bg-zinc-100 transition-colors">—</button>
                                        <span className="text-[10px] font-black px-1 min-w-[20px] text-center">{count}</span>
                                        <button onClick={() => addToCart(item)} className="px-3 py-2 hover:bg-zinc-100 transition-colors">+</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-4 font-black uppercase italic text-xs tracking-widest text-zinc-400">
                    <span>Итого к оплате:</span>
                    <span className="text-2xl text-black">{cart.reduce((s, i) => s + Number(i.price), 0)} ₽</span>
                  </div>
                  <button onClick={() => {}} className="w-full bg-orange-500 text-white py-7 rounded-[2.5rem] font-black uppercase italic text-sm shadow-orange-500/40 shadow-2xl active:scale-95 transition-all hover:bg-orange-600">
                    Оформить заказ
                  </button>
                </div>
                </>
            ) : (
              <div className="text-center py-20">
                <div className="text-4xl mb-4 opacity-20 text-black">🛒</div>
                <p className="opacity-30 font-black uppercase italic text-xs tracking-widest">Тут пока пусто</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        html { scroll-behavior: smooth; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        
        @keyframes fade-in { 
          from { opacity: 0; transform: translateY(20px) scale(0.98); } 
          to { opacity: 1; transform: translateY(0) scale(1); } 
        }
        @keyframes slide-up { 
          from { transform: translateY(100%); } 
          to { transform: translateY(0); } 
        }
        @keyframes scale-up {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }

        .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-slide-up { animation: slide-up 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-scale-up { animation: scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-pop { animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
      `}</style>
    </div>
  );
}