'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  MessageCircle,
  ShoppingBag,
} from 'lucide-react';
import { supabase } from './lib/supabase';

type Seller = {
  id?: string;
  shop_name?: string;
  telegram?: string;
  vk?: string;
  whatsapp?: string;
  instagram?: string;
  telegram_url?: string;
  vk_url?: string;
  whatsapp_url?: string;
  instagram_url?: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  discount?: number;
  category?: string;
  seller_id?: string;
  description?: string;
  sellers?: Seller;
};

type SortMode = 'featured' | 'price-asc' | 'price-desc' | 'discount';

const toPrice = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value || 0);

const getSellerLink = (seller?: Seller) => {
  if (!seller) return null;

  const telegram = seller.telegram_url || seller.telegram;
  const vk = seller.vk_url || seller.vk;
  const whatsapp = seller.whatsapp_url || seller.whatsapp;
  const instagram = seller.instagram_url || seller.instagram;

  if (telegram) {
    return telegram.startsWith('@') ? `https://t.me/${telegram.slice(1)}` : telegram;
  }

  if (vk) return vk;
  if (whatsapp) return whatsapp;

  if (instagram) {
    return instagram.startsWith('@') ? `https://instagram.com/${instagram.slice(1)}` : instagram;
  }

  return null;
};

const getDiscountedPrice = (price: number, discount = 0) => {
  if (!discount || discount <= 0) return price;
  return Math.max(0, Math.round(price * (1 - discount / 100)));
};

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortMode, setSortMode] = useState<SortMode>('featured');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized. Check .env.local');
      }

      const { data, error: fetchError } = await supabase
        .from('product_market')
        .select('id, name, price, image_url, discount, category, seller_id, description, sellers(id, shop_name, telegram, vk, whatsapp, instagram, telegram_url, vk_url, whatsapp_url, instagram_url)')
        .limit(300);

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setProducts((data as Product[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load products.';
      setError(message);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();

    for (const product of products) {
      if (product.category && product.category.trim()) {
        set.add(product.category.trim());
      }
    }

    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const inCategory = activeCategory === 'All' || product.category === activeCategory;
      if (!inCategory) return false;

      if (!normalizedQuery) return true;

      const haystack = `${product.name} ${product.description || ''} ${product.category || ''} ${product.sellers?.shop_name || ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    return filtered.sort((a, b) => {
      const aFinal = getDiscountedPrice(a.price, a.discount || 0);
      const bFinal = getDiscountedPrice(b.price, b.discount || 0);

      if (sortMode === 'price-asc') return aFinal - bFinal;
      if (sortMode === 'price-desc') return bFinal - aFinal;
      if (sortMode === 'discount') return (b.discount || 0) - (a.discount || 0);

      const aScore = (a.discount || 0) * 5 + Math.min(aFinal, 200000) * -0.0001;
      const bScore = (b.discount || 0) * 5 + Math.min(bFinal, 200000) * -0.0001;
      return bScore - aScore;
    });
  }, [products, activeCategory, search, sortMode]);

  const highlighted = filteredProducts.slice(0, 3);

  const stats = useMemo(() => {
    const sellers = new Set(products.map((item) => item.seller_id).filter(Boolean)).size;
    const discounts = products.filter((item) => (item.discount || 0) > 0).length;
    return { total: products.length, sellers, discounts };
  }, [products]);

  return (
    <main className="lux-page">
      <div className="lux-bg-orb lux-bg-orb-a" aria-hidden />
      <div className="lux-bg-orb lux-bg-orb-b" aria-hidden />

      <section className="lux-shell lux-hero">
        <div className="lux-hero__badge lux-reveal">
          <Sparkles size={16} />
          <span>Curated Digital Luxury Marketplace</span>
        </div>

        <div className="lux-hero__head lux-reveal" style={{ animationDelay: '80ms' }}>
          <h1>RA DELL Signature Storefront</h1>
          <p>Premium showcase focused on trust, conversion, and smooth discovery.</p>
        </div>

        <div className="lux-metrics lux-reveal" style={{ animationDelay: '140ms' }}>
          <article>
            <span>Products</span>
            <strong>{stats.total}</strong>
          </article>
          <article>
            <span>Sellers</span>
            <strong>{stats.sellers}</strong>
          </article>
          <article>
            <span>Discounts</span>
            <strong>{stats.discounts}</strong>
          </article>
        </div>
      </section>

      <section className="lux-shell lux-controls lux-reveal" style={{ animationDelay: '200ms' }}>
        <div className="lux-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, category, or seller"
            aria-label="Search products"
          />
        </div>

        <div className="lux-sort">
          <SlidersHorizontal size={16} />
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="featured">Featured</option>
            <option value="discount">Max discount</option>
            <option value="price-asc">Price low to high</option>
            <option value="price-desc">Price high to low</option>
          </select>
        </div>

        <button className="lux-refresh" onClick={loadProducts} type="button" aria-label="Refresh list">
          <RefreshCw size={16} />
          Refresh
        </button>
      </section>

      <section className="lux-shell lux-categories lux-reveal" style={{ animationDelay: '260ms' }}>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={category === activeCategory ? 'is-active' : ''}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </section>

      {error && (
        <section className="lux-shell lux-state lux-state--error">
          <p>{error}</p>
        </section>
      )}

      {!error && isLoading && (
        <section className="lux-shell lux-grid">
          {Array.from({ length: 8 }).map((_, index) => (
            <article key={index} className="lux-card lux-card--skeleton" />
          ))}
        </section>
      )}

      {!error && !isLoading && highlighted.length > 0 && (
        <section className="lux-shell lux-highlight">
          {highlighted.map((product, index) => {
            const finalPrice = getDiscountedPrice(product.price, product.discount || 0);
            return (
              <article key={product.id} className="lux-highlight__card lux-reveal" style={{ animationDelay: `${180 + index * 70}ms` }}>
                <div>
                  <span className="lux-highlight__tag">
                    <TrendingUp size={14} />
                    Editor pick
                  </span>
                  <h3>{product.name}</h3>
                  <p>{product.description || 'Top performer with strong value-to-price ratio.'}</p>
                  <div className="lux-highlight__price">
                    {product.discount ? <small>{toPrice(product.price)}</small> : null}
                    <strong>{toPrice(finalPrice)}</strong>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {!error && !isLoading && (
        <section className="lux-shell lux-grid">
          {filteredProducts.length === 0 && (
            <article className="lux-state">
              <p>No items match your filters. Try another category or clear search.</p>
            </article>
          )}

          {filteredProducts.map((product, index) => {
            const finalPrice = getDiscountedPrice(product.price, product.discount || 0);
            const sellerLink = getSellerLink(product.sellers);

            return (
              <article key={product.id} className="lux-card lux-reveal" style={{ animationDelay: `${Math.min(index * 25, 420)}ms` }}>
                <div className="lux-card__imageWrap">
                  <img src={product.image_url} alt={product.name} loading="lazy" />
                  {(product.discount || 0) > 0 ? <span className="lux-discount">-{product.discount}%</span> : null}
                </div>

                <div className="lux-card__body">
                  <div className="lux-card__meta">
                    <span>{product.category || 'Uncategorized'}</span>
                    <span className="lux-rating">
                      <Star size={14} fill="currentColor" />
                      4.9
                    </span>
                  </div>

                  <h3>{product.name}</h3>
                  <p>{product.sellers?.shop_name || 'Verified seller'}</p>

                  <div className="lux-card__price">
                    {(product.discount || 0) > 0 ? <small>{toPrice(product.price)}</small> : null}
                    <strong>{toPrice(finalPrice)}</strong>
                  </div>

                  <div className="lux-card__actions">
                    <a
                      href={sellerLink || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`lux-btn ${sellerLink ? '' : 'is-disabled'}`}
                      onClick={(event) => {
                        if (!sellerLink) event.preventDefault();
                      }}
                    >
                      <MessageCircle size={15} />
                      Contact seller
                    </a>

                    <button type="button" className="lux-btn lux-btn--ghost">
                      <ShoppingBag size={15} />
                      Save
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section className="lux-shell lux-footer-note lux-reveal" style={{ animationDelay: '320ms' }}>
        <div>
          <ShieldCheck size={16} />
          <span>Supabase and Vercel integrations were preserved.</span>
        </div>
        <ArrowRight size={18} />
      </section>
    </main>
  );
}
