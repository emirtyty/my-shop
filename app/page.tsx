'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
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
    
    const fetchData = async () => {
      const sellerId = session.id || 1;
      const [ordersRes, productsRes] = await Promise.all([
        supabase.from('orders').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false }),
        supabase.from('product_market').select('*').eq('seller_id', sellerId)
      ]);
      setOrders(ordersRes.data || []);
      setProducts(productsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [router]);

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
    } catch (e: any) { alert("Ошибка: " + e.message); } finally { setUploading(false); }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-orange-500 font-black italic">ЗАГРУЗКА...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-5 pb-32">
      <header className="flex justify-between items-center mb-10 pt-4">
        <div>
          <h1 className="text-3xl font-black text-orange-500 uppercase italic">ADMIN</h1>
          <p className="text-zinc-500 text-[10px] uppercase font-bold">{seller?.login}</p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-orange-500/30">
          {uploading ? '⏳' : '📸'}
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      </header>

      <section className="mb-10">
        <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Мои товары</h2>
        <div className="grid grid-cols-2 gap-3">
          {products.map(p => (
            <div key={p.id} className="bg-zinc-900/50 p-2 rounded-3xl border border-zinc-800">
              <img src={p.image_url} className="w-full h-28 object-cover rounded-2xl mb-2" />
              <div className="px-2 pb-1 text-[11px] font-bold truncate">{p.name}</div>
              <div className="px-2 text-orange-500 font-black italic">{p.price}₽</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Новые заказы</h2>
        {orders.map(o => (
          <div key={o.id} className="bg-zinc-900 p-5 rounded-[2rem] border border-zinc-800 mb-3 flex justify-between items-center">
             <div>
                <p className="font-bold text-sm uppercase italic">{o.product_name}</p>
                <p className="text-[10px] text-zinc-500">{o.status}</p>
             </div>
             <p className="text-orange-500 font-black italic">{o.price}₽</p>
          </div>
        ))}
      </section>
    </div>
  );
}