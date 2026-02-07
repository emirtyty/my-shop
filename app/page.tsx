'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import StoriesFeed from './components/StoriesFeed';
import BuyIcon from './components/BuyIcon';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  discount: number;
  category: string;
  seller_id: string;
  description?: string;
  rating?: number;
  reviews?: number;
  sellers?: { 
    id: string; 
    shop_name: string;
    telegram_url?: string;
    vk_url?: string;
    whatsapp_url?: string;
    instagram_url?: string;
  };
}

export default function HomeOptimized() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('product_market')
        .select('*, sellers(shop_name, id, telegram_url, vk_url, whatsapp_url, instagram_url)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Не удалось загрузить товары');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <button
            onClick={fetchProducts}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">🛍️ Маркетплейс</h1>
          
          {/* Search */}
          <input
            type="text"
            placeholder="Поиск товаров..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Stories */}
        <StoriesFeed />

        {/* Products Grid */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-6">📦 Товары ({filteredProducts.length})</h2>
          
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">Товары не найдены</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <div key={product.id} className="bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/20 hover:border-cyan-500/50 transition-all duration-300 hover:scale-105">
                  {/* Product Image */}
                  <div className="relative">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                      loading="lazy"
                    />
                    
                    {/* Discount Badge */}
                    {product.discount > 0 && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm font-bold">
                        -{product.discount}%
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2 line-clamp-2">{product.name}</h3>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xl font-bold text-cyan-400">
                          {product.discount > 0 
                            ? Math.round(product.price * (1 - product.discount / 100))
                            : product.price
                          } ₽
                        </div>
                        {product.discount > 0 && (
                          <div className="text-sm text-gray-400 line-through">
                            {product.price} ₽
                          </div>
                        )}
                      </div>
                      <div className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg text-sm">
                        {product.category}
                      </div>
                    </div>

                    {/* Seller Info */}
                    <div className="text-sm text-gray-400 mb-3">
                      👤 {product.sellers?.shop_name || 'Продавец'}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <BuyIcon 
                        sellerContacts={product.sellers || {}}
                        productName={product.name}
                        productId={product.id}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
