'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, Heart, Bell, House, Grid2x2, Store } from 'lucide-react';
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
  stock?: number;
  sellers?: Seller;
};

const PRODUCT_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'><rect width='800' height='800' fill='%23f9f9f9'/><g fill='none' stroke='%23c7ccd1' stroke-width='20'><rect x='210' y='240' width='380' height='260' rx='28'/><circle cx='322' cy='322' r='34'/><path d='M258 454l92-96 74 74 54-58 64 80'/></g></svg>";

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

const normalizeImageCandidate = (rawValue: string) => {
  const value = rawValue.trim();
  if (!value) return '';

  if (value.startsWith('data:image/')) {
    const commaIndex = value.indexOf(',');
    if (commaIndex === -1) return '';
    const metadata = value.slice(0, commaIndex + 1);
    const payload = value.slice(commaIndex + 1).replace(/\s+/g, '');
    return `${metadata}${payload}`;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      return encodeURI(value);
    } catch {
      return value;
    }
  }

  return value;
};

const getProductImages = (rawImageUrl?: string) => {
  if (!rawImageUrl) return [];
  const value = rawImageUrl.trim();
  if (!value) return [];

  // Never split data URLs (base64 payload contains commas).
  if (value.startsWith('data:image/')) {
    const normalized = normalizeImageCandidate(value);
    return normalized ? [normalized] : [];
  }

  if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{"') && value.endsWith('}'))) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => typeof item === 'string' && item.trim())
          .map((item) => normalizeImageCandidate(item))
          .filter(Boolean);
      }
    } catch {
      // Fallback to plain separators below.
    }
  }

  const byPrimarySeparators = value
    .split(/[\n;|]/g)
    .map((item) => item.trim())
    .filter(Boolean);

  // Optional comma split only for plain URL lists (not data URLs).
  if (byPrimarySeparators.length === 1 && byPrimarySeparators[0].includes(',')) {
    const commaParts = byPrimarySeparators[0]
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (commaParts.length > 1 && commaParts.every((item) => item.startsWith('http://') || item.startsWith('https://'))) {
      return commaParts.map((item) => normalizeImageCandidate(item)).filter(Boolean);
    }
  }

  return byPrimarySeparators.map((item) => normalizeImageCandidate(item)).filter(Boolean);
};

