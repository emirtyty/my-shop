'use client';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [category, setCategory] = useState('Все');

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*');
    if (data) setProducts(data);
  }

  const addToCart = (product: any) => {
    setCart([...cart, product]);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const totalPrice = cart.reduce((sum, item) => sum + Number(item.price), 0);

  // ФУНКЦИЯ ЗАКАЗА С ОТПРАВКОЙ В TELEGRAM
  const checkout = async () => {
    if (cart.length === 0) return;
    const phone = prompt("Введите номер телефона для связи:");
    if (!phone) return;

    try {
      const pNames = cart.map(i => i.name).join(', ');
      
      // 1. Сохраняем в Supabase
      const { data, error } = await supabase.from('orders').insert([{
        product_name: pNames,
        price: totalPrice,
        buyer_phone: phone,
        status: 'Новый'
      }]).select().single();

      if (error) throw error;

      if (data) {
        // 2. ОТПРАВКА БОТУ
        await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: data.id,
            product_name: pNames,
            price: totalPrice,
            buyer_phone: phone
          })
        });

        alert("Заказ успешно оформлен! Бот пришлет уведомление.");
        setCart([]);
        setIsCartOpen(false);
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка при оформлении заказа");
    }
  };

  const filteredProducts = category === 'Все' 
    ? products 
    : products.filter(p => p.category === category);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Шапка */}
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold text-red-600 italic">EMIR MARKET</h1>
        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative p-2 bg-gray-100 rounded-full"
        >
          🛒
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </button>
      </header>

      {/* Категории */}
      <div className="flex overflow-x-auto p-4 gap-2 no-scrollbar">
        {['Все', 'Розы', 'Пионы', 'Гортензии', 'Букеты'].map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-full whitespace-nowrap ${
              category === cat ? 'bg-red-500 text-white' : 'bg-white text-gray-600 border'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Список товаров */}
      <div className="grid grid-cols-2 gap-4 p-4">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border">
            <img src={product.image_url} alt={product.name} className="w-full h-40 object-cover" />
            <div className="p-3">
              <h3 className="font-medium text-sm text-gray-800 h-10 overflow-hidden">{product.name}</h3>
              <p className="text-red-600 font-bold mt-1">{product.price} ₽</p>
              <button
                onClick={() => addToCart(product)}
                className="w-full mt-2 bg-gray-900 text-white py-2 rounded-xl text-sm active:scale-95 transition"
              >
                В корзину
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Корзина (Модалка) */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Корзина</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 text-2xl">✕</button>
            </div>
            
            {cart.length === 0 ? (
              <p className="text-center py-10 text-gray-500">В корзине пока пусто</p>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cart.map((item, index) => (
                    <div key={index} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.price} ₽</p>
                      </div>
                      <button onClick={() => removeFromCart(index)} className="text-red-500">Удалить</button>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-xl font-bold mb-6">
                    <span>Итого:</span>
                    <span>{totalPrice} ₽</span>
                  </div>
                  <button
                    onClick={checkout}
                    className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition"
                  >
                    Оформить заказ
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}