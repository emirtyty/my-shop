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
    const checkSession = () => {
      const sessionData = localStorage.getItem('seller_session');
      
      if (!sessionData) {
        router.push('/login');
        return;
      }

      try {
        const session = JSON.parse(sessionData);
        // В твоей базе ID=1, привязываемся к нему или к telegram_id
        const sellerId = session.id || session.telegram_id;
        
        if (sellerId) {
          setSeller(session);
          fetchOrders(sellerId);
          setLoading(false);
        } else {
          router.push('/login');
        }
      } catch (e) {
        localStorage.removeItem('seller_session');
        router.push('/login');
      }
    };

    checkSession();
  }, [router]);

  const fetchOrders = async (id: any) => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('seller_id', id)
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
      const filePath = `stories/${fileName}`;

      // Загрузка в Supabase Storage (бакет 'images')
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      // Сохранение в таблицу seller_stories
      const { error: dbError } = await supabase.from('seller_stories').insert([{
        image_url: publicUrl,
        title: seller.shop_name || 'Маркет',
        seller_id: (seller.id || seller.telegram_id).toString()
      }]);

      if (dbError) throw dbError;
      alert("История опубликована! 📸");
    } catch (error: any) {
      alert("Ошибка загрузки: " + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateStatus = async (orderId: any, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    fetchOrders(seller.id || seller.telegram_id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <div className="text-orange-500 font-black animate-pulse uppercase italic mb-4">
          Загрузка админки...
        </div>
        <button 
          onClick={() => { localStorage.removeItem('seller_session'); router.push('/login'); }}
          className="text-zinc-600 text-[10px] font-bold uppercase border border-zinc-800 px-4 py-2 rounded-lg"
        >
          Сбросить и войти заново
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24 font-sans">
      <header className="mb-8 px-2 flex justify-between items-center pt-4">
        <div>
          <h1 className="text-3xl font-black text-orange-500 uppercase italic leading-none">Admin</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase mt-1">{seller?.shop_name || 'Магазин'}</p>
        </div>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`w-16 h-16 rounded-[2rem] flex items-center justify-center text-2xl shadow-2xl transition-all active:scale-90 ${
            uploading ? 'bg-zinc-800' : 'bg-orange-500 shadow-orange-500/30'
          }`}
        >
          {uploading ? '⏳' : '📸'}
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      </header>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="py-20 text-center opacity-20">
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Заказов пока нет</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-zinc-900 rounded-[2.5rem] p-6 border border-zinc-800/50">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg leading-tight w-[70%]">{order.product_name}</h3>
                <p className="text-orange-500 font-black italic">{order.price}₽</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => updateStatus(order.id, 'Собираю')} className="bg-zinc-800 py-3.5 rounded-2xl text-[9px] font-black uppercase">Сборка</button>
                <button onClick={() => updateStatus(order.id, 'Доставляется')} className="bg-zinc-800 py-3.5 rounded-2xl text-[9px] font-black uppercase">В пути</button>
                <button onClick={() => updateStatus(order.id, 'Завершен')} className="col-span-2 bg-orange-500 py-4.5 rounded-[1.5rem] text-[11px] font-black uppercase italic mt-2">Завершить</button>
              </div>
            </div>
          ))
        )}
      </div>

      <button 
        onClick={() => { localStorage.removeItem('seller_session'); router.push('/login'); }}
        className="mt-12 w-full text-zinc-700 text-[9px] font-black uppercase tracking-[0.2em] hover:text-orange-500 transition-colors"
      >
        Выйти из аккаунта
      </button>
    </div>
  );
}