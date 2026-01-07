'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [seller, setSeller] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('seller_session') || '{}');
    if (session.telegram_id) {
      setSeller(session);
      fetchOrders(session.telegram_id);
    }
  }, []);

  const fetchOrders = async (id: any) => {
    const { data } = await supabase.from('orders').select('*').eq('seller_id', id).order('created_at', { ascending: false });
    setOrders(data || []);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !seller) return;
      
      setUploading(true);

      // 1. Загружаем файл в бакет 'images'
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `stories/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Получаем ссылку
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      // 3. Записываем в таблицу историй
      const { error: dbError } = await supabase.from('seller_stories').insert([{
        image_url: publicUrl,
        title: seller.shop_name, // Название магазина под кружочком
        seller_id: seller.telegram_id
      }]);

      if (dbError) throw dbError;

      alert("История опубликована! 📸");
    } catch (error: any) {
      alert("Ошибка при загрузке: " + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateStatus = async (orderId: any, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    fetchOrders(seller.telegram_id);
  };

  if (!seller) return <div className="p-10 text-white text-center font-bold uppercase tracking-widest">Вход в систему...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      <header className="mb-10 px-2 flex justify-between items-center pt-4">
        <div>
          <h1 className="text-3xl font-black text-orange-500 uppercase italic leading-none">Admin</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase mt-1">{seller.shop_name}</p>
        </div>
        
        {/* КНОПКА ЗАГРУЗКИ (Камера/Галерея) */}
        <div className="relative">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`w-16 h-16 rounded-[2rem] flex items-center justify-center text-2xl shadow-2xl transition-all active:scale-90 ${
              uploading ? 'bg-zinc-800' : 'bg-orange-500 shadow-orange-500/30'
            }`}
          >
            {uploading ? <span className="animate-spin text-sm">⏳</span> : '📸'}
          </button>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Активные заказы</h2>
          <span className="bg-zinc-900 text-zinc-500 px-3 py-1 rounded-full text-[9px] font-bold">{orders.length}</span>
        </div>

        {orders.map((order) => (
          <div key={order.id} className="bg-zinc-900/50 rounded-[2.5rem] p-6 border border-zinc-800/50 backdrop-blur-sm shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg leading-tight w-[70%]">{order.product_name}</h3>
              <p className="text-orange-500 font-black italic">{order.price}₽</p>
            </div>

            <div className="flex gap-2 mb-6">
               <div className="bg-white/5 text-zinc-400 px-4 py-1.5 rounded-full text-[10px] font-bold border border-white/5">{order.buyer_phone}</div>
               <div className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic tracking-tighter shadow-lg shadow-orange-500/20">{order.status}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => updateStatus(order.id, 'Собираю')} className="bg-zinc-800/80 hover:bg-zinc-700 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-colors">Сборка</button>
              <button onClick={() => updateStatus(order.id, 'Доставляется')} className="bg-zinc-800/80 hover:bg-zinc-700 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-colors">В пути</button>
              <button onClick={() => updateStatus(order.id, 'У дверей')} className="col-span-2 bg-orange-500 hover:bg-orange-600 py-4.5 rounded-[1.5rem] text-[11px] font-black uppercase italic shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]">📍 Я У ДВЕРЕЙ</button>
              <button onClick={() => updateStatus(order.id, 'Завершен')} className="col-span-2 text-zinc-700 py-3 text-[9px] font-black uppercase tracking-widest mt-2 hover:text-zinc-500">Завершить заказ</button>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="py-20 text-center opacity-20 flex flex-col items-center">
            <span className="text-4xl mb-2">📦</span>
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Заказов пока нет</p>
          </div>
        )}
      </section>
    </div>
  );
}