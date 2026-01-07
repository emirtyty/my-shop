'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // Проверь, что путь к supabase верный
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [shopName, setShopName] = useState('');
  const [tgId, setTgId] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Записываем данные в таблицу sellers
    const { data, error } = await supabase
      .from('sellers')
      .insert([{ 
        shop_name: shopName, 
        telegram_id: tgId, 
        password: password 
      }])
      .select()
      .single();

    if (error) {
      alert('Ошибка: ' + error.message);
      return;
    }

    // 2. Сохраняем данные в браузере (чтобы админка их видела)
    localStorage.setItem('seller_session', JSON.stringify({
      shop_name: data.shop_name,
      telegram_id: data.telegram_id
    }));

    alert('Успех! Теперь вы можете добавлять товары.');
    router.push('/admin'); // Перекидываем в админку
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col justify-center items-center">
      <form onSubmit={handleRegister} className="w-full max-w-sm space-y-4 bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
        <h1 className="text-xl font-bold text-orange-500 text-center">Регистрация магазина</h1>
        
        <input 
          required
          placeholder="Название магазина (напр. Цветы)" 
          className="w-full p-4 bg-black rounded-2xl border border-zinc-800"
          onChange={(e) => setShopName(e.target.value)}
        />
        
        <div>
          <input 
            required
            placeholder="Ваш Telegram ID" 
            className="w-full p-4 bg-black rounded-2xl border border-zinc-800"
            onChange={(e) => setTgId(e.target.value)}
          />
          <p className="text-[10px] text-gray-500 mt-1 ml-2">ID можно узнать в боте @userinfobot</p>
        </div>

        <input 
          required
          type="password"
          placeholder="Пароль для входа" 
          className="w-full p-4 bg-black rounded-2xl border border-zinc-800"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="w-full bg-orange-500 py-4 rounded-2xl font-bold">
          Создать аккаунт
        </button>
      </form>
    </div>
  );
}