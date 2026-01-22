'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
  discount?: number;
  stock_quantity?: number;
  created_at?: string;
  sellers?: {
    shop_name: string;
    id: string;
    telegram_url?: string;
    vk_url?: string;
    whatsapp_url?: string;
    instagram_url?: string;
  };
}

interface Story {
  id: string;
  image_url: string;
  title?: string;
  price?: number;
  discount?: number;
  product_id?: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning';
}

interface Stats {
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

interface Seller {
  id: string;
  login: string;
  shop_name: string;
  telegram_url?: string;
  vk_url?: string;
  whatsapp_url?: string;
  instagram_url?: string;
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'add-product' | 'social'>('products');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    image_url: '',
    category: '',
    discount: 0,
    stock_quantity: 0
  });
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  });
  const [sellerInfo, setSellerInfo] = useState<Seller>({
    id: '',
    login: '',
    shop_name: '',
    telegram_url: '',
    vk_url: '',
    whatsapp_url: '',
    instagram_url: ''
  });
  const [showSocialModal, setShowSocialModal] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchStories();
    fetchSellerInfo();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('product_market')
        .select('*, sellers(shop_name, id, telegram_url, vk_url, whatsapp_url, instagram_url)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStories(data || []);
    } catch (error) {
      console.error('Error loading stories:', error);
    }
  };

  const fetchSellerInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSellerInfo(data as Seller);
      }
    } catch (error) {
      console.error('Error loading seller info:', error);
    }
  };

  const calculateStats = (products: Product[]) => {
    const totalProducts = products.length;
    const lowStock = products.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= 5).length;
    const outOfStock = products.filter(p => (p.stock_quantity || 0) === 0).length;
    const totalValue = products.reduce((sum, p) => sum + p.price * (p.stock_quantity || 0), 0);

    setStats({ totalProducts, lowStock, outOfStock, totalValue });
  };

  const updateProduct = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('product_market')
        .update({
          name: product.name,
          price: product.price,
          category: product.category,
          discount: product.discount,
          stock_quantity: product.stock_quantity,
          image_url: product.image_url
        })
        .eq('id', product.id);

      if (error) throw error;
      
      await fetchProducts();
      setShowEditModal(false);
      addToast('Товар успешно обновлен', 'success');
    } catch (error) {
      console.error('Error updating product:', error);
      addToast('Ошибка при обновлении товара', 'error');
    }
  };

  const createProduct = async () => {
    try {
      const { error } = await supabase
        .from('product_market')
        .insert({
          name: newProduct.name,
          price: newProduct.price,
          category: newProduct.category,
          discount: newProduct.discount,
          stock_quantity: newProduct.stock_quantity,
          image_url: newProduct.image_url,
          seller_id: sellerInfo.id || 'default-seller'
        });

      if (error) throw error;
      
      await fetchProducts();
      setNewProduct({
        name: '',
        price: 0,
        image_url: '',
        category: '',
        discount: 0,
        stock_quantity: 0
      });
      addToast('Товар успешно создан', 'success');
    } catch (error) {
      console.error('Error creating product:', error);
      addToast('Ошибка при создании товара', 'error');
    }
  };

  const updateSellerSocials = async () => {
    try {
      const { error } = await supabase
        .from('sellers')
        .update({
          telegram_url: sellerInfo.telegram_url,
          vk_url: sellerInfo.vk_url,
          whatsapp_url: sellerInfo.whatsapp_url,
          instagram_url: sellerInfo.instagram_url
        })
        .eq('id', sellerInfo.id);

      if (error) throw error;
      
      addToast('Социальные сети обновлены', 'success');
      setShowSocialModal(false);
    } catch (error) {
      console.error('Error updating socials:', error);
      addToast('Ошибка при обновлении', 'error');
    }
  };

  const addToast = (message: string, type: 'success' | 'error' | 'warning') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockStatus = (quantity?: number) => {
    const qty = quantity || 0;
    if (qty === 0) return { color: 'text-red-500', icon: '🔴', label: 'Нет в наличии' };
    if (qty <= 5) return { color: 'text-yellow-500', icon: '🟡', label: 'Мало' };
    return { color: 'text-green-500', icon: '🟢', label: 'В наличии' };
  };

  const getSocialIcon = (url: string) => {
    if (url.includes('t.me') || url.includes('telegram')) return '📱';
    if (url.includes('vk.com') || url.includes('vkontakte')) return '💬';
    if (url.includes('wa.me') || url.includes('whatsapp')) return '💬';
    if (url.includes('instagram')) return '📷';
    return '🔗';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white p-4 pb-24">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border animate-pulse ${
              toast.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-100' :
              toast.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-100' :
              'bg-yellow-500/20 border-yellow-500/30 text-yellow-100'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Header with Search */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
          <div className="w-full sm:flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 sm:py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white placeholder-white/50 text-sm sm:text-base"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm sm:text-base">🔍</span>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <button
              onClick={() => setShowSocialModal(true)}
              className="block w-full px-4 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold hover:shadow-2xl cursor-pointer text-center text-sm sm:text-base backdrop-blur-xl border border-white/20"
            >
              📱 Соцсети
            </button>
          </div>
        </div>
      </div>

      {/* Notification Bell */}
      <div className="fixed top-4 right-4 z-50">
        <button className="relative p-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-2xl hover:scale-105">
          <span className="text-2xl">🔔</span>
          {(stats.lowStock > 0 || stats.outOfStock > 0) && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg">
              {stats.lowStock + stats.outOfStock}
            </span>
          )}
        </button>
      </div>

      <div className="pb-24">
        {/* Products Tab */}
        {activeTab === 'products' && (
          <div>
            <div className="bg-white/5 backdrop-blur-2xl p-4 sm:p-6 rounded-3xl border border-white/10 shadow-2xl mb-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-black italic bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Товары ({filteredProducts.length})
                </h2>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-16 h-16 border-4 border-purple-500 rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filteredProducts.map((product, index) => {
                    const stockStatus = getStockStatus(product.stock_quantity);
                    
                    return (
                      <div 
                        key={product.id} 
                        className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300"
                      >
                        <div className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-full sm:w-16 sm:h-16 h-32 object-cover rounded-2xl border border-white/20"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-white text-sm sm:text-base truncate">{product.name}</h3>
                              <p className="text-xs sm:text-sm text-white/70">{product.sellers?.shop_name || 'Unknown'}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-base sm:text-lg font-bold text-cyan-400">{product.price}₽</span>
                                {product.discount && (
                                  <span className="text-xs px-2 py-1 bg-pink-500/20 text-pink-400 rounded-full">
                                    -{product.discount}%
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-sm">{stockStatus.icon}</span>
                                <span className={`text-xs sm:text-sm font-medium ${stockStatus.color}`}>
                                  {product.stock_quantity || 0} шт
                                </span>
                                <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-cyan-300">
                                  {product.category}
                                </span>
                              </div>
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setShowEditModal(true);
                                  }}
                                  className="w-full px-2 py-1 sm:px-3 bg-blue-600/80 hover:bg-blue-700/80 text-white text-xs rounded-xl backdrop-blur-xl border border-white/20"
                                >
                                  ✏️ Изменить
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Product Tab */}
        {activeTab === 'add-product' && (
          <div className="bg-white/5 backdrop-blur-2xl p-4 sm:p-6 rounded-3xl border border-white/10 shadow-2xl">
            <h2 className="text-xl sm:text-2xl font-black italic bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4 sm:mb-6">
              Добавить новый товар
            </h2>
            <div className="max-w-full sm:max-w-md">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">Название товара</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white text-sm sm:text-base placeholder-white/50"
                    placeholder="Введите название"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">Цена (₽)</label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white text-sm sm:text-base placeholder-white/50"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">Скидка (%)</label>
                  <input
                    type="number"
                    value={newProduct.discount}
                    onChange={(e) => setNewProduct({...newProduct, discount: Number(e.target.value)})}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white text-sm sm:text-base placeholder-white/50"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">Количество</label>
                  <input
                    type="number"
                    value={newProduct.stock_quantity}
                    onChange={(e) => setNewProduct({...newProduct, stock_quantity: Number(e.target.value)})}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white text-sm sm:text-base placeholder-white/50"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">Категория</label>
                  <input
                    type="text"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white text-sm sm:text-base placeholder-white/50"
                    placeholder="Введите категорию"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">URL изображения</label>
                  <input
                    type="text"
                    value={newProduct.image_url}
                    onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white text-sm sm:text-base placeholder-white/50"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <button
                  onClick={createProduct}
                  className="w-full px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-bold hover:shadow-2xl text-sm sm:text-base backdrop-blur-xl border border-white/20"
                >
                  ➕ Добавить товар
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Liquid Glass Bottom Navigation */}
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl transition-all duration-300 ${
                activeTab === 'products' 
                  ? 'bg-white/30 shadow-lg scale-110' 
                  : 'hover:bg-white/20 active:scale-95'
              }`}
            >
              <span className="text-xl sm:text-2xl filter drop-shadow-sm">📦</span>
            </button>
            <button
              onClick={() => setActiveTab('add-product')}
              className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl transition-all duration-300 ${
                activeTab === 'add-product' 
                  ? 'bg-white/30 shadow-lg scale-110' 
                  : 'hover:bg-white/20 active:scale-95'
              }`}
            >
              <span className="text-xl sm:text-2xl filter drop-shadow-sm">➕</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-4 sm:p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Редактировать товар</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-2">Название товара</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-2">Цена (₽)</label>
                <input
                  type="number"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-2">Скидка (%)</label>
                <input
                  type="number"
                  value={editingProduct.discount || 0}
                  onChange={(e) => setEditingProduct({...editingProduct, discount: Number(e.target.value)})}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-2">Количество</label>
                <input
                  type="number"
                  value={editingProduct.stock_quantity || 0}
                  onChange={(e) => setEditingProduct({...editingProduct, stock_quantity: Number(e.target.value)})}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-2">Категория</label>
                <input
                  type="text"
                  value={editingProduct.category}
                  onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-2">URL изображения</label>
                <input
                  type="text"
                  value={editingProduct.image_url}
                  onChange={(e) => setEditingProduct({...editingProduct, image_url: e.target.value})}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white text-sm sm:text-base"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => updateProduct(editingProduct)}
                  className="flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-bold hover:shadow-2xl text-sm sm:text-base"
                >
                  💾 Сохранить
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProduct(null);
                  }}
                  className="flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm sm:text-base backdrop-blur-xl border border-white/20"
                >
                  ❌ Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Social Networks Modal */}
      {showSocialModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-4 sm:p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-6">Социальные сети</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-2">📱 Telegram</label>
                <input
                  type="text"
                  value={sellerInfo.telegram_url || ''}
                  onChange={(e) => setSellerInfo({...sellerInfo, telegram_url: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white placeholder-white/50"
                  placeholder="https://t.me/username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-2">💬 VK</label>
                <input
                  type="text"
                  value={sellerInfo.vk_url || ''}
                  onChange={(e) => setSellerInfo({...sellerInfo, vk_url: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white placeholder-white/50"
                  placeholder="https://vk.com/username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-2">💬 WhatsApp</label>
                <input
                  type="text"
                  value={sellerInfo.whatsapp_url || ''}
                  onChange={(e) => setSellerInfo({...sellerInfo, whatsapp_url: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white placeholder-white/50"
                  placeholder="https://wa.me/phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-2">📷 Instagram</label>
                <input
                  type="text"
                  value={sellerInfo.instagram_url || ''}
                  onChange={(e) => setSellerInfo({...sellerInfo, instagram_url: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-white/20 text-white placeholder-white/50"
                  placeholder="https://instagram.com/username"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={updateSellerSocials}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold hover:shadow-2xl"
                >
                  💾 Сохранить
                </button>
                <button
                  onClick={() => setShowSocialModal(false)}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold backdrop-blur-xl border border-white/20"
                >
                  ❌ Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
