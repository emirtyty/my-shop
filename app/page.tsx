'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, Star, MessageCircle, ShoppingBag } from 'lucide-react';
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

  if (telegram) return telegram.startsWith('@') ? `https://t.me/${telegram.slice(1)}` : telegram;
  if (vk) return vk;
  if (whatsapp) return whatsapp;
  if (instagram) return instagram.startsWith('@') ? `https://instagram.com/${instagram.slice(1)}` : instagram;

  return null;
};

const getDiscountedPrice = (price: number, discount = 0) => {
  if (!discount || discount <= 0) return price;
  return Math.max(0, Math.round(price * (1 - discount / 100)));
};

const SEARCH_HISTORY_KEY = 'marketplace_search_history';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All categories');
  const [selectedShop, setSelectedShop] = useState('All shops');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const shopRef = useRef<HTMLDivElement>(null);

  const loadProducts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized. Check .env.local');
      }

      const { data, error: fetchError } = await supabase
        .from('product_market')
        .select('id, name, price, image_url, discount, category, seller_id, description, sellers(id, shop_name, telegram_url, vk_url, whatsapp_url, instagram_url)')
        .limit(300);

      if (fetchError) throw new Error(fetchError.message);
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setSearchHistory(parsed.filter((item) => typeof item === 'string').slice(0, 8));
    } catch {
      setSearchHistory([]);
    }
  }, []);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) setIsSearchOpen(false);
      if (categoryRef.current && !categoryRef.current.contains(target)) setIsCategoryOpen(false);
      if (shopRef.current && !shopRef.current.contains(target)) setIsShopOpen(false);
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const categoryOptions = useMemo(() => {
    const items = Array.from(new Set(products.map((product) => product.category?.trim()).filter(Boolean) as string[]));
    items.sort((a, b) => a.localeCompare(b, 'ru'));
    return ['All categories', ...items];
  }, [products]);

  const shopOptions = useMemo(() => {
    const items = Array.from(new Set(products.map((product) => product.sellers?.shop_name?.trim()).filter(Boolean) as string[]));
    items.sort((a, b) => a.localeCompare(b, 'ru'));
    return ['All shops', ...items];
  }, [products]);

  const saveSearchToHistory = (query: string) => {
    const value = query.trim();
    if (!value) return;

    setSearchHistory((prev) => {
      const next = [value, ...prev.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 8);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  const filteredProducts = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const categoryMatch = selectedCategory === 'All categories' || (product.category || '').trim() === selectedCategory;
      if (!categoryMatch) return false;

      const shopMatch = selectedShop === 'All shops' || (product.sellers?.shop_name || '').trim() === selectedShop;
      if (!shopMatch) return false;

      if (!normalizedQuery) return true;

      const haystack = `${product.name} ${product.description || ''} ${product.category || ''} ${product.sellers?.shop_name || ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    return filtered.sort((a, b) => {
      const aFinal = getDiscountedPrice(a.price, a.discount || 0);
      const bFinal = getDiscountedPrice(b.price, b.discount || 0);
      const aScore = (a.discount || 0) * 5 + Math.min(aFinal, 200000) * -0.0001;
      const bScore = (b.discount || 0) * 5 + Math.min(bFinal, 200000) * -0.0001;
      return bScore - aScore;
    });
  }, [products, search, selectedCategory, selectedShop]);

  return (
    <main className="lux-page">
      <div className="lux-bg-orb lux-bg-orb-a" aria-hidden />
      <div className="lux-bg-orb lux-bg-orb-b" aria-hidden />

      <section className="lux-shell lux-nav lux-reveal">
        <div className={`lux-search-wrap ${isSearchOpen ? 'is-open' : ''}`} ref={searchRef}>
          <button
            type="button"
            className="lux-nav-trigger"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            aria-expanded={isSearchOpen}
          >
            <Search size={18} />
            <span>Search</span>
          </button>

          {isSearchOpen && (
            <div className="lux-popover lux-search-popover">
              <div className="lux-search-input">
                <Search size={16} />
                <input
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') saveSearchToHistory(search);
                  }}
                  placeholder="Product, category, or shop"
                  aria-label="Search products"
                />
              </div>

              <div className="lux-history">
                <p>Search history</p>
                <div>
                  {searchHistory.length === 0 ? (
                    <span className="lux-history-empty">No recent queries</span>
                  ) : (
                    searchHistory.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="lux-chip"
                        onClick={() => {
                          setSearch(item);
                          saveSearchToHistory(item);
                          setIsSearchOpen(false);
                        }}
                      >
                        {item}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="lux-menu"
          ref={categoryRef}
          onMouseEnter={() => setIsCategoryOpen(true)}
          onMouseLeave={() => setIsCategoryOpen(false)}
        >
          <button
            type="button"
            className="lux-nav-trigger"
            onClick={() => setIsCategoryOpen((prev) => !prev)}
            aria-expanded={isCategoryOpen}
          >
            <span>Categories</span>
            <ChevronDown size={16} />
          </button>

          {isCategoryOpen && (
            <div className="lux-popover">
              {categoryOptions.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`lux-menu-item ${selectedCategory === category ? 'is-active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(category);
                    setIsCategoryOpen(false);
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className="lux-menu"
          ref={shopRef}
          onMouseEnter={() => setIsShopOpen(true)}
          onMouseLeave={() => setIsShopOpen(false)}
        >
          <button
            type="button"
            className="lux-nav-trigger"
            onClick={() => setIsShopOpen((prev) => !prev)}
            aria-expanded={isShopOpen}
          >
            <span>Shops</span>
            <ChevronDown size={16} />
          </button>

          {isShopOpen && (
            <div className="lux-popover">
              {shopOptions.map((shop) => (
                <button
                  key={shop}
                  type="button"
                  className={`lux-menu-item ${selectedShop === shop ? 'is-active' : ''}`}
                  onClick={() => {
                    setSelectedShop(shop);
                    setIsShopOpen(false);
                  }}
                >
                  {shop}
                </button>
              ))}
            </div>
          )}
        </div>
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

      {!error && !isLoading && (
        <section className="lux-shell lux-grid">
          {filteredProducts.length === 0 && (
            <article className="lux-state">
              <p>No items match your filters. Try another category, shop, or query.</p>
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
    </main>
  );
}
