'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<'selection' | 'login' | 'register'>('selection');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (type: 'login' | 'register') => {
    setLoading(true);
    const { data, error } = type === 'register' 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert(error.message);
    } else {
      if (type === 'register') {
        // При регистрации сразу добавляем в таблицу продавцов
        await supabase.from('sellers').insert([{ name: email.split('@')[0], telegram_id: '' }]);
        alert("Регистрация успешна! Теперь войдите.");
        setView('login');
      } else {
        router.push('/admin');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center p-6 font-black italic uppercase">
      <div className="bg-white w-full max-w-md p-10 rounded-[3.5rem] shadow-2xl border border-zinc-100 text-center">
        
        {/* ЭКРАН ВЫБОРА (ДВЕ КНОПКИ) */}
        {view === 'selection' && (
          <div className="space-y-6">
            <h1 className="text-4xl tracking-tighter mb-12 leading-none text-black">ПАНЕЛЬ<br/>УПРАВЛЕНИЯ</h1>
            <button 
              onClick={() => setView('login')}
              className="w-full bg-black text-white py-6 rounded-3xl text-sm shadow-xl active:scale-95 transition-all"
            >
              ВОЙТИ
            </button>
            <button 
              onClick={() => setView('register')}
              className="w-full bg-white text-black border-2 border-black py-6 rounded-3xl text-sm active:scale-95 transition-all"
            >
              РЕГИСТРАЦИЯ
            </button>
          </div>
        )}

        {/* ФОРМЫ ВХОДА И РЕГИСТРАЦИИ */}
        {view !== 'selection' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl mb-6">{view === 'login' ? 'ВХОД' : 'НОВЫЙ АККАУНТ'}</h2>
            <input 
              type="email" 
              placeholder="EMAIL" 
              className="w-full bg-zinc-100 p-5 rounded-2xl outline-none text-[10px]"
              onChange={(e) => setEmail(e.target.value)} 
            />
            <input 
              type="password" 
              placeholder="ПАРОЛЬ" 
              className="w-full bg-zinc-100 p-5 rounded-2xl outline-none text-[10px]"
              onChange={(e) => setPassword(e.target.value)} 
            />
            
            <button 
              onClick={() => handleAuth(view === 'login' ? 'login' : 'register')}
              disabled={loading}
              className="w-full bg-orange-500 text-white py-5 rounded-2xl text-xs shadow-lg shadow-orange-500/30"
            >
              {loading ? 'ЗАГРУЗКА...' : 'ПОДТВЕРДИТЬ'}
            </button>

            <button 
              onClick={() => setView('selection')}
              className="w-full text-[9px] text-zinc-400 mt-4 tracking-widest"
            >
              ← НАЗАД
            </button>
          </div>
        )}
      </div>
    </div>
  );
}