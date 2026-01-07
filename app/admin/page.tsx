'use client';
import { useEffect, useState, useRef } from 'react';
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
  
  // Поля для нового товара
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

  // Добавление нового товара
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

      alert("Товар добавлен! 🛍️");
      setShowAddModal(false);
      setNewProduct({ name: '', price: '', category: '', image: null });
      fetchData(seller.id);
    } catch (e: any) { alert(e.message); } finally { setUploading(false); }
  };

  // Функции управления (удаление, цена, скидка) остаются такими же
  const deleteProduct = async (id: any) => { if (confirm('Удалить?')) { await supabase.from('product_market').delete().eq('id', id); fetchData(seller.id); } };
  const updatePrice = async (id: any) => { const p = prompt('Новая цена:'); if (p) { await supabase.from('product_market').update({ price: Number(p) }).eq('id', id); fetchData(seller.id); } };
  const deleteStory = async (id: any) => { await supabase.from('seller_stories').delete().eq('id', id); fetchData(seller.id); };

  const handleStoryUpload = async (e: any) => {
    const file = e.target.files?.[0]; if (!file) return; setUploading(true);
    const fileName = `st_${Date.now()}.${file.name.split('.').pop()}`;
    await supabase.storage.from('images').upload(`stories/${fileName}`, file);
    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`stories/${fileName}`);
    await supabase.from('seller_stories').insert([{ image_url: publicUrl, seller_id: seller.id, title: seller.shop_name }]);
    setUploading(false); fetchData(seller.id);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-orange-500 font-black italic">ЗАГРУЗКА...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-5 pb-32">
      <header className="flex justify-between items-center mb-10 pt-4">
        <h1 className="text-3xl font-black text-orange-500 italic uppercase leading-none">Admin</h1>
        <div className="flex gap-3">
          <button onClick={() => setShowAddModal(true)} className="bg-white text-black text-[10px] font-black px-5 py-4 rounded-2xl uppercase italic">
            + Товар
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-orange-500/20">
            {uploading ? '⏳' : '📸'}
          </button>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleStoryUpload} className="hidden" />
      </header>

      {/* Список сторис */}
      <section className="mb-10">
        <h2 className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-4 px-2">Ваши истории</h2>
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {stories.map(s => (
            <div key={s.id} className="flex-shrink-0 flex flex-col items-center gap-2">
              <img src={s.image_url} className="w-16 h-16 rounded-full object-cover border-2 border-orange-500 p-0.5" />
              <button onClick={() => deleteStory(s.id)} className="text-[7px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded-full uppercase">Удалить</button>
            </div>
          ))}
        </div>
      </section>

      {/* Список товаров */}
      <section className="mb-10">
        <h2 className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-6 px-2">Товары в продаже ({products.length})</h2>
        <div className="space-y-4">
          {products.map(p => (
            <div key={p.id} className="bg-zinc-900/50 p-4 rounded-[2.5rem] border border-zinc-800 flex gap-4">
              <img src={p.image_url} className="w-20 h-20 rounded-[1.5rem] object-cover" />
              <div className="flex-1 flex flex-col justify-between">
                <h3 className="font-bold text-[10px] uppercase truncate">{p.name}</h3>
                <p className="text-orange-500 font-black text-sm italic">{p.price} ₽</p>
                <div className="flex gap-2">
                  <button onClick={() => updatePrice(p.id)} className="text-[8px] font-black bg-zinc-800 px-3 py-2 rounded-xl uppercase">Цена</button>
                  <button onClick={() => deleteProduct(p.id)} className="text-[8px] font-black text-red-500 px-3 py-2 rounded-xl uppercase bg-red-500/5">Удалить</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Модальное окно добавления товара */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-zinc-900 w-full rounded-[3rem] p-8 border border-zinc-800 shadow-2xl">
            <h2 className="text-xl font-black uppercase italic mb-6 text-orange-500">Новый товар</h2>
            <input type="text" placeholder="Название" className="w-full bg-black border border-zinc-800 p-4 rounded-2xl mb-3 text-sm" 
                   onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
            <input type="number" placeholder="Цена (₽)" className="w-full bg-black border border-zinc-800 p-4 rounded-2xl mb-3 text-sm" 
                   onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
            <input type="text" placeholder="Категория (Розы, Подарки...)" className="w-full bg-black border border-zinc-800 p-4 rounded-2xl mb-3 text-sm" 
                   onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
            <input type="file" className="text-xs text-zinc-500 mb-6" onChange={e => setNewProduct({...newProduct, image: e.target.files?.[0] || null})} />
            
            <div className="flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 bg-zinc-800 py-4 rounded-2xl text-[10px] font-black uppercase">Отмена</button>
              <button onClick={handleAddProduct} className="flex-2 bg-orange-500 py-4 px-8 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-orange-500/20">
                {uploading ? '⏳...' : 'Выставить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}