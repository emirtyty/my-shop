'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase'; // проверь путь к supabase
import { useParams } from 'next/navigation';

export default function SellerStore() {
  const params = useParams();
  const sellerId = params.id;

  const [products, setProducts] = useState<any[]>([]);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStoreData() {
      // 1. Загружаем инфо о продавце
      const { data: seller } = await supabase
        .from('sellers')
        .select('*')
        .eq('id', sellerId)
        .single();
      
      // 2. Загружаем только его товары
      const { data: prods } = await supabase
        .from('product_market')
        .select('*')
        .eq('seller_id', sellerId);

      setSellerInfo(seller);
      setProducts(prods || []);
      setLoading(false);
    }
    if (sellerId) fetchStoreData();
  }, [sellerId]);

  const addToCart = (product: any) => setCart([...cart, product]);

  if (loading) return <div className="p-10 text-center font-black italic text-orange-500">ЗАГРУЗКА ВИТРИНЫ...</div>;
  if (!sellerInfo) return <div className="p-10 text-center">Продавец не найден</div>;

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-black pb-20">
      {/* Шапка витрины */}
      <header className="bg-white px-6 pt-12 pb-8 rounded-b-[3.5rem] shadow-sm mb-6 text-center">
        <img 
          src={sellerInfo.logo_url || 'https://via.placeholder.com/100'} 
          className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-orange-500 p-1" 
          alt="Logo" 
        />
        <h1 className="text-2xl font-black uppercase italic tracking-tighter">{sellerInfo.shop_name}</h1>
        <p className="text-zinc-400 text-[10px] uppercase font-bold mt-2">{sellerInfo.description}</p>
      </header>

      {/* Список товаров продавца */}
      <main className="px-4 grid grid-cols-2 gap-4">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-[2.8rem] p-2 border border-zinc-100 shadow-sm">
            <div className="relative aspect-square mb-3">
              <img src={p.image_url} className="w-full h-full object-cover rounded-[2.4rem]" alt={p.name} />
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full text-[9px] font-black italic shadow-sm">
                {p.price} ₽
              </div>
            </div>
            <div className="px-3 pb-3 text-center">
              <h3 className="font-bold text-[10px] uppercase tracking-tighter mb-4 h-8 line-clamp-2 leading-none">{p.name}</h3>
              <button 
                onClick={() => addToCart(p)}
                className="w-full bg-black text-white py-4.5 rounded-[1.4rem] text-[9px] font-black uppercase italic tracking-[0.1em] active:bg-orange-500 transition-all shadow-sm"
              >
                В КОРЗИНУ
              </button>
            </div>
          </div>
        ))}
      </main>

      {/* Маленькая плашка корзины, если что-то добавили */}
      {cart.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] bg-orange-500 text-white p-6 rounded-[2.5rem] shadow-2xl flex justify-between items-center animate-fade-in">
           <span className="font-black italic uppercase text-sm">В корзине: {cart.length}</span>
           <button className="bg-white text-orange-500 px-6 py-2 rounded-full font-black text-[10px] uppercase">Оформить</button>
        </div>
      )}
    </div>
  );
}