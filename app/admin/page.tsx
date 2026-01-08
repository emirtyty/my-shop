'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false); // Состояние для спойлера
  
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: '', image: null as File | null });

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
      supabase.from('product_market').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false }),
      supabase.from('seller_stories').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false })
    ]);
    setOrders(ordersRes.data || []);
    setProducts(productsRes.data || []);
    setStories(storiesRes.data || []);
    setLoading(false);
  };

  // Разделяем заказы на активные и завершенные
  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'Завершен'), [orders]);
  const completedOrders = useMemo(() => orders.filter(o => o.status === 'Завершен'), [orders]);

  // --- УПРАВЛЕНИЕ ТОВАРАМИ ---
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.image) return alert("Заполните все поля!");
    setUploading(true);
    try {
      const fileName = `prod_${Date.now()}.${newProduct.image.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('images').upload(`products/${fileName}`, newProduct.image);
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`products/${fileName}`);
      
      await supabase.from('product_market').insert([{
        name: newProduct.name,
        price: Number(newProduct.price),
        category: newProduct.category || 'Общее',
        image_url: publicUrl,
        seller_id: seller.id
      }]);

      alert("Товар добавлен!");
      setShowAddModal(false);
      setNewProduct({ name: '', price: '', category: '', image: null });
      fetchData(seller.id);
    } catch (e: any) { alert(e.message); } finally { setUploading(false); }
  };

  const deleteProduct = async (id: any) => {
    if (!confirm('Удалить товар?')) return;
    await supabase.from('product_market').delete().eq('id', id);
    fetchData(seller.id);
  };

  const updatePrice = async (id: any) => {
    const p = prompt('Новая цена:');
    if (p) {
      await supabase.from('product_market').update({ price: Number(p) }).eq('id', id);
      fetchData(seller.id);
    }
  };

  const applyDiscount = async (id: any, currentPrice: number) => {
    const percent = prompt('Введите % скидки (например, 20):');
    if (!percent) return;
    const finalPrice = Math.round(currentPrice - (currentPrice * (Number(percent) / 100)));
    if (confirm(`Новая цена: ${finalPrice}₽. Применить?`)) {
      await supabase.from('product_market').update({ price: finalPrice }).eq('id', id);
      fetchData(seller.id);
    }
  };

  // --- УПРАВЛЕНИЕ ИСТОРИЯМИ ---
  const handleStoryUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileName = `st_${Date.now()}.${file.name.split('.').pop()}`;
    await supabase.storage.from('images').upload(`stories/${fileName}`, file);
    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`stories/${fileName}`);
    await supabase.from('seller_stories').insert([{ image_url: publicUrl, seller_id: seller.id, title: seller.shop_name }]);
    setUploading(false);
    fetchData(seller.id);
  };

  const deleteStory = async (id: any) => {
    await supabase.from('seller_stories').delete().eq('id', id);
    fetchData(seller.id);
  };

  // --- УПРАВЛЕНИЕ ЗАКАЗАМИ ---
  const updateOrderStatus = async (id: any, status: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-orange-500 font-black italic uppercase">Загрузка админки...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-5 pb-32 font-sans tracking-tight">
      <header className="flex justify-between items-center mb-10 pt-4 px-2">
        <h1 className="text-3xl font-black text-orange-500 italic uppercase leading-none">Admin</h1>
        <div className="flex gap-3">
          <button onClick={() => setShowAddModal(true)} className="bg-white text-black text-[9px] font-black px-5 py-4 rounded-2xl uppercase italic active:scale-95 transition-all">
            + Товар
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-xl shadow-lg active:scale-95 transition-all">
            {uploading ? '⏳' : '📸'}
          </button>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleStoryUpload} className="hidden" />
      </header>

      {/* СТОРИС И ТОВАРЫ (Оставил как было) */}
      <section className="mb-12">
        <h2 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 px-2">Ваши истории</h2>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {stories.map(s => (
            <div key={s.id} className="flex-shrink-0 flex flex-col items-center gap-2">
              <img src={s.image_url} className="w-16 h-16 rounded-full object-cover border-2 border-orange-500 p-0.5" />
              <button onClick={() => deleteStory(s.id)} className="text-[7px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded-full uppercase">Удалить</button>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-6 px-2">Управление товарами ({products.length})</h2>
        <div className="grid grid-cols-1 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-zinc-900/40 p-4 rounded-[2.5rem] border border-zinc-800/50 flex gap-4">
              <img src={p.image_url} className="w-24 h-24 rounded-[1.8rem] object-cover shadow-2xl" />
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <h3 className="font-bold text-[10px] uppercase leading-tight line-clamp-1">{p.name}</h3>
                  <p className="text-orange-500 font-black text-sm italic mt-1">{p.price} ₽</p>
                </div>
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => updatePrice(p.id)} className="bg-zinc-800 text-[7px] font-black px-2.5 py-2.5 rounded-xl uppercase">Цена</button>
                  <button onClick={() => applyDiscount(p.id, p.price)} className="bg-orange-500/10 text-orange-500 text-[7px] font-black px-2.5 py-2.5 rounded-xl uppercase border border-orange-500/20">%</button>
                  <button onClick={() => deleteProduct(p.id)} className="bg-red-500/10 text-red-500 text-[7px] font-black px-2.5 py-2.5 rounded-xl uppercase border border-red-500/20">Удалить</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* СЕКЦИЯ АКТИВНЫХ ЗАКАЗОВ */}
      <section>
        <h2 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-6 px-2">Новые заказы ({activeOrders.length})</h2>
        <div className="space-y-4 mb-10">
          {activeOrders.map(o => (
            <div key={o.id} className="bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-800">
              <div className="flex justify-between items-start mb-4">
                <div className="max-w-[70%]">
                   <p className="font-black text-xs uppercase italic leading-tight">{o.product_name}</p>
                   <p className="text-[10px] text-zinc-500 font-bold mt-2 uppercase tracking-tighter">{o.buyer_phone}</p>
                   <p className="text-[9px] text-orange-500 mt-1 uppercase font-black">Статус: {o.status}</p>
                </div>
                <p className="text-orange-500 font-black italic text-sm">{o.price}₽</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => updateOrderStatus(o.id, 'В пути')} className="flex-1 bg-zinc-800 py-3 rounded-2xl text-[8px] font-black uppercase">В пути</button>
                <button onClick={() => updateOrderStatus(o.id, 'Завершен')} className="flex-1 bg-orange-500 py-3 rounded-2xl text-[8px] font-black uppercase italic">Завершить</button>
              </div>
            </div>
          ))}
          {activeOrders.length === 0 && <p className="text-center py-10 text-zinc-800 font-black uppercase italic text-[10px]">Активных заказов нет</p>}
        </div>

        {/* СПОЙЛЕР ДЛЯ ЗАВЕРШЕННЫХ */}
        {completedOrders.length > 0 && (
          <div className="mt-8">
            <button 
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full py-4 border-t border-zinc-800 flex justify-between items-center px-4 active:bg-zinc-900 transition-all rounded-xl"
            >
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Архив заказов ({completedOrders.length})</span>
              <span className="text-zinc-600">{showCompleted ? '▲' : '▼'}</span>
            </button>
            
            {showCompleted && (
              <div className="space-y-4 mt-6 animate-fade-in">
                {completedOrders.map(o => (
                  <div key={o.id} className="bg-zinc-900/40 p-5 rounded-[2rem] border border-zinc-800/50 opacity-60">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-[10px] uppercase italic text-zinc-400">{o.product_name}</p>
                        <p className="text-[8px] text-zinc-600 mt-1 uppercase">{o.buyer_phone}</p>
                      </div>
                      <p className="text-zinc-500 font-black italic text-xs">{o.price}₽</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* МОДАЛКА (Оставил как было) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-zinc-900 w-full rounded-[3.5rem] p-8 border border-zinc-800 shadow-2xl animate-fade-in">
            <h2 className="text-xl font-black uppercase italic mb-6 text-orange-500">Добавить товар</h2>
            <input type="text" placeholder="Название" className="w-full bg-black border border-zinc-800 p-5 rounded-2xl mb-3 text-sm font-bold" 
                   onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
            <input type="number" placeholder="Цена (₽)" className="w-full bg-black border border-zinc-800 p-5 rounded-2xl mb-3 text-sm font-bold" 
                   onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
            <input type="text" placeholder="Категория" className="w-full bg-black border border-zinc-800 p-5 rounded-2xl mb-3 text-sm font-bold" 
                   onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
            <div className="mb-6 px-2">
               <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Фото товара:</p>
               <input type="file" className="text-[10px] text-white" onChange={e => setNewProduct({...newProduct, image: e.target.files?.[0] || null})} />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 bg-zinc-800 py-5 rounded-[1.8rem] text-[10px] font-black uppercase">Отмена</button>
              <button onClick={handleAddProduct} className="flex-2 bg-orange-500 py-5 px-8 rounded-[1.8rem] text-[10px] font-black uppercase italic shadow-lg shadow-orange-500/20">
                {uploading ? '⏳...' : 'Выставить'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes fade-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}