'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminPanel() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Поля нового товара
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Электроника');
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productFileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const categories = ['Электроника', 'Одежда', 'Аксессуары', 'Дом', 'Спорт', 'Другое'];

  useEffect(() => {
    const sessionData = localStorage.getItem('seller_session');
    if (!sessionData) { router.push('/login'); return; }
    const session = JSON.parse(sessionData);
    setSeller(session);
    loadData(String(session.id));
  }, []);

  const loadData = async (id: string) => {
    setLoading(true);
    const { data: p } = await supabase.from('product_market').select('*').eq('seller_id', id);
    const { data: o } = await supabase.from('orders').select('*').eq('seller_id', id);
    setProducts(p || []);
    setOrders(o || []);
    setLoading(false);
  };

  // Загрузка сторис
  const handleStoryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !seller) return;
      setUploading(true);
      const fileName = `${Date.now()}_story.jpg`;
      await supabase.storage.from('images').upload(`stories/${fileName}`, file);
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`stories/${fileName}`);
      
      await supabase.from('seller_stories').insert([{
        image_url: publicUrl,
        seller_id: String(seller.id),
        title: seller.shop_name
      }]);
      alert("История опубликована! Проверьте сайт.");
    } catch (e: any) { alert(e.message); } finally { setUploading(false); }
  };

  // Создание товара
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = productFileRef.current?.files?.[0];
    if (!file || !newName || !newPrice) return alert("Заполните все поля и выберите фото");

    try {
      setUploading(true);
      const fileName = `${Date.now()}_prod.jpg`;
      await supabase.storage.from('images').upload(`products/${fileName}`, file);
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`products/${fileName}`);

      await supabase.from('product_market').insert([{
        name: newName,
        price: Number(newPrice),
        category: newCategory,
        image_url: publicUrl,
        seller_id: String(seller.id)
      }]);

      alert("Товар добавлен!");
      setIsAddModalOpen(false);
      loadData(String(seller.id));
    } catch (e: any) { alert(e.message); } finally { setUploading(false); }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-orange-500 font-black italic">ЗАГРУЗКА...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-32">
      <header className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-3xl font-black text-orange-500 uppercase italic">Admin</h1>
          <p className="text-zinc-500 text-[10px] uppercase">{seller?.login}</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setIsAddModalOpen(true)} className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-xl">+</button>
            <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-xl">📸</button>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleStoryUpload} className="hidden" />
      </header>

      {/* Модалка добавления товара */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 p-6 flex items-center justify-center">
          <div className="bg-zinc-900 w-full rounded-[3rem] p-8 border border-zinc-800">
            <h2 className="text-xl font-black uppercase italic mb-6">Новый товар</h2>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <input type="file" ref={productFileRef} className="w-full text-xs" accept="image/*" />
              <input placeholder="Название" className="w-full bg-black p-4 rounded-xl outline-none" value={newName} onChange={e => setNewName(e.target.value)} />
              <input placeholder="Цена" type="number" className="w-full bg-black p-4 rounded-xl outline-none" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
              <select className="w-full bg-black p-4 rounded-xl outline-none" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-zinc-800 py-4 rounded-xl font-bold">ОТМЕНА</button>
                <button type="submit" className="flex-1 bg-orange-500 py-4 rounded-xl font-black uppercase italic">{uploading ? '...' : 'СОЗДАТЬ'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Сетка товаров */}
      <section className="mb-10">
        <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Мои товары ({products.length})</h2>
        <div className="grid grid-cols-2 gap-3">
          {products.map(p => (
            <div key={p.id} className="bg-zinc-900/50 p-3 rounded-[2rem] border border-zinc-800">
              <img src={p.image_url} className="w-full h-24 object-cover rounded-2xl mb-2" />
              <p className="font-bold text-[10px] truncate">{p.name}</p>
              <p className="text-orange-500 font-black text-xs">{p.price}₽</p>
              <p className="text-zinc-600 text-[8px] uppercase">{p.category}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Выход */}
      <button onClick={() => { localStorage.removeItem('seller_session'); router.push('/login'); }} className="w-full text-zinc-700 text-[9px] font-black uppercase tracking-widest">Выйти</button>
    </div>
  );
}