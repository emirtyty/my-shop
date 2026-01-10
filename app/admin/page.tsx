"use client";

import React, { useState, useEffect } from 'react';
import { 
  FiPackage, 
  FiClock, 
  FiCheckCircle, 
  FiTrash2, 
  FiSearch, 
  FiLogOut,
  FiExternalLink,
  FiPlus
} from 'react-icons/fi';

interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
}

interface Order {
  id: string;
  items: string;
  status: string;
  date: string;
}

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const mockProducts: Product[] = [
          { id: 'prod_1', name: 'РОЗЫ', price: 4950, oldPrice: 15000, image: 'https://via.placeholder.com/150' }
        ];
        const mockOrders: Order[] = [
          { id: 'ord_9928374', items: 'РОЗЫ, РОЗЫ, РОЗЫ...', status: 'active', date: '10.01.2026' }
        ];
        setProducts(mockProducts);
        setOrders(mockOrders);
        setLoading(false);
      } catch (error) {
        console.error("Ошибка загрузки:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatId = (id: any) => {
    if (typeof id === 'string' && id.length > 0) return id.slice(-6).toUpperCase();
    return 'N/A';
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-2xl font-black italic text-orange-500 uppercase">АДМИН PANEL</h1>
          <div className="flex bg-white/5 p-1 rounded-xl">
            <button onClick={() => setActiveTab('products')} className={`px-6 py-2 rounded-lg text-sm font-bold ${activeTab === 'products' ? 'bg-orange-500 text-white' : 'text-white/50'}`}>ТОВАРЫ</button>
            <button onClick={() => setActiveTab('orders')} className={`px-6 py-2 rounded-lg text-sm font-bold ${activeTab === 'orders' ? 'bg-orange-500 text-white' : 'text-white/50'}`}>ЗАКАЗЫ</button>
          </div>
          <button onClick={() => { localStorage.removeItem('isAdmin'); window.location.reload(); }} className="p-3 hover:text-red-500 transition-colors"><FiLogOut size={22} /></button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
            <input type="text" placeholder="ПОИСК..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white" />
          </div>
          <button className="bg-white text-black px-8 py-4 rounded-2xl font-black hover:bg-orange-500 hover:text-white transition-all">ДОБАВИТЬ</button>
        </div>

        {activeTab === 'products' ? (
          <div className="grid grid-cols-1 gap-4">
            {products.map((product) => (
              <div key={product.id} className="bg-white/5 border border-white/5 p-4 rounded-3xl flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-black"><img src={product.image} alt="" className="w-full h-full object-cover" /></div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-white/30 mb-1">ID: {formatId(product.id)}</div>
                  <h3 className="text-lg font-black uppercase">{product.name}</h3>
                  <div className="text-xl font-black text-orange-500">{product.price} ₽</div>
                </div>
                <button className="bg-white/10 hover:bg-red-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center transition-all"><FiTrash2 size={18} /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white/5 border border-white/5 p-6 rounded-3xl flex justify-between items-center">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500"><FiPackage size={28} /></div>
                  <div>
                    <span className="font-black text-xl uppercase">Заказ #{formatId(order.id)}</span>
                    <p className="text-white/40 text-sm">{order.items}</p>
                  </div>
                </div>
                <button className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black text-sm">ЗАВЕРШИТЬ</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;