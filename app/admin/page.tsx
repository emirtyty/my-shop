'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]); // Состояние для товаров
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
    // Загружаем и заказы, и товары
    Promise.all([
      fetchOrders(session.id),
      fetchProducts(session.id)
    ]).then(() => setLoading(false));
  }, []);

  const fetchOrders = async (id: any) => {
    const { data } = await supabase.from('orders').select('*').eq('seller_id', id);
    setOrders(data || []);
  };

  const fetchProducts = async (id: any) => {
    const { data } = await supabase.from('product_market').select('*').eq('seller_id', id);
    setProducts(data || []);
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
      await supabase.from('seller_stories').insert([{ image_url: publicUrl, seller_id: seller.id }]);
      alert("История опубликована! 📸");
    } catch (e: any) { alert("Ошибка: " + e.message); } finally { setUploading(false); }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-orange-500 font-black italic">ЗАГРУЗКА...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-32">
      <header className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-orange-500 uppercase italic">Admin</h1>
        <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 bg-orange-500 rounded-[2rem] text-2xl shadow-lg shadow-orange-500/20">
          {uploading ? '⏳' : '📸'}
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      </header>

      {/* СЕКЦИЯ ТОВАРОВ */}
      <section className="mb-12">
        <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4 px-2">Мои товары ({products.length})</h2>
        <div className="grid grid-cols-2 gap-3">
          {products.map(p => (
            <div key={p.id} className="bg-zinc-900/50 p-4 rounded-[2rem] border border-zinc-800">
              <img src={p.image_url} className="w-full h-24 object-cover rounded-2xl mb-2" />
              <p className="font-bold text-xs truncate">{p.name}</p>
              <p className="text-orange-500 font-black text-sm">{p.price}₽</p>
            </div>
          ))}
        </div>
      </section>

      {/* СЕКЦИЯ ЗАКАЗОВ */}
      <section>
        <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4 px-2">Заказы ({orders.length})</h2>
        {orders.map(o => (
          <div key={o.id} className="bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-800 mb-4 text-sm font-bold">
            {o.product_name} — <span className="text-orange-500">{o.status}</span>
          </div>
        ))}
      </section>
    </div>
  );
}