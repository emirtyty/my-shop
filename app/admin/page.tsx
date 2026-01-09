'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showFinishedOrders, setShowFinishedOrders] = useState(false);

  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'Цветы', image_url: '' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [prodRes, orderRes, storyRes] = await Promise.all([
      supabase.from('product_market').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('seller_stories').select('*').order('created_at', { ascending: false })
    ]);
    setProducts(prodRes.data || []);
    setOrders(orderRes.data || []);
    setStories(storyRes.data || []);
    setLoading(false);
  }

  // Загрузка сториз
  const handleFileUpload = async (event: any) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `stories/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
      await supabase.from('seller_stories').insert([{ image_url: publicUrl }]);
      fetchData();
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const addProduct = async () => {
    if (!newItem.name || !newItem.price) return alert("Заполни поля!");
    const { error } = await supabase.from('product_market').insert([{
        name: newItem.name,
        price: Number(newItem.price),
        category: newItem.category,
        image_url: newItem.image_url
    }]);
    if (!error) { fetchData(); setNewItem({ name: '', price: '', category: 'Цветы', image_url: '' }); }
  };

  const deleteProduct = async (id: string) => {
    if (confirm("Удалить?")) { await supabase.from('product_market').delete().eq('id', id); fetchData(); }
  };

  const applyDiscount = async (product: any) => {
    const percent = prompt('Введите % скидки:');
    if (!percent) return;
    const basePrice = product.old_price || product.price; 
    const finalPrice = Math.round(basePrice - (basePrice * (Number(percent) / 100)));
    await supabase.from('product_market').update({ price: finalPrice, old_price: basePrice }).eq('id', product.id);
    fetchData();
  };

  const resetPrice = async (product: any) => {
    if (!product.old_price) return;
    await supabase.from('product_market').update({ price: product.old_price, old_price: null }).eq('id', product.id);
    fetchData();
  };

  const deleteStory = async (id: string) => {
    await supabase.from('seller_stories').delete().eq('id', id);
    fetchData();
  };

  const updateOrderStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchData();
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-orange-500 font-black uppercase italic">Загрузка...</div>;

  return (
    <div className="p-5 bg-black min-h-screen text-white font-sans pb-20 relative">
      
      {/* ШАПКА С КНОПКОЙ СТОРИЗ */}
      <div className="flex justify-between items-center mb-10 mt-4">
        <h1 className="text-2xl font-black text-orange-500 uppercase italic tracking-tighter">Управление</h1>
        
        <label className={`flex items-center gap-2 px-4 py-2 rounded-full border border-orange-500/30 bg-zinc-900 active:scale-95 transition-all cursor-pointer ${isUploading && 'animate-pulse opacity-50'}`}>
          <span className="text-[9px] font-black text-orange-500 uppercase italic">
            {isUploading ? 'ЗАГРУЗКА...' : '➕ ИСТОРИЯ'}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
        </label>
      </div>

      {/* КРУЖКИ СТОРИЗ (ПРЕВЬЮ ТЕКУЩИХ) */}
      <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar mb-4 border-b border-zinc-900">
        {stories.map(s => (
          <div key={s.id} className="relative flex-shrink-0">
            <img src={s.image_url} className="w-14 h-14 rounded-full object-cover border-2 border-orange-500 p-0.5" />
            <button onClick={() => deleteStory(s.id)} className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] font-black">×</button>
          </div>
        ))}
        {stories.length === 0 && <p className="text-[9px] text-zinc-700 font-bold uppercase py-4">Нет активных историй</p>}
      </div>

      {/* ДОБАВЛЕНИЕ ТОВАРА */}
      <section className="mb-10 bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-800 shadow-2xl">
        <h2 className="text-[10px] font-black uppercase text-zinc-600 mb-4 tracking-widest">Новый товар</h2>
        <div className="grid gap-3">
          <input className="bg-black border border-zinc-800 p-4 rounded-2xl text-xs font-bold outline-none focus:border-orange-500" placeholder="Название" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
          <div className="flex gap-2">
            <input className="bg-black border border-zinc-800 p-4 rounded-2xl text-xs font-bold outline-none flex-1 focus:border-orange-500" placeholder="Цена" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
            <select className="bg-black border border-zinc-800 p-4 rounded-2xl text-[10px] font-black uppercase outline-none text-orange-500" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
              <option>Цветы</option><option>Букеты</option><option>Подарки</option>
            </select>
          </div>
          <input className="bg-black border border-zinc-800 p-4 rounded-2xl text-xs font-bold outline-none focus:border-orange-500" placeholder="URL картинки" value={newItem.image_url} onChange={e => setNewItem({...newItem, image_url: e.target.value})} />
          <button onClick={addProduct} className="bg-white text-black py-4 rounded-2xl font-black uppercase italic text-[10px] mt-2 active:scale-95 transition-all">Опубликовать товар</button>
        </div>
      </section>

      {/* ТОВАРЫ */}
      <div className="grid gap-4 mb-12">
        {products.map(p => (
          <div key={p.id} className="bg-zinc-900 p-4 rounded-[2rem] flex gap-4 items-center border border-zinc-800">
            <img src={p.image_url} className="w-16 h-16 rounded-2xl object-cover bg-black" />
            <div className="flex-1">
              <p className="font-bold text-[10px] uppercase text-zinc-500 truncate w-32">{p.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black">{p.price} ₽</span>
                {p.old_price && <span className="text-zinc-600 line-through text-[10px]">{p.old_price} ₽</span>}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => applyDiscount(p)} className="bg-orange-500 text-black px-4 py-2 rounded-xl font-black text-[9px] uppercase shadow-lg shadow-orange-500/20">%</button>
              <button onClick={() => deleteProduct(p.id)} className="text-red-900 text-[8px] uppercase font-black">Удалить</button>
            </div>
          </div>
        ))}
      </div>

      {/* ЗАКАЗЫ */}
      <h2 className="text-[10px] font-black uppercase text-zinc-600 mb-4 ml-2 italic">Активные заказы ({orders.filter(o=>o.status!=='ЗАВЕРШЕН').length})</h2>
      <div className="grid gap-4 mb-10">
        {orders.filter(o => o.status !== 'ЗАВЕРШЕН').map(o => (
          <div key={o.id} className="bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-800">
             <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-[11px] font-black uppercase text-white mb-1 leading-tight">{o.product_name}</p>
                  <p className="text-xl font-black text-orange-500 mb-2">{o.price} ₽</p>
                  <p className="text-[10px] font-bold text-zinc-500 italic">📞 {o.buyer_phone}</p>
                </div>
                <select 
                  className="bg-black text-[9px] font-black uppercase italic p-3 rounded-xl text-orange-500 border border-zinc-800 outline-none"
                  value={o.status}
                  onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                >
                  <option>НОВЫЙ</option><option>В РАБОТЕ</option><option>ДОСТАВКА</option><option>ЗАВЕРШЕН</option>
                </select>
             </div>
          </div>
        ))}
      </div>

      {/* АРХИВ */}
      <button onClick={() => setShowFinishedOrders(!showFinishedOrders)} className="w-full py-5 border-2 border-dashed border-zinc-800 rounded-[2rem] text-zinc-700 font-black uppercase italic text-[10px] active:bg-zinc-900 transition-all">
        {showFinishedOrders ? 'СКРЫТЬ АРХИВ' : `АРХИВ ЗАКАЗОВ (${orders.filter(o=>o.status==='ЗАВЕРШЕН').length})`}
      </button>
      
      {showFinishedOrders && (
        <div className="grid gap-4 mt-6">
          {orders.filter(o=>o.status==='ЗАВЕРШЕН').map(o => (
            <div key={o.id} className="bg-zinc-900/40 p-5 rounded-[2.5rem] border border-zinc-800 opacity-60">
              <div className="flex justify-between items-center text-[9px] font-black uppercase">
                <p className="text-zinc-500">{o.product_name}</p>
                <span className="text-zinc-600 italic">ЗАВЕРШЕН ✓</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}