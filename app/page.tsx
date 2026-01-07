'use client';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [prodRes, storyRes] = await Promise.all([
        supabase.from('product_market').select('*'),
        supabase.from('seller_stories').select('*').order('created_at', { ascending: false })
      ]);
      setProducts(prodRes.data || []);
      setStories(storyRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-black font-sans pb-20">
      {/* Плеер историй (открывается по клику) */}
      {selectedStory && (
        <div 
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4"
          onClick={() => setSelectedStory(null)}
        >
          <div className="relative w-full max-w-lg aspect-[9/16] bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
            <img src={selectedStory} className="w-full h-full object-cover" alt="Story" />
            <div className="absolute top-6 left-6 right-6 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white w-full animate-[progress_5s_linear]"></div>
            </div>
            <button className="absolute top-8 right-6 text-white text-2xl font-bold">×</button>
          </div>
        </div>
      )}

      {/* Шапка */}
      <header className="bg-white px-6 pt-6 pb-4 rounded-b-[2.5rem] shadow-sm">
        <h1 className="text-3xl font-black italic tracking-tighter uppercase mb-6">Маркет<span className="text-orange-500">.</span></h1>
        
        {/* Лента историй */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {stories.map((story) => (
            <div 
              key={story.id} 
              onClick={() => setSelectedStory(story.image_url)}
              className="flex-shrink-0 w-20 h-20 rounded-full p-[3px] border-2 border-orange-500 active:scale-90 transition-transform cursor-pointer"
            >
              <img src={story.image_url} className="w-full h-full rounded-full object-cover" />
            </div>
          ))}
          {stories.length === 0 && (
            <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] text-zinc-400 text-center px-2 font-bold uppercase italic">Нет сторис</div>
          )}
        </div>
      </header>

      {/* Сетка товаров */}
      <main className="p-4 grid grid-cols-2 gap-4 mt-2">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-zinc-100 active:scale-[0.98] transition-all">
            <div className="relative h-48 w-full">
              <img src={product.image_url} className="w-full h-full object-cover" alt={product.name} />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black italic">
                {product.price} ₽
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-xs uppercase tracking-tight mb-3 line-clamp-2 h-8">
                {product.name}
              </h3>
              <button className="w-full bg-black text-white py-3 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:bg-orange-500 transition-colors">
                В корзину
              </button>
            </div>
          </div>
        ))}
      </main>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes progress { from { width: 0%; } to { width: 100%; } }
      `}</style>
    </div>
  );
}