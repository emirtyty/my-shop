"use client";

import { useMemo, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import type { Product } from "../../lib/supabaseClient";

interface ProductCardProps {
  product: Product;
  index: number;
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M21.5 3.5a1 1 0 0 0-1.05-.16L2.6 10.4a1 1 0 0 0 .08 1.88l4.42 1.47 1.47 4.42a1 1 0 0 0 1.88.08l7.06-17.84a1 1 0 0 0-.01-.91ZM9.2 15.83l-.95-2.87 7.18-6.02-6.02 7.18-.21 1.71Z" />
    </svg>
  );
}

function toPrice(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function toTelegramLink(value: string | null) {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("@")) return `https://t.me/${raw.slice(1)}`;
  return `https://t.me/${raw}`;
}

function discountedPrice(price: number, discount: number | null) {
  if (!discount || discount <= 0) return price;
  return Math.round(price * (1 - discount / 100));
}

function RatingStars({ rating }: { rating: number }) {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-1 text-xs">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={i < rounded ? "text-amber-300" : "text-zinc-600"}>
            ★
          </span>
        ))}
      </div>
      <span className="text-zinc-300">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function ProductCard({ product, index }: ProductCardProps) {
  const [loaded, setLoaded] = useState(false);

  // Magnetic hover offset with spring smoothing.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 220, damping: 22, mass: 0.35 });
  const sy = useSpring(my, { stiffness: 220, damping: 22, mass: 0.35 });

  const tgLink = useMemo(() => toTelegramLink(product.seller_telegram), [product.seller_telegram]);
  const finalPrice = useMemo(() => discountedPrice(product.price, product.discount), [product.price, product.discount]);
  const rating = product.rating ?? 4.8;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.4), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      style={{ x: sx, y: sy }}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        mx.set(dx * 0.04);
        my.set(dy * 0.04);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_26px_65px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.1] via-transparent to-transparent" />

      <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-zinc-900">
        {(product.discount ?? 0) > 0 ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-emerald-300 px-2.5 py-1 text-xs font-semibold text-emerald-950">
            -{product.discount}%
          </span>
        ) : null}

        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={`h-full w-full object-cover transition-all duration-700 ${loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-sm text-zinc-500">No image</div>
        )}
      </div>

      <div className="space-y-3 p-5">
        <h3 className="line-clamp-2 text-base font-medium text-zinc-100">{product.title}</h3>

        <div className="flex items-end justify-between">
          <div>
            {(product.discount ?? 0) > 0 ? <p className="text-xs text-zinc-500 line-through">{toPrice(product.price)}</p> : null}
            <p className="text-2xl font-semibold tracking-tight text-white">{toPrice(finalPrice)}</p>
          </div>
          <RatingStars rating={rating} />
        </div>

        <motion.a
          href={tgLink ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          whileTap={{ scale: 0.97 }}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.1] px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/[0.16] ${
            tgLink ? "" : "pointer-events-none opacity-50"
          }`}
        >
          <TelegramIcon />
          Contact seller
        </motion.a>
      </div>
    </motion.article>
  );
}

