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
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [prodRes, orderRes, storyRes] = await Promise.all([
        supabase.from('product_market').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('seller_stories').select('*').order('created_at', { ascending: false })
      ]);
      setProducts(prodRes.data || []);
      setOrders(orderRes.data || []);
      setStories(storyRes.data || []);
    } catch (err) {
      console.error("Ошибка загрузки:", err);
    }
    setLoading(false);
  }

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- ИСПРАВЛЕННЫЙ РЕДАКТОР ЦЕНЫ ---
  const editPriceManual = async (product: any) => {
    const val = prompt(`Новая цена для ${product.name}:`, product.price);
    if (val === null || val === "") return;
    
    const newPrice = parseInt(val);
    if (isNaN(newPrice)) return alert("Введите корректное число!");

    const { error } = await supabase
      .from('product_market')
      .update({ 
        price: newPrice, 
        old_price: product.price // Сохраняем текущую как старую
      })
      .eq('id', product.id);

    if (error) {
      alert("Ошибка базы: " + error.message);
    } else {
      fetchData(); // Сразу обновляем список
    }
  };

  // --- ИСПРАВЛЕННАЯ СКИДКА ---
  const applyDiscount = async (product: any) => {
    const val = prompt('Введите % скидки (например 10):');
    if (val === null || val === "") return;
    
    const percent = parseInt(val);
    if (isNaN(percent)) return alert("Введите число!");

    const basePrice = product.old_price || product.price; 
    const finalPrice = Math.round(basePrice - (basePrice * (percent / 100)));
    
    const { error } = await supabase
      .from('product_market')
      .update({ 
        price: finalPrice, 
        old_price: basePrice 
      })
      .eq('id', product.id);

    if (error) {
      alert("Ошибка базы: " + error.message);
    } else {
      fetchData();
    }
  };

  const resetPrice = async (product: any) => {
    if (!product.old_price) return;
    const { error } = await supabase
      .from('product_market')
      .update({ price: product.old_price, old_price: null })
      .eq('id', product.id);
    if (error) alert(error.message);
    else fetchData();
  };

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

  const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) alert(error.message);
    else fetchData();
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-orange-500 font-black uppercase italic animate-pulse">Обновление...</div>;

  return (
    <div className="p-5 bg-black min-h-screen text-white font-sans pb-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-orange-500 uppercase italic tracking-tighter">Управление</h1>
        <label className={`bg-zinc-900 border border-orange-500/50 px-5 py-2.5 rounded-full cursor-pointer active:scale-95 transition-all ${isUploading && 'opacity-50'}`}>
          <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{isUploading ? 'ЗАГРУЗКА...' : '+ ИСТОРИЯ'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
        </label>
      </div>

      {/* STORIES */}
      <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar mb-8 border-b border-zinc-900">
        {stories.map(s => (
          <div key={s.id} className="relative flex-shrink-0">
            <img src={s.image_url} className="w-14 h-14 rounded-full object-cover border-2 border-orange-500 p-0.5" />
            <button onClick={async () => { await supabase.from('seller_stories').delete().eq('id', s.id); fetchData(); }} className="absolute -top-1 -right-1 bg-red-600 text-white w-5 h-5 rounded-full text-[10px] font-black">×</button>
          </div>
        ))}
      </div>

      {/* ПОИСК */}
      <div className="mb-6">
        <input 
          type="text" 
          placeholder="Найти товар..." 
          className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-[10px] font-black uppercase italic outline-none focus:border-orange-500 transition-all text-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* СПИСОК ТОВАРОВ */}
      <div className="grid gap-4 mb-12">
        {filteredProducts.map(p => (
          <div key={p.id} className="bg-zinc-900 p-4 rounded-[2.5rem] border border-zinc-800 flex items-center gap-4">
            <img src={p.image_url} className="w-16 h-16 rounded-2xl object-cover bg-black flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[9px] uppercase text-zinc-500 mb-1 truncate">{p.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white">{p.price} ₽</span>
                {p.old_price && <span className="text-zinc-600 line-through text-[10px]">{p.old_price} ₽</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <button onClick={() => editPriceManual(p)} className="bg-white text-black text-[8px] font-black px-4 py-2 rounded-xl uppercase active:scale-90 transition-all">Цена</button>
              <button onClick={() => applyDiscount(p)} className="bg-orange-500 text-black text-[8px] font-black px-4 py-2 rounded-xl uppercase active:scale-90 transition-all shadow-lg shadow-orange-500/20">%</button>
              {p.old_price && <button onClick={() => resetPrice(p)} className="text-zinc-600 text-[8px] font-bold uppercase text-center">Сброс</button>}
            </div>
          </div>
        ))}
      </div>

      {/* ЗАКАЗЫ */}
      <h2 className="text-[10px] font-black uppercase text-zinc-600 mb-4 ml-2 italic tracking-widest">Активные заказы</h2>
      <div className="grid gap-4 mb-10">
        {orders.filter(o => o.status !== 'ЗАВЕРШЕН').map(o => (
          <div key={o.id} className="bg-zinc-900 p-5 rounded-[2.5rem] border border-zinc-800">
             <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-white mb-1 leading-tight">{o.product_name}</p>
                  <p className="text-xl font-black text-orange-500 mb-1">{o.price} ₽</p>
                  <p className="text-[9px] font-bold text-zinc-500">📞 {o.buyer_phone}</p>
                </div>
                <select 
                  className="bg-black text-[9px] font-black uppercase p-3 rounded-2xl text-orange-500 border border-zinc-800 outline-none"
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
      <button 
        onClick={() => setShowFinishedOrders(!showFinishedOrders)} 
        className="w-full py-5 border-2 border-dashed border-zinc-800 rounded-[2.5rem] text-zinc-700 font-black uppercase text-[10px] active:bg-zinc-900 transition-all"
      >
        {showFinishedOrders ? 'ЗАКРЫТЬ АРХИВ' : `АРХИВ ЗАКАЗОВ (${orders.filter(o => o.status === 'ЗАВЕРШЕН').length})`}
      </button>

      {showFinishedOrders && (
        <div className="grid gap-3 mt-6">
          {orders.filter(o => o.status === 'ЗАВЕРШЕН').map(o => (
            <div key={o.id} className="bg-zinc-900/40 p-5 rounded-[2rem] border border-zinc-800 opacity-50 flex justify-between items-center">
              <p className="text-[9px] font-black uppercase text-zinc-600">{o.product_name}</p>
              <span className="text-zinc-700 text-[8px] font-black italic">✓ ЗАВЕРШЕН</span>
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