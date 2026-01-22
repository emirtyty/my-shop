'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Add CSS animations
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes bounce-in {
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
    .animate-bounce-in {
      animation: bounce-in 0.5s ease-out;
    }
  `;
  document.head.appendChild(style);
}

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
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [cachedData, setCachedData] = useState<{products: Product[], lastUpdate: number} | null>(null);
  const [autoRestock, setAutoRestock] = useState(false);
  const [restockThreshold, setRestockThreshold] = useState(5);
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
  const [showStoriesModal, setShowStoriesModal] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchStories();
    fetchSellerInfo();
    
    // Периодическая проверка автопополнения (каждые 5 минут)
    const interval = setInterval(() => {
      if (autoRestock) {
        checkAutoRestock();
      }
    }, 300000); // 5 минут
    
    return () => clearInterval(interval);
  }, [autoRestock]);

  const fetchProducts = async () => {
    try {
      // Сначала проверяем кэш
      const cached = getCachedData();
      if (cached) {
        setProducts(cached);
        calculateStats(cached);
      }

      const { data, error } = await supabase
        .from('product_market')
        .select('*, sellers(shop_name, id, telegram_url, vk_url, whatsapp_url, instagram_url)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const products = data || [];
      setProducts(products);
      cacheData(products);
      calculateStats(products);
      
      // Проверяем автопополнение
      await checkAutoRestock();
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
      // Используем первое изображение из галереи или заглушку
      const imageUrl = imagePreviews.length > 0 ? imagePreviews[0] : 'https://via.placeholder.com/150';
      
      const { error } = await supabase
        .from('product_market')
        .insert({
          name: newProduct.name,
          price: newProduct.price,
          category: newProduct.category,
          discount: newProduct.discount,
          stock_quantity: newProduct.stock_quantity,
          image_url: imageUrl,
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
      setSelectedImages([]);
      setImagePreviews([]);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Stories функции
  const createStory = async (productId: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const { error } = await supabase
        .from('stories')
        .insert({
          product_id: productId,
          image_url: product.image_url,
          title: product.name,
          price: product.price,
          discount: product.discount,
          description: `Отличный товар из категории ${product.category}`,
          link_url: `/product/${productId}`
        });

      if (error) throw error;
      
      await fetchStories();
      addToast('Story успешно создан', 'success');
    } catch (error) {
      console.error('Error creating story:', error);
      addToast('Ошибка при создании Story', 'error');
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
      addToast('Story удален', 'success');
    } catch (error) {
      console.error('Error deleting story:', error);
      addToast('Ошибка при удалении Story', 'error');
    }
  };

  // Кэширование данных
  const cacheData = (products: Product[]) => {
    const now = Date.now();
    setCachedData({ products, lastUpdate: now });
    localStorage.setItem('cached_products', JSON.stringify({ products, lastUpdate: now }));
  };

  const getCachedData = () => {
    const cached = localStorage.getItem('cached_products');
    if (cached) {
      const data = JSON.parse(cached);
      const now = Date.now();
      // Кэш действителен 5 минут
      if (now - data.lastUpdate < 300000) {
        return data.products;
      }
    }
    return null;
  };

  // Автоматическое восполнение запасов
  const checkAutoRestock = async () => {
    if (!autoRestock) return;
    
    const lowStockProducts = products.filter(p => 
      (p.stock_quantity || 0) <= restockThreshold && (p.stock_quantity || 0) > 0
    );
    
    for (const product of lowStockProducts) {
      const newQuantity = Math.min((product.stock_quantity || 0) * 2, 50); // Удваиваем, но не более 50
      await supabase
        .from('product_market')
        .update({ stock_quantity: newQuantity })
        .eq('id', product.id);
    }
    
    if (lowStockProducts.length > 0) {
      addToast(`Автоматически пополнено ${lowStockProducts.length} товаров`, 'success');
      await fetchProducts();
    }
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

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
          <div className="w-full sm:w-auto">
            <button
              onClick={() => setShowSocialModal(true)}
              className="block w-full px-4 py-2 sm:py-3 bg-gray-800 text-white rounded-2xl font-bold hover:bg-gray-700 cursor-pointer text-center text-sm sm:text-base"
            >
              📱 Соцсети
            </button>
          </div>
          <div className="w-full sm:w-auto">
            <button
              onClick={() => setShowStoriesModal(true)}
              className="block w-full px-4 py-2 sm:py-3 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 cursor-pointer text-center text-sm sm:text-base"
            >
              📱 Stories
            </button>
          </div>
          <div className="w-full sm:w-auto">
            <button
              onClick={() => setAutoRestock(!autoRestock)}
              className={`block w-full px-4 py-2 sm:py-3 rounded-2xl font-bold cursor-pointer text-center text-sm sm:text-base transition-colors ${
                autoRestock 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              🔄 {autoRestock ? 'Автопополнение ВКЛ' : 'Автопополнение ВЫКЛ'}
            </button>
          </div>
        </div>
        {autoRestock && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Порог: {restockThreshold} шт.</span>
            <button
              onClick={() => setRestockThreshold(prev => Math.max(1, prev - 1))}
              className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
            >
              -
            </button>
            <button
              onClick={() => setRestockThreshold(prev => prev + 1)}
              className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Smart Notification Bell */}
      {(stats.lowStock > 0 || stats.outOfStock > 0) && (
        <div className="fixed top-20 right-4 z-50 animate-bounce-in">
          <button className="relative p-3 bg-red-600 rounded-full border border-red-700 hover:bg-red-700 transition-all duration-300 shadow-lg hover:scale-105 animate-pulse">
            <span className="text-2xl">🔔</span>
            <span className="absolute -top-1 -right-1 bg-white text-red-600 text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg">
              {stats.lowStock + stats.outOfStock}
            </span>
          </button>
        </div>
      )}

      <div className="pb-24">
        {/* Products Tab */}
        {activeTab === 'products' && (
          <div>
            <div className="bg-white/5 backdrop-blur-2xl p-4 sm:p-6 rounded-3xl border border-white/10 shadow-2xl mb-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
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
                                  className="flex-1 px-2 py-1 sm:px-3 bg-blue-600/80 hover:bg-blue-700/80 text-white text-xs rounded-xl backdrop-blur-xl border border-white/20"
                                >
                                  ✏️ Изменить
                                </button>
                                <button
                                  onClick={() => createStory(product.id)}
                                  className="flex-1 px-2 py-1 sm:px-3 bg-purple-600/80 hover:bg-purple-700/80 text-white text-xs rounded-xl backdrop-blur-xl border border-white/20"
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

        {/* Add Product Tab */}
        {activeTab === 'add-product' && (
          <div className="bg-white/5 backdrop-blur-2xl p-4 sm:p-6 rounded-3xl border border-white/10 shadow-2xl">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
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
                  <label className="block text-sm font-medium text-cyan-300 mb-2">Изображения товара</label>
                  <div className="space-y-3">
                    <label className="block w-full px-4 py-8 bg-gray-800 rounded-2xl border-2 border-dashed border-gray-600 text-center cursor-pointer hover:border-cyan-500 hover:bg-gray-700 transition-colors">
                      <span className="text-3xl mb-2 block">📸</span>
                      <span className="text-gray-300 text-sm">Выберите изображения</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                    {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={preview} 
                              alt={`Предпросмотр ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg border border-gray-600"
                            />
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={createProduct}
                  className="w-full px-4 py-2 sm:px-6 sm:py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 text-sm sm:text-base"
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
                  className="flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 text-sm sm:text-base"
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
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700"
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
    {/* Stories Modal */}
      {showStoriesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-3xl border border-gray-700 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-6">📱 Stories</h3>
            <div className="space-y-4">
              <div className="text-gray-300 text-sm">
                <p className="mb-2">Stories - это временные карточки товаров, которые исчезают через 24 часа.</p>
                <p className="mb-2">• Горизонтальная навигация (свайп влево/вправо)</p>
                <p className="mb-2">• Автовоспроизведение каждые 5 секунд</p>
                <p className="mb-2">• Статистика просмотров и кликов</p>
                <p>• Автоматическое удаление через 24 часа</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStoriesModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-2xl font-bold"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
