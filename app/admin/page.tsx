'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const sessionData = localStorage.getItem('seller_session');
    if (!sessionData) {
      router.push('/login');
      return;
    }

    const session = JSON.parse(sessionData);
    setSeller(session);
    
    // ID может быть 1 или "1", приводим к строке для надежности
    const currentId = String(session.id || session.telegram_id);
    
    if (currentId) {
      loadData(currentId);
    }
  }, [router]);

  const loadData = async (id: string) => {
    setLoading(true);
    await Promise.all([
      fetchOrders(id),
      fetchProducts(id)
    ]);
    setLoading(false);
  };

  const fetchOrders = async (id: string) => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('seller_id', id)
      .order('created_at', { ascending: false });
    setOrders(data || []);
  };

  const fetchProducts = async (id: string) => {
    const { data, error } = await supabase
      .from('product_market')
      .select('*')
      .eq('seller_id', id);
    
    if (error) console.error("Ошибка загрузки товаров:", error.message);
    setProducts(data || []);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !seller) return;
      
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `stories/${fileName}`;

      // 1. Грузим в Storage
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      // 2. Пишем в таблицу seller_stories
      const { error: dbError } = await supabase.from('seller_stories').insert([{
        image_url: publicUrl,
        title: seller.shop_name || 'Маркет',
        seller_id: String(seller.id || seller.telegram_id)
      }]);

      if (dbError) throw dbError;
      alert("История опубликована! 📸");
    } catch (error: any) {
      alert("Ошибка: " + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateStatus = async (orderId: any, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    fetchOrders(String(seller.id || seller.telegram_id));
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-orange-500 font-black animate-pulse uppercase italic">Синхронизация...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24 font-sans">
      {/* Шапка */}
      <header className="mb-10 px-2 flex justify-between items-center pt-4">
        <div>
          <h1 className="text-3xl font-black text-orange-500 uppercase italic leading-none">Admin</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase mt-1">{seller?.login}</p>
        </div>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-16 h-16 bg-orange-500 rounded-[2rem] flex items-center justify-center text-2xl shadow-lg shadow-orange-500/30 active:scale-90 transition-all"
        >
          {uploading ? '⏳' : '📸'}
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      </header>

      {/* Список товаров */}
      <section className="mb-12">
        <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 px-2">Мои товары ({products.length})</h2>
        <div className="grid grid-cols-2 gap-3 px-1">
          {products.map((product) => (
            <div key={product.id} className="bg-zinc-900/40 rounded-[2rem] p-3 border border-zinc-800/50">
              <img src={product.image_url} className="w-full h-24 object-cover rounded-2xl mb-2 bg-zinc-800" />
              <p className="font-bold text-[11px] truncate px-1">{product.name}</p>
              <p className="text-orange-500 font-black text-[12px] px-1 italic">{product.price}₽</p>
            </div>
          ))}
        </div>
      </section>

      {/* Список заказов */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 px-2">Новые заказы ({orders.length})</h2>
        {orders.map((order) => (
          <div key={order.id} className="bg-zinc-900 rounded-[2.5rem] p-6 border border-zinc-800">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg leading-tight w-[70%]">{order.product_name}</h3>
              <p className="text-orange-500 font-black italic">{order.price}₽</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => updateStatus(order.id, 'Собираю')} className="bg-zinc-800 py-3 rounded-2xl text-[9px] font-black uppercase">Сборка</button>
              <button onClick={() => updateStatus(order.id, 'Доставляется')} className="bg-zinc-800 py-3 rounded-2xl text-[9px] font-black uppercase">В пути</button>
              <button onClick={() => updateStatus(order.id, 'Завершен')} className="col-span-2 bg-orange-500 py-4 rounded-[1.5rem] text-[11px] font-black uppercase italic mt-2">Завершить</button>
            </div>
          </div>
        ))}
      </section>

      <button 
        onClick={() => { localStorage.removeItem('seller_session'); router.push('/login'); }}
        className="mt-12 w-full text-zinc-700 text-[9px] font-black uppercase tracking-[0.2em] py-4"
      >
        Выйти из аккаунта
      </button>
    </div>
  );
}