'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, X, Upload, ArrowRight, AlertCircle, CheckCircle, Package, ShoppingBag, Edit2, Trash2 } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  discount: number;
  image_url?: string;
  created_at: string;
  seller_id?: string;
  description?: string;
  stock?: number;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

export default function ProductsPage() {
  const [showModal, setShowModal] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentView, setCurrentView] = useState<'add' | 'list'>('add');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    discount: '',
    description: '',
    stock: '',
    image: null as File | null
  });

  // Загрузка данных при монтировании
  useEffect(() => {
    const loadData = async () => {
      try {
        // Проверяем подключение к Supabase
        console.log('🔍 Checking Supabase connection...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('👤 Auth session:', { session: !!session, error: !!sessionError, user: session?.user?.email });
        
        // Проверяем переменные окружения
        console.log('🔧 Environment variables:', {
          supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        });
        
        await Promise.all([loadCategories(), loadProducts()]);
      } catch (error) {
        console.error('Error loading data:', error);
        setDataError('Не удалось загрузить данные. Проверьте подключение к Supabase.');
      }
    };
    
    loadData();
  }, []);

  const loadProducts = async () => {
    try {
      console.log('🔄 Loading products from product_market...');
      
      // Пробуем простой запрос
      const { data, error } = await supabase
        .from('product_market')
        .select('id, name, category, price')
        .limit(5);
      
      console.log('📊 Simple products query result:', { data, error });
      
      // Если простой запрос сработал, пробуем полный
      if (!error && data) {
        const { data: fullData, error: fullError } = await supabase
          .from('product_market')
          .select('*')
          .order('created_at', { ascending: false });
        
        console.log('📊 Full products query result:', { data: fullData, error: fullError });
        
        if (fullError) {
          console.error('❌ Ошибка полного запроса:', fullError);
          showNotification('error', `Ошибка загрузки товаров: ${fullError.message}`);
          setProducts(data); // Используем данные из простого запроса
        } else {
          console.log('✅ Products loaded:', fullData?.length || 0);
          setProducts(fullData || []);
        }
      } else {
        console.error('❌ Ошибка простого запроса:', error);
        showNotification('error', `Ошибка загрузки товаров: ${error?.message || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки товаров:', error);
      showNotification('error', 'Не удалось загрузить товары');
    }
  };

  const loadCategories = async () => {
    try {
      console.log('🔄 Loading categories from product_market...');
      const { data, error } = await supabase
        .from('product_market')
        .select('category')
        .not('category', 'is', null);
      
      console.log('📊 Categories query result:', { data, error });
      
      if (error) {
        console.error('❌ Ошибка загрузки категорий:', error);
        showNotification('error', `Ошибка загрузки категорий: ${error.message}`);
        return;
      }
      
      if (data) {
        const uniqueCategories = [...new Set(data.map(item => item.category).filter(Boolean))];
        console.log('✅ Categories loaded:', uniqueCategories);
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки категорий:', error);
      showNotification('error', 'Не удалось загрузить категории');
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      discount: product.discount.toString(),
      description: product.description || '',
      stock: (product.stock || 0).toString(),
      image: null
    });
    setShowModal(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('product_market')
        .delete()
        .eq('id', productId);

      if (error) {
        showNotification('error', `Ошибка удаления: ${error.message}`);
        return;
      }

      showNotification('success', 'Товар успешно удален');
      setProducts(products.filter(p => p.id !== productId));
    } catch (error) {
      showNotification('error', `Неизвестная ошибка: ${error instanceof Error ? error.message : 'Произошла ошибка'}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Валидация
      if (!formData.name.trim()) {
        showNotification('error', 'Название товара обязательно');
        return;
      }

      if (!formData.category.trim()) {
        showNotification('error', 'Категория обязательна');
        return;
      }

      if (!formData.price || parseFloat(formData.price) <= 0) {
        showNotification('error', 'Цена должна быть больше 0');
        return;
      }

      let imageUrl = '';

      // Загрузка изображения
      if (formData.image) {
        const fileExt = formData.image.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, formData.image);

        if (uploadError) {
          showNotification('error', `Ошибка загрузки изображения: ${uploadError.message}`);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Сохранение товара (добавление или редактирование)
      const productData = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        price: parseFloat(formData.price),
        discount: formData.discount ? parseFloat(formData.discount) : 0,
        description: formData.description.trim(),
        stock: formData.stock ? parseInt(formData.stock) : 0,
        image_url: imageUrl || null,
      };

      let error;
      if (editingProduct) {
        // Редактирование существующего товара
        const result = await supabase
          .from('product_market')
          .update(productData)
          .eq('id', editingProduct.id);
        error = result.error;
      } else {
        // Добавление нового товара
        const result = await supabase
          .from('product_market')
          .insert({
            ...productData,
            created_at: new Date().toISOString()
          });
        error = result.error;
      }

      if (error) {
        showNotification('error', `Ошибка ${editingProduct ? 'обновления' : 'добавления'} товара: ${error.message}`);
        return;
      }

      // Успешное сохранение
      showNotification('success', `Товар успешно ${editingProduct ? 'обновлен' : 'добавлен'}`);
      setFormData({
        name: '',
        category: '',
        price: '',
        discount: '',
        description: '',
        stock: '',
        image: null
      });
      setShowModal(false);
      setEditingProduct(null);
      
      // Обновляем список категорий и товаров
      await loadCategories();
      await loadProducts();

    } catch (error) {
      showNotification('error', `Неизвестная ошибка: ${error instanceof Error ? error.message : 'Произошла ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Уведомления */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {notification.message}
        </div>
      )}

      {/* Заголовок и кнопки */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Товары</h1>
          <p className="text-gray-600 mt-1">Управление товарами магазина</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentView('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentView === 'list'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            Мои товары
          </button>
          <button
            onClick={() => setCurrentView('add')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentView === 'add'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Plus className="w-5 h-5" />
            Добавить товар
          </button>
        </div>
      </div>

      {/* Отображение ошибки */}
      {dataError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-medium text-red-900">Ошибка загрузки данных</h3>
              <p className="text-red-700 text-sm">{dataError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            {/* Заголовок модального окна */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingProduct ? 'Редактировать товар' : 'Новый товар'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Форма */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Название товара */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название товара
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Введите название товара"
                />
              </div>

              {/* Категория */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Категория
                </label>
                <div className="space-y-2">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">Выберите категорию</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="или введите новую категорию"
                  />
                </div>
              </div>

              {/* Цена */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цена (₽)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Скидка */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Скидка (%)
                </label>
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="0"
                  min="0"
                  max="100"
                />
              </div>

              {/* Описание товара */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание товара
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Описание товара..."
                  rows={3}
                />
              </div>

              {/* Количество на складе */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Количество на складе
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>

              {/* Фото товара */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Фото товара
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, image: e.target.files?.[0] || null })}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      {formData.image ? formData.image.name : 'Нажмите для загрузки фото'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Кнопки */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    'Сохранение...'
                  ) : (
                    <>
                      {editingProduct ? 'Сохранить' : 'Добавить'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Основной контент */}
      {currentView === 'add' ? (
        /* Режим добавления товара */
        <div>
          {/* Кнопка быстрого добавления */}
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Добавление товара</h3>
            <p className="text-gray-600 mb-6">Заполните форму для добавления нового товара</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Открыть форму
            </button>
          </div>
        </div>
      ) : (
        /* Режим списка товаров */
        <div>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет товаров</h3>
              <p className="text-gray-600">У вас пока нет добавленных товаров</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  {/* Изображение товара */}
                  {product.image_url ? (
                    <div className="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.name || 'Товар'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-400" />
                    </div>
                  )}

                  {/* Информация о товаре */}
                  <h3 className="font-semibold text-gray-900 mb-2">{product.name || 'Без названия'}</h3>
                  <p className="text-sm text-gray-600 mb-3">{product.category || 'Без категории'}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      {product.discount > 0 ? (
                        <div>
                          <span className="text-lg font-bold text-red-600">
                            {(product.price * (1 - product.discount / 100)).toLocaleString()} ₽
                          </span>
                          <span className="text-sm text-gray-500 line-through ml-2">
                            {product.price.toLocaleString()} ₽
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-gray-900">
                          {product.price.toLocaleString()} ₽
                        </span>
                      )}
                    </div>
                    {product.discount > 0 && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        -{product.discount}%
                      </span>
                    )}
                  </div>

                  {/* Кнопки действий */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
