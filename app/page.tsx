'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from './lib/supabase';
import StoriesFeed from './components/StoriesFeed';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  discount: number;
  category: string;
  seller_id: string;
  sellers?: { 
    id: string; 
    shop_name: string;
    telegram_url?: string;
    vk_url?: string;
    whatsapp_url?: string;
    instagram_url?: string;
  };
}

interface Story {
  id: string;
  media_url: string;
  created_at: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Все');
  const [viewingSeller, setViewingSeller] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Check if Supabase is properly configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn('Supabase environment variables are missing');
        setProducts([]);
        setStories([]);
        return;
      }

      const [prodRes, storyRes] = await Promise.all([
        supabase.from('product_market').select('*, sellers(shop_name, id, telegram_url, vk_url, whatsapp_url, instagram_url)'),
        supabase.from('seller_stories').select('*').order('created_at', { ascending: false })
      ]);
      
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

  const getSocialUrl = (seller: any) => {
    return seller?.telegram_url || seller?.vk_url || seller?.whatsapp_url || seller?.instagram_url;
  };

  const getSocialIcon = (url: string) => {
    if (url?.includes('t.me') || url?.includes('telegram')) return '📱';
    if (url?.includes('vk.com') || url?.includes('vkontakte')) return '💬';
    if (url?.includes('wa.me') || url?.includes('whatsapp')) return '💬';
    if (url?.includes('instagram')) return '📷';
    return '🔗';
  };

  const handleBuyClick = (product: Product) => {
    const socialUrl = getSocialUrl(product.sellers);
    if (socialUrl) {
      window.open(socialUrl, '_blank');
    } else {
      alert('Социальные сети продавца не настроены');
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category || 'Меню'));
    return ['Все', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
    (activeCategory === 'Все' || p.category === activeCategory)
  );

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl font-bold mb-8 text-white">RA DELL</div>
          <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-white animate-loading-bar"></div>
          </div>
          <p className="mt-8 text-gray-400 font-bold">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-end items-center mb-4">
          </div>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Поиск товаров..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full px-4 py-3 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 placeholder-gray-500" 
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2">🔍</span>
          </div>
        </div>
      </header>

      {/* Stories Feed */}
      <div className="max-w-6xl mx-auto px-4">
        <StoriesFeed />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-8">
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)} 
              className={`px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-32">
          {filteredProducts.map(p => {
            const hasDiscount = p.discount > 0;
            const displayPrice = hasDiscount ? Math.round(p.price * (1 - p.discount / 100)) : p.price;
            const socialUrl = getSocialUrl(p.sellers);
            
            return (
              <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-200">
                <div className="relative aspect-square bg-gray-100">
                  <img 
                    src={p.image_url} 
                    className="w-full h-full object-cover" 
                    alt={p.name} 
                  />
                  {hasDiscount && (
                    <div className="absolute top-2 left-2 bg-yellow-400 text-gray-900 px-2 py-1 rounded text-xs font-bold">
                      -{p.discount}%
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <button 
                    onClick={() => setViewingSeller(p.sellers)} 
                    className="text-xs font-medium text-blue-500 hover:text-blue-600 mb-2 block w-full text-center"
                  >
                    {p.sellers?.shop_name || 'Магазин'}
                  </button>
                  <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 h-10">{p.name}</h3>
                  <div className="mb-3">
                    {hasDiscount ? (
                      <>
                        <div className="bg-yellow-400 text-gray-900 text-xs px-2 py-1 rounded inline-block mb-1">
                          <del className="font-medium">{p.price}₽</del>
                        </div>
                        <div className="text-lg font-bold text-gray-900">{displayPrice}₽</div>
                      </>
                    ) : (
                      <div className="text-lg font-bold text-gray-900">{p.price}₽</div>
                    )}
                  </div>
                  <button 
                    onClick={() => handleBuyClick(p)}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      socialUrl 
                        ? 'bg-orange-500 text-white hover:bg-orange-600' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {getSocialIcon(socialUrl)} Купить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seller Modal */}
      {viewingSeller && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">{viewingSeller.shop_name}</h2>
            <button 
              onClick={() => setViewingSeller(null)} 
              className="bg-orange-500 text-white w-10 h-10 rounded-full font-bold hover:bg-orange-600"
            >
              ←
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-4 pb-20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.filter(p => p.seller_id === viewingSeller.id).map(p => {
                const hasDiscount = p.discount > 0;
                const displayPrice = hasDiscount ? Math.round(p.price * (1 - p.discount / 100)) : p.price;
                const socialUrl = getSocialUrl(viewingSeller);
                
                return (
                  <div key={p.id} className="bg-white rounded-lg overflow-hidden shadow-sm">
                    <div className="relative aspect-square bg-gray-100">
                      <img 
                        src={p.image_url} 
                        className="w-full h-full object-cover" 
                        alt={p.name} 
                      />
                      {hasDiscount && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                          -{p.discount}%
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 h-10">{p.name}</h3>
                      <div className="mb-2">
                        {hasDiscount ? (
                          <>
                            <del className="text-gray-400 text-xs block">{p.price}₽</del>
                            <div className="text-lg font-bold text-gray-900">{displayPrice}₽</div>
                          </>
                        ) : (
                          <div className="text-lg font-bold text-gray-900">{p.price}₽</div>
                        )}
                      </div>
                      <button 
                        onClick={() => handleBuyClick(p)}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          socialUrl 
                            ? 'bg-orange-500 text-white hover:bg-orange-600' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {getSocialIcon(socialUrl)} Купить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
