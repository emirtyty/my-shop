'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Загрузка...');

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_market')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        setStatus('Ошибка: ' + error.message);
      } else {
        setProducts(data || []);
        setStatus('Найдено товаров: ' + (data?.length || 0));
      }
    } catch (e: any) {
      setStatus('Ошибка кода: ' + e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const applyDiscount = async (product: any) => {
    const percent = prompt('Введите % скидки:');
    if (!percent) return;
    const disc = Number(percent);
    const basePrice = product.old_price || product.price;
    const finalPrice = Math.round(basePrice - (basePrice * (disc / 100)));
    
    const { error } = await supabase
      .from('product_market')
      .update({ price: finalPrice, old_price: basePrice })
      .eq('id', product.id);

    if (error) alert(error.message);
    else {
      alert("Скидка сохранена!");
      fetchData();
    }
  };

  const resetPrice = async (product: any) => {
    const { error } = await supabase
      .from('product_market')
      .update({ price: product.old_price, old_price: null })
      .eq('id', product.id);
    if (error) alert(error.message);
    else fetchData();
  };

  return (
    <div style={{ padding: '40px', background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#f97316', textTransform: 'uppercase', fontStyle: 'italic', fontWeight: '900', margin: 0 }}>УПРАВЛЕНИЕ</h1>
      <p style={{ fontSize: '10px', color: '#52525b', fontWeight: 'bold', marginTop: '5px' }}>{status.toUpperCase()}</p>

      {loading ? (
        <p style={{ marginTop: '20px', fontSize: '12px', opacity: 0.5 }}>ПОДОЖДИТЕ...</p>
      ) : (
        <div style={{ display: 'grid', gap: '15px', marginTop: '30px' }}>
          {products.map(p => (
            <div key={p.id} style={{ background: '#18181b', padding: '20px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid #27272a' }}>
              <img 
                src={p.image_url} 
                style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }} 
                alt="" 
              />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '10px', color: '#71717a', fontWeight: 'bold', textTransform: 'uppercase' }}>{p.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: '20px', fontWeight: '900' }}>{p.price} ₽</span>
                  {p.old_price && <span style={{ textDecoration: 'line-through', color: '#3f3f46', fontSize: '12px', fontWeight: 'bold' }}>{p.old_price} ₽</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  onClick={() => applyDiscount(p)}
                  style={{ background: '#f97316', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: '900', fontSize: '10px', cursor: 'pointer', textTransform: 'uppercase' }}
                >
                  СКИДКА %
                </button>
                {p.old_price && (
                  <button 
                    onClick={() => resetPrice(p)} 
                    style={{ background: 'none', color: '#52525b', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  >
                    СБРОСИТЬ
                  </button>
                )}
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <p style={{ textAlign: 'center', color: '#27272a', fontWeight: 'bold', fontSize: '12px', marginTop: '40px' }}>БАЗА ДАННЫХ ПУСТА</p>
          )}
        </div>
      )}
    </div>
  );
}