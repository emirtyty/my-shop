'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Grid2x2, House, Store } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ProductSellerRow = {
  sellers?: {
    shop_name?: string | null;
  } | null;
};

export default function SellersPage() {
  const [rows, setRows] = useState<ProductSellerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!supabase) throw new Error('Supabase client is not initialized.');
        const { data, error: fetchError } = await supabase
          .from('product_market')
          .select('sellers(shop_name)')
          .limit(1000);
        if (fetchError) throw new Error(fetchError.message);
        setRows((data as ProductSellerRow[]) || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить продавцов.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const sellers = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      const name = (row.sellers?.shop_name || '').trim();
      if (!name) continue;
      map.set(name, (map.get(name) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [rows]);

  return (
    <main className="lux-page lux-page--with-controls">
      <section className="lux-shell">
        <header className="lux-directory-head">
          <Store size={18} />
          <h1>Продавцы</h1>
        </header>

        {error ? (
          <article className="lux-state lux-state--error">
            <p>{error}</p>
          </article>
        ) : isLoading ? (
          <section className="lux-directory-list">
            {Array.from({ length: 8 }).map((_, idx) => (
              <article key={idx} className="lux-directory-item lux-card--skeleton" />
            ))}
          </section>
        ) : (
          <section className="lux-directory-list">
            {sellers.map((item) => (
              <Link
                key={item.name}
                href={`/?shop=${encodeURIComponent(item.name)}`}
                className="lux-directory-item"
              >
                <span>{item.name}</span>
                <b>{item.count}</b>
              </Link>
            ))}
          </section>
        )}
      </section>
      <nav className="lux-mobile-nav" aria-label="Нижняя навигация">
        <Link href="/" className="lux-mobile-nav__item">
          <House size={17} />
          <span>Главная</span>
        </Link>
        <Link href="/categories" className="lux-mobile-nav__item">
          <Grid2x2 size={17} />
          <span>Категории</span>
        </Link>
        <Link href="/sellers" className="lux-mobile-nav__item is-active">
          <Store size={17} />
          <span>Продавцы</span>
        </Link>
      </nav>
    </main>
  );
}
