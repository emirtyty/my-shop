'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, ShoppingBag, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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

const FAVORITES_KEY = 'marketplace_favorites';
const PRODUCT_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 900'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop stop-color='%230e1a30'/><stop offset='1' stop-color='%23172e51'/></linearGradient></defs><rect width='1200' height='900' fill='url(%23g)'/><circle cx='980' cy='180' r='220' fill='%23ffffff10'/><text x='50%' y='52%' text-anchor='middle' fill='%23d7e7ff' font-size='54' font-family='Arial'>Изображение недоступно</text></svg>";

const toPrice = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value || 0);

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
      // Fallback to separators below.
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

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      if (!params?.id) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('product_market')
          .select('id, name, price, image_url, discount, category, seller_id, description, stock, sellers(id, shop_name, telegram_url, vk_url, whatsapp_url, instagram_url)')
          .eq('id', params.id)
          .single();

        if (fetchError) throw new Error(fetchError.message);
        setProduct((data as Product) || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить товар.');
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [params?.id]);

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

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const images = useMemo(() => getProductImages(product?.image_url), [product?.image_url]);

  if (loading) {
    return (
      <main className="min-h-screen text-[var(--app-text)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
          <div className="h-10 w-28 animate-pulse rounded-xl bg-white/10" />
          <div className="mt-6 h-[58vh] animate-pulse rounded-3xl bg-white/10" />
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen text-[var(--app-text)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 text-sm"
          >
            <ArrowLeft size={16} />
            Назад
          </button>
          <div className="mt-6 rounded-2xl border border-rose-300/40 bg-rose-950/20 p-6 text-rose-100">{error || 'Товар не найден.'}</div>
        </div>
      </main>
    );
  }

  const finalPrice = getDiscountedPrice(product.price, product.discount || 0);
  const sellerLink = getSellerLink(product.sellers);
  const isFavorite = favorites.includes(product.id);
  const currentImage = images[imageIndex] || images[0] || PRODUCT_PLACEHOLDER;
  const displayImage = failedImages[currentImage] ? PRODUCT_PLACEHOLDER : currentImage;

  return (
    <main className="min-h-screen text-[var(--app-text)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        <div className="sticky top-3 z-20 mb-5 flex items-center justify-end rounded-2xl border border-white/15 bg-black/35 p-3 backdrop-blur-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1 text-xs text-amber-100">
            <Star size={13} fill="currentColor" />
            4.9
          </div>
        </div>

        <section className="overflow-hidden rounded-3xl border border-white/15 bg-white/[0.06] shadow-[0_32px_90px_-35px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
            <div className="relative bg-zinc-900">
              <div className="aspect-[4/3]">
                <img
                  src={displayImage}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  onError={() => setFailedImages((prev) => (prev[currentImage] ? prev : { ...prev, [currentImage]: true }))}
                />
              </div>

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/35"
                    onClick={() => setImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                    aria-label="Предыдущее фото"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <button
                    type="button"
                    className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/35"
                    onClick={() => setImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                    aria-label="Следующее фото"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              {images.length > 1 && (
                <div className="flex items-center justify-center gap-2 p-3">
                  {images.map((_, idx) => (
                    <button
                      key={`dot-${idx}`}
                      type="button"
                      className={`h-2 rounded-full transition-all ${idx === imageIndex ? 'w-6 bg-amber-200' : 'w-2 bg-white/35'}`}
                      onClick={() => setImageIndex(idx)}
                      aria-label={`Открыть фото ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 md:p-7">
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">{product.name}</h1>

              <div className="mt-3 inline-flex items-center rounded-xl border border-cyan-200/25 bg-cyan-200/10 px-3 py-1 text-sm text-cyan-100">
                Доступно: {product.stock ?? 0} шт.
              </div>

              <div className="mt-4 flex items-end gap-3">
                {(product.discount || 0) > 0 ? <span className="text-sm text-zinc-500 line-through">{toPrice(product.price)}</span> : null}
                <strong className="text-4xl font-bold tracking-tight text-white">{toPrice(finalPrice)}</strong>
              </div>

              <Link
                href={`/?shop=${encodeURIComponent(product.sellers?.shop_name || '')}`}
                className="mt-5 inline-flex rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-zinc-100 hover:bg-white/10"
              >
                {product.sellers?.shop_name || 'Витрина магазина'}
              </Link>

              {product.description?.trim() ? (
                <p className="mt-5 text-[15px] leading-relaxed text-zinc-300">{product.description.trim()}</p>
              ) : null}

              <div className="mt-7 flex items-center gap-3">
                <button
                  type="button"
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 ${
                    isFavorite ? 'text-pink-300 border-pink-300/50' : 'text-white'
                  }`}
                  onClick={() => toggleFavorite(product.id)}
                  aria-label="Добавить в избранное"
                >
                  <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>

                <a
                  href={sellerLink || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 ${
                    sellerLink ? '' : 'pointer-events-none opacity-50'
                  }`}
                  aria-label="Купить"
                >
                  <ShoppingBag size={18} />
                </a>

                <a
                  href={sellerLink || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 ${
                    sellerLink ? '' : 'pointer-events-none opacity-50'
                  }`}
                  aria-label="Связаться с продавцом"
                >
                  <MessageCircle size={18} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
