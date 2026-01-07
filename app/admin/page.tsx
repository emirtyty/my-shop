'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
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

    try {
      const session = JSON.parse(sessionData);
      // Используем id=1 как в твоей базе на скриншоте
      if (session.id || session.login) {
        setSeller(session);
        fetchOrders(session.id || 1);
        setLoading(false);
      } else {
        router.push('/login');
      }
    } catch (e) {
      localStorage.removeItem('seller_session');
      router.push('/login');
    }
  }, []);

  const fetchOrders = async (sellerId: any) => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });
    setOrders(data || []);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !seller) return;
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('images').upload(`stories/${fileName}`, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('images').getPublicUrl(`stories/${fileName}`);
      await supabase.from('seller_stories').insert([{
        image_url: publicUrl,
        title: seller.shop_name || 'Маркет',
        seller_id: (seller.id || 1).toString()
      }]);
      alert("История опубликована! 📸");
    } catch (error: any) {
      alert("Ошибка: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const updateStatus = async (id: any, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchOrders(seller.id || 1);
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-10">
      <div className="text-orange-500 font-black animate-pulse uppercase italic mb-4">Загрузка данных...</div>
      <button onClick={() => { localStorage.removeItem('seller_session'); router.push('/login'); }} className="text-zinc-600 text-[10px] underline">СБРОСИТЬ И ВОЙТИ ЗАНОВО</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      <header className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-2xl font-black text-orange-500 italic uppercase">Админ-панель</h1>
          <p className="text-zinc-500 text-[10px]">{seller.login}</p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 text-xl">
          {uploading ? '⏳' : '📸'}
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      </header>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-zinc-900 p-6 rounded-[2rem] border border-zinc-800">
            <div className="flex justify-between mb-4">
              <span className="font-bold">{order.product_name}</span>
              <span className="text-orange-500 font-black">{order.price}₽</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => updateStatus(order.id, 'Собираю')} className="bg-zinc-800 py-3 rounded-xl text-[10px] font-bold">СБОРКА</button>
              <button onClick={() => updateStatus(order.id, 'Доставляется')} className="bg-zinc-800 py-3 rounded-xl text-[10px] font-bold">В ПУТИ</button>
              <button onClick={() => updateStatus(order.id, 'Завершен')} className="col-span-2 bg-orange-500 py-4 rounded-xl text-xs font-black mt-2">ЗАВЕРШИТЬ</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}