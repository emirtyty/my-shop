'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFinishedOrders, setShowFinishedOrders] = useState(false);

  // Состояние для нового товара
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'Цветы', image_url: '' });
  // Состояние для новой истории
  const [newStory, setNewStory] = useState({ image_url: '' });

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

  // Функции для Товаров
  const addProduct = async () => {
    if (!newItem.name || !newItem.price) return alert("Заполни поля!");
    const { error } = await supabase.from('product_market').insert([newItem]);
    if (!error) { fetchData(); setNewItem({ name: '', price: '', category: 'Цветы', image_url: '' }); }
  };

  const applyDiscount = async (product: any) => {
    const percent = prompt('Введите % скидки:');
    if (!percent) return;
    const disc = Number(percent);
    const basePrice = product.old_price || product.price;
    const finalPrice = Math.round(basePrice - (basePrice * (disc / 100)));
    await supabase.from('product_market').update({ price: finalPrice, old_price: basePrice }).eq('id', product.id);
    fetchData();
  };

  const resetPrice = async (id: string, oldPrice: number) => {
    await supabase.from('product_market').update({ price: oldPrice, old_price: null }).eq('id', id);
    fetchData();
  };

  const deleteProduct = async (id: string) => {
    if (confirm("Удалить товар?")) {
      await supabase.from('product_market').delete().eq('id', id);
      fetchData();
    }
  };

  // Функции для Stories
  const addStory = async () => {
    if (!newStory.image_url) return;
    await supabase.from('seller_stories').insert([newStory]);
    setNewStory({ image_url: '' });
    fetchData();
  };

  const deleteStory = async (id: string) => {
    await supabase.from('seller_stories').delete().eq('id', id);
    fetchData();
  };

  // Функции для Заказов
  const updateOrderStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchData();
  };

  const activeOrders = orders.filter(o => o.status !== 'ЗАВЕРШЕН');
  const finishedOrders = orders.filter(o => o.status === 'ЗАВЕРШЕН');

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-black italic text-orange-500 uppercase animate-pulse">Загрузка данных...</div>;

  return (
    <div className="p-6 bg-black min-h-screen text-white font-sans pb-20">
      <h1 className="text-3xl font-black text-orange-500 uppercase italic mb-10 tracking-tighter">Админ-центр</h1>

      {/* ДОБАВЛЕНИЕ ТОВАРА */}
      <section className="mb-12 bg-zinc-900/50 p-6 rounded-[2.5rem] border border-zinc-800">
        <h2 className="text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Новый товар</h2>
        <div className="grid gap-3">
          <input className="bg-black border border-zinc-800 p-4 rounded-2xl text-xs font-bold outline-none" placeholder="Название" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
          <div className="flex gap-2">
            <input className="bg-black border border-zinc-800 p-4 rounded-2xl text-xs font-bold outline-none flex-1" placeholder="Цена" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
            <select className="bg-black border border-zinc-800 p-4 rounded-2xl text-xs font-bold outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
              <option>Цветы</option>
              <option>Букеты</option>
              <option>Подарки</option>
              <option>Комнатные</option>
            </select>
          </div>
          <input className="bg-black border border-zinc-800 p-4 rounded-2xl text-xs font-bold outline-none" placeholder="URL Картинки" value={newItem.image_url} onChange={e => setNewItem({...newItem, image_url: e.target.value})} />
          <button onClick={addProduct} className="bg-orange-500 text-black py-4 rounded-2xl font-black uppercase italic text-xs mt-2">Добавить товар</button>
        </div>
      </section>

      {/* ДОБАВЛЕНИЕ СТОРИЗ */}
      <section className="mb-12 bg-zinc-900/50 p-6 rounded-[2.5rem] border border-zinc-800">
        <h2 className="text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Новая История (Stories)</h2>
        <div className="flex gap-2">
          <input className="bg-black border border-zinc-800 p-4 rounded-2xl text-xs font-bold outline-none flex-1" placeholder="URL картинки сториз" value={newStory.image_url} onChange={e => setNewStory({image_url: e.target.value})} />
          <button onClick={addStory} className="bg-white text-black px-6 rounded-2xl font-black uppercase text-[10px]">OK</button>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
          {stories.map(s => (
            <div key={s.id} className="relative flex-shrink-0">
              <img src={s.image_url} className="w-12 h-12 rounded-full object-cover border-2 border-orange-500" />
              <button onClick={() => deleteStory(s.id)} className="absolute -top-1 -right-1 bg-red-500 text-[8px] w-4 h-4 rounded-full">×</button>
            </div>
          ))}
        </div>
      </section>

      {/* СПИСОК ТОВАРОВ */}
      <section className="mb-12">
        <h2 className="text-[10px] font-black uppercase text-zinc-500 mb-6 tracking-widest ml-2">Товары в продаже ({products.length})</h2>
        <div className="grid gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-zinc-900 p-4 rounded-[2rem] flex items-center gap-4 border border-zinc-800">
              <img src={p.image_url} className="w-16 h-16 rounded-2xl object-cover" />
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase text-zinc-500 truncate w-32">{p.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black">{p.price} ₽</span>
                  {p.old_price && <span className="text-zinc-600 line-through text-[10px]">{p.old_price} ₽</span>}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => applyDiscount(p)} className="bg-orange-500 text-black px-4 py-2 rounded-xl font-black text-[9px] uppercase">Скидка %</button>
                {p.old_price && <button onClick={() => resetPrice(p.id, p.old_price)} className="text-zinc-600 text-[8px] uppercase font-bold">Сброс</button>}
                <button onClick={() => deleteProduct(p.id)} className="text-red-900 text-[8px] uppercase font-bold">Удалить</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ЗАКАЗЫ */}
      <section className="mb-12">
        <h2 className="text-[10px] font-black uppercase text-zinc-500 mb-6 tracking-widest ml-2 font-italic">Активные заказы ({activeOrders.length})</h2>
        <div className="grid gap-4">
          {activeOrders.map(o => (
            <div key={o.id} className="bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-800 relative overflow-hidden">
               <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <p className="text-[11px] font-black uppercase text-white mb-1">{o.product_name}</p>
                    <p className="text-[14px] font-black text-orange-500 mb-2">{o.price} ₽</p>
                    <p className="text-[10px] font-bold text-zinc-500 italic">{o.buyer_phone}</p>
                  </div>
                  <select 
                    className="bg-black text-[10px] font-black uppercase italic p-2 rounded-xl outline-none text-orange-500 border border-zinc-800"
                    value={o.status}
                    onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                  >
                    <option>НОВЫЙ</option>
                    <option>В РАБОТЕ</option>
                    <option>ДОСТАВКА</option>
                    <option>ЗАВЕРШЕН</option>
                  </select>
               </div>
               <div className="text-[8px] text-zinc-600 font-bold uppercase">{new Date(o.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ЗАВЕРШЕННЫЕ ЗАКАЗЫ ПОД СПОЙЛЕРОМ */}
      <section>
        <button 
          onClick={() => setShowFinishedOrders(!showFinishedOrders)}
          className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-[2rem] text-zinc-700 font-black uppercase italic text-[10px] hover:text-zinc-500"
        >
          {showFinishedOrders ? 'Скрыть завершенные' : `Показать завершенные (${finishedOrders.length})`}
        </button>
        
        {showFinishedOrders && (
          <div className="grid gap-4 mt-6 animate-fade-in">
            {finishedOrders.map(o => (
              <div key={o.id} className="bg-zinc-900/30 p-5 rounded-[2.5rem] border border-zinc-800 opacity-50">
                <div className="flex justify-between items-center">
                  <p className="text-[9px] font-black uppercase text-zinc-500">{o.product_name}</p>
                  <span className="text-zinc-600 font-black text-[9px] uppercase">✓ {o.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-in; }
      `}</style>
    </div>
  );
}