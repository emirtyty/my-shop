'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { data, error: dbError } = await supabase
      .from('sellers')
      .select('*')
      .eq('login', login)
      .eq('password', password)
      .single();

    if (dbError || !data) {
      setError('Неверный логин или пароль');
      return;
    }

    localStorage.setItem('seller_session', JSON.stringify(data));
    router.push('/admin'); // Перекидываем в админку
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-900 rounded-[3rem] p-10 border border-zinc-800">
        <h1 className="text-3xl font-black text-white uppercase italic mb-8">Вход</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="text" 
            placeholder="Логин" 
            className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-orange-500"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="Пароль" 
            className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-orange-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{error}</p>}
          <button type="submit" className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black uppercase italic active:scale-95 transition-all">
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}