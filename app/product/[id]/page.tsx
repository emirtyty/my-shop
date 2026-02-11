'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, MessageCircle, Star, X } from 'lucide-react';
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
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 900'><rect width='1200' height='900' fill='%23f9f9f9'/><g fill='none' stroke='%23c7ccd1' stroke-width='24'><rect x='300' y='230' width='600' height='420' rx='36'/><circle cx='470' cy='390' r='44'/><path d='M372 580l148-154 118 118 86-92 102 128'/></g></svg>";

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
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

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
      <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-20 md:px-8 md:py-8">
        <div className="sticky top-16 z-20 mb-5 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--lux-line)] bg-[color:var(--lux-panel)] p-3 backdrop-blur-xl md:top-3">
          <div className="flex items-center gap-2">
            <Link
              href={`/?shop=${encodeURIComponent(product.sellers?.shop_name || '')}`}
              className="inline-flex min-h-10 items-center rounded-xl border border-[color:var(--lux-line)] bg-transparent px-3 text-sm text-[var(--app-text)]"
            >
              {product.sellers?.shop_name || 'Витрина магазина'}
            </Link>

            <button
              type="button"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--lux-line)] bg-transparent ${
                isFavorite ? 'text-pink-300' : 'text-[var(--app-text)]'
              }`}
              onClick={() => toggleFavorite(product.id)}
              aria-label="Добавить в избранное"
            >
              <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>

            <a
              href={sellerLink || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--lux-line)] bg-transparent ${
                sellerLink ? '' : 'pointer-events-none opacity-50'
              }`}
              aria-label="Связаться с продавцом"
            >
              <MessageCircle size={17} />
            </a>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--lux-line)] bg-transparent px-3 py-1 text-xs text-[var(--app-text)]">
            <Star size={13} fill="currentColor" />
            4.9
          </div>
        </div>

        <section className="overflow-hidden rounded-3xl border border-[color:var(--lux-line)] bg-[color:var(--lux-panel)] shadow-[0_24px_60px_-35px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
            <div className="relative bg-[color:var(--app-bg)]">
              <div className="aspect-[4/3]">
                <img
                  src={displayImage}
                  alt={product.name}
                  className="h-full w-full cursor-zoom-in object-cover"
                  onClick={() => setIsImageViewerOpen(true)}
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
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--app-text)]">{product.name}</h1>

              <div className="mt-3 inline-flex items-center rounded-xl border border-[color:var(--lux-line)] bg-transparent px-3 py-1 text-sm text-[var(--app-text)]">
                Доступно: {product.stock ?? 0} шт.
              </div>

              <div className="mt-4 flex items-end gap-3">
                {(product.discount || 0) > 0 ? <span className="text-sm text-[var(--lux-muted)] line-through">{toPrice(product.price)}</span> : null}
                <strong className="text-4xl font-bold tracking-tight text-[var(--app-text)]">{toPrice(finalPrice)}</strong>
              </div>

              {product.description?.trim() ? (
                <p className="mt-5 text-[15px] leading-relaxed text-[var(--lux-muted)]">{product.description.trim()}</p>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {isImageViewerOpen && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm" onClick={() => setIsImageViewerOpen(false)}>
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white"
            onClick={() => setIsImageViewerOpen(false)}
            aria-label="Закрыть просмотр"
          >
            <X size={18} />
          </button>

          <div className="flex h-full w-full items-center justify-center p-4">
            <img
              src={displayImage}
              alt={product.name}
              className="max-h-full max-w-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}
    </main>
  );
}