const SEARCH_HISTORY_KEY = 'marketplace_search_history';
const FAVORITES_KEY = 'marketplace_favorites';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все категории');
  const [selectedShop, setSelectedShop] = useState('Все магазины');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brokenCovers, setBrokenCovers] = useState<Record<string, boolean>>({});
  const [isSellerStorefront, setIsSellerStorefront] = useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const shopRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const lastScrollYRef = useRef(0);
  const directionDistanceRef = useRef(0);
  const hiddenRef = useRef(false);
  const tickingRef = useRef(false);
  const lastToggleAtRef = useRef(0);

  const loadProducts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized. Check .env.local');
      }

      const { data, error: fetchError } = await supabase
        .from('product_market')
        .select('id, name, price, image_url, discount, category, seller_id, description, stock, sellers(id, shop_name, telegram_url, vk_url, whatsapp_url, instagram_url)')
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
    const params = new URLSearchParams(window.location.search);
    const shop = params.get('shop');
    const category = params.get('category');
    setIsSellerStorefront(Boolean(shop && shop.trim()));
    if (category && category.trim()) {
      setSelectedCategory(category.trim());
    }
    if (shop && shop.trim()) {
      setSelectedShop(shop.trim());
    }
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
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setFavorites(parsed.filter((item) => typeof item === 'string'));
    } catch {
      setFavorites([]);
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

  useEffect(() => {
    if (!isMobileSearchExpanded) return;
    mobileSearchInputRef.current?.focus();
  }, [isMobileSearchExpanded]);

  useEffect(() => {
    const onScrollMobile = () => {
      if (window.innerWidth > 840) return;
      if (!isMobileSearchExpanded) return;
      setIsMobileSearchExpanded(false);
    };
    window.addEventListener('scroll', onScrollMobile, { passive: true });
    return () => window.removeEventListener('scroll', onScrollMobile);
  }, [isMobileSearchExpanded]);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    let latestY = window.scrollY;

    const update = () => {
      const now = performance.now();
      const previousY = lastScrollYRef.current;
      const currentY = latestY;
      const delta = currentY - previousY;

      if (Math.abs(delta) < 1) {
        tickingRef.current = false;
        return;
      }

      // Keep nav visible while menus are open.
      if (isSearchOpen || isCategoryOpen || isShopOpen) {
        directionDistanceRef.current = 0;
        if (hiddenRef.current) {
          hiddenRef.current = false;
          setIsNavHidden(false);
          lastToggleAtRef.current = now;
        }
        lastScrollYRef.current = currentY;
        tickingRef.current = false;
        return;
      }

      if (currentY <= 24) {
        directionDistanceRef.current = 0;
        if (hiddenRef.current) {
          hiddenRef.current = false;
          setIsNavHidden(false);
          lastToggleAtRef.current = now;
        }
      } else {
        const goingDown = delta > 0;
        const sameDirection =
          (directionDistanceRef.current >= 0 && goingDown) ||
          (directionDistanceRef.current <= 0 && !goingDown);
        directionDistanceRef.current = sameDirection ? directionDistanceRef.current + delta : delta;

        const threshold = 84;
        const minToggleInterval = 240;

        if (
          goingDown &&
          directionDistanceRef.current > threshold &&
          !hiddenRef.current &&
          now - lastToggleAtRef.current > minToggleInterval
        ) {
          hiddenRef.current = true;
          setIsNavHidden(true);
          directionDistanceRef.current = 0;
          lastToggleAtRef.current = now;
        }

        if (
          !goingDown &&
          directionDistanceRef.current < -threshold &&
          hiddenRef.current &&
          now - lastToggleAtRef.current > minToggleInterval
        ) {
          hiddenRef.current = false;
          setIsNavHidden(false);
          directionDistanceRef.current = 0;
          lastToggleAtRef.current = now;
        }
      }

      lastScrollYRef.current = currentY;
      tickingRef.current = false;
    };

    const onScroll = () => {
      latestY = window.scrollY;
      if (tickingRef.current) return;
      tickingRef.current = true;
      window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isSearchOpen, isCategoryOpen, isShopOpen]);

  const categoryOptions = useMemo(() => {
    const items = Array.from(new Set(products.map((product) => product.category?.trim()).filter(Boolean) as string[]));
    items.sort((a, b) => a.localeCompare(b, 'ru'));
    return ['Все категории', ...items];
  }, [products]);

  const shopOptions = useMemo(() => {
    const items = Array.from(new Set(products.map((product) => product.sellers?.shop_name?.trim()).filter(Boolean) as string[]));
    items.sort((a, b) => a.localeCompare(b, 'ru'));
    return ['Все магазины', ...items];
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

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const filteredProducts = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const categoryMatch = selectedCategory === 'Все категории' || (product.category || '').trim() === selectedCategory;
      if (!categoryMatch) return false;

      const shopMatch = selectedShop === 'Все магазины' || (product.sellers?.shop_name || '').trim() === selectedShop;
      if (!shopMatch) return false;

      if (showFavoritesOnly && !favorites.includes(product.id)) return false;
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
  }, [products, search, selectedCategory, selectedShop, showFavoritesOnly, favorites]);

  return (
    <main className="lux-page lux-page--mobile-header">
      <div className="lux-bg-orb lux-bg-orb-a" aria-hidden />
      <div className="lux-bg-orb lux-bg-orb-b" aria-hidden />

      <section className="lux-mobile-topbar">
        <div className={`lux-mobile-search-inline ${isMobileSearchExpanded ? 'is-open' : ''}`}>
          <button
            type="button"
            className="lux-mobile-topbar__icon"
            onClick={() => {
              setIsMobileSearchExpanded((prev) => !prev);
              setIsCategoryOpen(false);
              setIsShopOpen(false);
            }}
            aria-label="Поиск"
          >
            <Search size={20} />
          </button>

          {isMobileSearchExpanded && (
            <input
              ref={mobileSearchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveSearchToHistory(search);
              }}
              placeholder="Поиск товаров"
              aria-label="Поиск товаров"
            />
          )}
        </div>

        <button type="button" className="lux-mobile-topbar__icon" aria-label="Уведомления">
          <Bell size={20} />
        </button>
      </section>

      {!isSellerStorefront && (
        <section className={`lux-shell lux-nav ${isNavHidden ? 'is-hidden' : ''}`}>
        <div className={`lux-search-wrap ${isSearchOpen ? 'is-open' : ''}`} ref={searchRef}>
          <button
            type="button"
            className="lux-nav-trigger"
            onClick={() => {
              setIsSearchOpen((prev) => !prev);
              setIsCategoryOpen(false);
              setIsShopOpen(false);
            }}
            aria-expanded={isSearchOpen}
          >
            <Search size={18} />
            <span>Поиск</span>
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
                  placeholder="Товар, категория или магазин"
                  aria-label="Поиск товаров"
                />
              </div>

              <div className="lux-history">
                <p>История поиска</p>
                <div>
                  {searchHistory.length === 0 ? (
                    <span className="lux-history-empty">Запросов пока нет</span>
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

        <div className="lux-menu" ref={categoryRef}>
          <button
            type="button"
            className="lux-nav-trigger"
            onClick={() => {
              setIsCategoryOpen((prev) => !prev);
              setIsShopOpen(false);
              setIsSearchOpen(false);
            }}
            aria-expanded={isCategoryOpen}
          >
            <span>Категории</span>
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

        <div className="lux-menu" ref={shopRef}>
          <button
            type="button"
            className="lux-nav-trigger"
            onClick={() => {
              setIsShopOpen((prev) => !prev);
              setIsCategoryOpen(false);
              setIsSearchOpen(false);
            }}
            aria-expanded={isShopOpen}
          >
            <span>Магазины</span>
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

        <div className="lux-nav-spacer" />

        <button
          type="button"
          className={`lux-nav-trigger lux-nav-action ${showFavoritesOnly ? 'is-active' : ''}`}
          onClick={() => setShowFavoritesOnly((prev) => !prev)}
          aria-label="Избранное"
        >
          <Heart size={18} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
          <span>Избранное</span>
          <b>{favorites.length}</b>
        </button>

        <button type="button" className="lux-nav-trigger lux-nav-action" aria-label="Уведомления">
          <Bell size={18} />
        </button>
        </section>
      )}

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
              <p>По выбранным фильтрам ничего не найдено.</p>
            </article>
          )}

          {filteredProducts.map((product, index) => {
            const finalPrice = getDiscountedPrice(product.price, product.discount || 0);
            const parsedCover = getProductImages(product.image_url)[0] || PRODUCT_PLACEHOLDER;
            const cover = brokenCovers[product.id] ? PRODUCT_PLACEHOLDER : parsedCover;

            return (
              <article key={product.id} className="lux-card lux-reveal" style={{ animationDelay: `${Math.min(index * 25, 420)}ms` }}>
                <Link href={`/product/${product.id}`} className="lux-card__entry" aria-label={`Открыть товар ${product.name}`}>
                  <div className="lux-card__imageWrap">
                    <img
                      src={cover}
                      alt={product.name}
                      loading="lazy"
                      onError={() =>
                        setBrokenCovers((prev) => (prev[product.id] ? prev : { ...prev, [product.id]: true }))
                      }
                    />
                    {(product.discount || 0) > 0 ? <span className="lux-discount">-{product.discount}%</span> : null}
                  </div>

                  <div className="lux-card__body">
                    <div className="lux-card__headline">
                      <h3>{product.name}</h3>
                      <div className="lux-card__price">
                        <strong>{toPrice(finalPrice)}</strong>
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </section>
      )}

      <nav className="lux-mobile-nav" aria-label="Нижняя навигация">
        <Link
          href="/"
          className={`lux-mobile-nav__item ${selectedCategory === 'Все категории' && selectedShop === 'Все магазины' ? 'is-active' : ''}`}
        >
          <House size={17} />
          <span>Главная</span>
        </Link>

        <Link href="/categories" className="lux-mobile-nav__item">
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
