'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase'; // проверь путь к supabase!

export default function SellerPage() {
  const params = useParams();
  const [seller, setSeller] = useState<any>(null);

  useEffect(() => {
    async function getSeller() {
      if (params?.id) {
        const { data } = await supabase.from('sellers').select('*').eq('id', params.id).single();
        setSeller(data);
      }
    }
    getSeller();
  }, [params?.id]);

  if (!seller) return <div className="p-10 font-black italic uppercase">Загрузка магазина...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-black italic uppercase">{seller.shop_name}</h1>
      <p className="text-zinc-400">ID магазина: {params?.id}</p>
      <button onClick={() => window.history.back()} className="mt-10 font-bold">← НАЗАД</button>
    </div>
  );
}