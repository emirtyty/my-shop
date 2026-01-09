'use client';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    fetchData();
    // Следим за скроллом
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function fetchData() {
    const { data: prod } = await supabase
      .from('product_market')
      .select('*')
      .eq('is_archived', false) // Показываем только не архивные
      .order('created_at', { ascending: false });
    
    const { data: stor } = await supabase
      .from('seller_stories')
      .select('*')
      .order('created_at', { ascending: false });

    setProducts(prod || []);
    setStories(stor || []);
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-orange-500 font-black italic animate-pulse">FLOWERS...</div>;

  return (
    <div className="bg-black min-h-screen text-white font-sans selection:bg-orange-500 selection:text-black">
      
      {/* HEADER: ПРЯЧЕТСЯ ПРИ СКРОЛЛЕ */}
      <header 
        style={{ 
          transform: `translateY(${scrollY > 50 ? '-100%' : '0'})`,
          opacity: scrollY > 50 ? 0 : 1
        }}
        className="fixed top-0 left-0 w-full z-50 p-6 transition-all duration-500 ease-in-out bg-black/80 backdrop-blur-md"
      >
        <h1 className="text-4xl font-black text-orange-500 uppercase italic tracking-tighter leading-none">
          LUXURY<br/>FLOWERS
        </h1>
      </header>

      {/* Отступ под шапку, чтобы контент не зарезало */}
      <div className="h-24"></div>

      <main className="p-6">
        {/* STORIES */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar mb-10 pt-4">
          {stories.map(s => (
            <div key={s.id} className="flex-shrink-0">
              <div className="w-16 h-16 rounded-full border-2 border-orange-500 p-0.5 active:scale-90 transition-transform">
                <img src={s.image_url} className="w-full h-full rounded-full object-cover" alt="story" />
              </div>
            </div>
          ))}
        </div>

        {/* PRODUCTS GRID */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-8">
          {products.map(p => (
            <div key={p.id} className="group cursor-pointer">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] bg-zinc-900 mb-3">
                <img 
                  src={p.image_url} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  alt={p.name} 
                />
                {p.old_price && (
                  <div className="absolute top-3 left-3 bg-orange-500 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase italic">
                    Sale
                  </div>
                )}
              </div>
              
              <h3 className="text-[11px] font-black uppercase text-zinc-400 mb-1 leading-tight tracking-tighter">
                {p.name}
              </h3>
              
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black italic">{p.price} ₽</span>
                {p.old_price && (
                  <span className="text-zinc-600 line-through text-[10px] font-bold">
                    {p.old_price} ₽
                  </span>
                )}
              </div>
              
              <button className="w-full mt-3 bg-white text-black py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all group-hover:bg-orange-500">
                Заказать
              </button>
            </div>
          ))}
        </div>
      </main>

      <footer className="p-10 text-center border-t border-zinc-900 mt-10">
        <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em]">
          Premium Delivery Service
        </p>
      </footer>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        body { background: black; }
      `}</style>
    </div>
  );
}