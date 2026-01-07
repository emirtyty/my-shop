'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]); // Состояние для историй
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const sessionData = localStorage.getItem('seller_session');
    if (!sessionData) { router.push('/login'); return; }
    
    const session = JSON.parse(sessionData);
    setSeller(session);
    
    fetchData(session.id || 1);
  }, [router]);

  const fetchData = async (sellerId: any) => {
    const [ordersRes, productsRes, storiesRes] = await Promise.all([
      supabase.from('orders').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false }),
      supabase.from('product_market').select('*').eq('seller_id', sellerId),
      supabase.from('seller_stories').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false })
    ]);
    setOrders(ordersRes.data || []);
    setProducts(productsRes.data || []);
    setStories(storiesRes.data || []);
    setLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !seller) return;
      setUploading(true);
      const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('images').upload(`stories/${fileName}`, file);
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`stories/${fileName}`);
      await supabase.from('seller_stories').insert([{ 
        image_url: publicUrl, 
        seller_id: seller.id,
        title: seller.shop_name || 'Маркет' 
      }]);
      alert("История опубликована!");
      fetchData(seller.id); // Обновляем список после загрузки
    } catch (e: any) { alert("Ошибка: " + e.message); } finally { setUploading(false); }
  };

  // Функция удаления истории
  const deleteStory = async (storyId: any) => {
    if (!confirm('Удалить эту историю?')) return;
    const { error } = await supabase.from('seller_stories').delete().eq('id', storyId);
    if (error) alert('Ошибка удаления');
    else fetchData(seller.id);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-orange-500 font-black italic">ЗАГРУЗКА...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-5 pb-32">
      <header className="flex justify-between items-center mb-10 pt-4">
        <div>
          <h1 className="text-3xl font-black text-orange-500 uppercase italic leading-none">ADMIN</h1>
          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">{seller?.login}</p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 bg-orange-500 rounded-[2.2rem] flex items-center justify-center text-2xl shadow-lg shadow-orange-500/30">
          {uploading ? '⏳' : '📸'}
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      </header>

      {/* СЕКЦИЯ МОИ ИСТОРИИ */}
      <section className="mb-12">
        <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-6 px-2">Управление историями ({stories.length})</h2>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
          {stories.map(s => (
            <div key={s.id} className="flex-shrink-0 flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full p-[2px] border-2 border-zinc-800">
                <img src={s.image_url} className="w-full h-full rounded-full object-cover" />
              </div>
              <button 
                onClick={() => deleteStory(s.id)}
                className="bg-red-500/10 text-red-500 text-[8px] font-black uppercase px-3 py-1 rounded-full border border-red-500/20"
              >
                Удалить
              </button>
            </div>
          ))}
          {stories.length === 0 && <p className="text-zinc-800 text-[10px] font-bold uppercase italic px-2">Нет активных историй</p>}
        </div>
      </section>

      {/* ТОВАРЫ */}
      <section className="mb-12">
        <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-6 px-2">Мои товары</h2>
        <div className="grid grid-cols-2 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-zinc-900/40 p-2 rounded-[2.5rem] border border-zinc-800/50">
              <img src={p.image_url} className="w-full h-32 object-cover rounded-[2rem] mb-3" />
              <div className="px-3 pb-2">
                <p className="font-bold text-[10px] truncate uppercase">{p.name}</p>
                <p className="text-orange-500 font-black italic text-xs">{p.price}₽</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ЗАКАЗЫ */}
      <section>
        <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-6 px-2">Заказы</h2>
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="bg-zinc-900 p-5 rounded-[2rem] border border-zinc-800 flex justify-between items-center">
               <div className="flex flex-col gap-1">
                  <p className="font-black text-xs uppercase italic">{o.product_name}</p>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">{o.status} • {o.buyer_phone}</p>
               </div>
               <p className="text-orange-500 font-black italic text-sm">{o.price}₽</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}