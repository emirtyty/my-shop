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

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'stories' | 'add-product'>('products');
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

  useEffect(() => {
    fetchProducts();
    fetchStories();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('product_market')
        .select('*, sellers(shop_name, id)')
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
          seller_id: 'default-seller'
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

  const deleteStory = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;
      
      await fetchStories();
      addToast('Story успешно удален', 'success');
    } catch (error) {
      console.error('Error deleting story:', error);
      addToast('Ошибка при удалении story', 'error');
    }
  };

  const createStory = async (productId: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const { error } = await supabase
        .from('stories')
        .insert({
          image_url: product.image_url,
          title: product.name,
          price: product.price,
          discount: product.discount,
          product_id: productId,
          link_url: `/product/${productId}`
        });

      if (error) throw error;
      
      await fetchStories();
      addToast('Story успешно создан', 'success');
    } catch (error) {
      console.error('Error creating story:', error);
      addToast('Ошибка при создании story', 'error');
    }
  };

  const addToast = (message: string, type: 'success' | 'error' | 'warning') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const categories = ['Все', ...Array.from(new Set(products.map(p => p.category)))];
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedCategory === 'Все' || p.category === selectedCategory)
  );

  const getStockStatus = (quantity?: number) => {
    const qty = quantity || 0;
    if (qty === 0) return { color: 'text-red-500', icon: '🔴', label: 'Нет в наличии' };
    if (qty <= 5) return { color: 'text-yellow-500', icon: '🟡', label: 'Мало' };
    return { color: 'text-green-500', icon: '🟢', label: 'В наличии' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white p-6 pb-24">
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm border animate-pulse ${
              toast.type === 'success' ? 'bg-green-500/20 border-green-500 text-green-100' :
              toast.type === 'error' ? 'bg-red-500/20 border-red-500 text-red-100' :
              'bg-yellow-500/20 border-yellow-500 text-yellow-100'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h1 className="text-6xl font-black italic bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
          Admin Panel
        </h1>
        <p className="text-purple-300 font-bold">MARKETPLACE TERMINAL v2.0</p>
      </div>

      <div className="fixed top-20 right-4 z-50">
        <button className="relative p-3 bg-slate-800/50 rounded-full border border-purple-500/20 backdrop-blur hover:bg-slate-700/50 transition-colors">
          <span className="text-2xl">🔔</span>
          {(stats.lowStock > 0 || stats.outOfStock > 0) && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
              {stats.lowStock + stats.outOfStock}
            </span>
          )}
        </button>
      </div>

      <div className="pb-24">
        {activeTab === 'products' && (
          <div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 rounded-2xl border border-purple-500/20 backdrop-blur mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Поиск товаров..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 text-white placeholder-slate-400"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2">🔍</span>
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-3 bg-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 text-white"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  onClick={() => alert('Экспорт в разработке')}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg"
                >
                  📊 Экспорт CSV
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 rounded-2xl border border-purple-500/20 backdrop-blur">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black italic bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                  Товары ({filteredProducts.length})
                </h2>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-16 h-16 border-4 border-purple-500 rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map((product, index) => {
                    const stockStatus = getStockStatus(product.stock_quantity);
                    
                    return (
                      <div 
                        key={product.id} 
                        className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl border border-purple-500/20 backdrop-blur"
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-lg border border-slate-600"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-white truncate">{product.name}</h3>
                              <p className="text-sm text-slate-400">{product.sellers?.shop_name || 'Unknown'}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-lg font-bold text-cyan-400">{product.price}₽</span>
                                {product.discount && (
                                  <span className="text-xs px-2 py-1 bg-pink-500/20 text-pink-400 rounded">
                                    -{product.discount}%
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm">{stockStatus.icon}</span>
                                <span className={`text-sm font-medium ${stockStatus.color}`}>
                                  {product.stock_quantity || 0} шт
                                </span>
                                <span className="text-xs px-2 py-1 bg-slate-600 rounded text-purple-300">
                                  {product.category}
                                </span>
                              </div>
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setShowEditModal(true);
                                  }}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg"
                                >
                                  ✏️ Изменить
                                </button>
                                <button
                                  onClick={() => createStory(product.id)}
                                  className="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white text-xs rounded-lg"
                                >
                                  📱 Story
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

        {activeTab === 'add-product' && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 rounded-2xl border border-purple-500/20 backdrop-blur">
            <h2 className="text-2xl font-black italic bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-6">
              Добавить новый товар
            </h2>
            <div className="max-w-md">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Название товара</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 text-white"
                    placeholder="Введите название"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Цена (₽)</label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Скидка (%)</label>
                  <input
                    type="number"
                    value={newProduct.discount}
                    onChange={(e) => setNewProduct({...newProduct, discount: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Количество</label>
                  <input
                    type="number"
                    value={newProduct.stock_quantity}
                    onChange={(e) => setNewProduct({...newProduct, stock_quantity: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Категория</label>
                  <input
                    type="text"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 text-white"
                    placeholder="Введите категорию"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">URL изображения</label>
                  <input
                    type="text"
                    value={newProduct.image_url}
                    onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 text-white"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <button
                  onClick={createProduct}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg"
                >
                  ➕ Добавить товар
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Liquid Glass Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-xl"></div>
        <div className="relative bg-white/5 backdrop-blur-2xl border-t border-white/10">
          <div className="flex justify-around items-center p-4">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex flex-col items-center gap-2 px-8 py-3 rounded-2xl transition-all duration-300 ${
                activeTab === 'products' 
                  ? 'bg-white/20 shadow-lg scale-105 border border-white/20' 
                  : 'hover:bg-white/10 active:scale-95'
              }`}
            >
              <span className="text-2xl filter drop-shadow-sm">📦</span>
              <span className={`text-xs font-medium ${
                activeTab === 'products' ? 'text-white' : 'text-white/70'
              }`}>Товары</span>
            </button>
            <button
              onClick={() => setActiveTab('add-product')}
              className={`flex flex-col items-center gap-2 px-8 py-3 rounded-2xl transition-all duration-300 ${
                activeTab === 'add-product' 
                  ? 'bg-white/20 shadow-lg scale-105 border border-white/20' 
                  : 'hover:bg-white/10 active:scale-95'
              }`}
            >
              <span className="text-2xl filter drop-shadow-sm">➕</span>
              <span className={`text-xs font-medium ${
                activeTab === 'add-product' ? 'text-white' : 'text-white/70'
              }`}>Добавить</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-purple-500/20 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Редактировать товар</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Название товара</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Цена (₽)</label>
                <input
                  type="number"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                  className="w-full px-4 py-3 bg-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Скидка (%)</label>
                <input
                  type="number"
                  value={editingProduct.discount || 0}
                  onChange={(e) => setEditingProduct({...editingProduct, discount: Number(e.target.value)})}
                  className="w-full px-4 py-3 bg-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Количество</label>
                <input
                  type="number"
                  value={editingProduct.stock_quantity || 0}
                  onChange={(e) => setEditingProduct({...editingProduct, stock_quantity: Number(e.target.value)})}
                  className="w-full px-4 py-3 bg-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Категория</label>
                <input
                  type="text"
                  value={editingProduct.category}
                  onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">URL изображения</label>
                <input
                  type="text"
                  value={editingProduct.image_url}
                  onChange={(e) => setEditingProduct({...editingProduct, image_url: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 border border-purple-500/20 text-white"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => updateProduct(editingProduct)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg"
                >
                  💾 Сохранить
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProduct(null);
                  }}
                  className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-bold"
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
