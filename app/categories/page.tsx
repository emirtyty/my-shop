'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Grid2x2, House, Store } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ProductCategoryRow = {
  category?: string | null;
};

export default function CategoriesPage() {
  const [rows, setRows] = useState<ProductCategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!supabase) throw new Error('Supabase client is not initialized.');
        const { data, error: fetchError } = await supabase.from('product_market').select('category').limit(1000);
        if (fetchError) throw new Error(fetchError.message);
        setRows((data as ProductCategoryRow[]) || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить категории.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      const name = (row.category || '').trim();
      if (!name) continue;
      map.set(name, (map.get(name) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [rows]);

  return (
    <main className="lux-page">
      <section className="lux-shell">
        <header className="lux-directory-head">
          <Grid2x2 size={18} />
          <h1>Категории</h1>
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
            {categories.map((item) => (
              <Link
                key={item.name}
                href={`/?category=${encodeURIComponent(item.name)}`}
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
        <Link href="/categories" className="lux-mobile-nav__item is-active">
          <Grid2x2 size={17} />
          <span>Категории</span>
        </Link>
        <Link href="/sellers" className="lux-mobile-nav__item">
          <Store size={17} />
          <span>Продавцы</span>
        </Link>
      </nav>
    </main>
  );
}
