"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import ProductCard from "./ProductCard";
import { fetchProducts, type Product } from "../../lib/supabaseClient";

interface ProductGridProps {
  query: string;
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-xl">
      <div className="mb-4 aspect-[4/3] animate-pulse rounded-xl bg-zinc-800/70" />
      <div className="space-y-2 p-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800/70" />
        <div className="h-7 w-1/2 animate-pulse rounded bg-zinc-800/70" />
        <div className="mt-3 h-10 w-full animate-pulse rounded-xl bg-zinc-800/70" />
      </div>
    </div>
  );
}

export default function ProductGrid({ query }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const rows = await fetchProducts();
        if (mounted) setProducts(rows);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((item) => item.title.toLowerCase().includes(q));
  }, [products, query]);

  if (loading) {
    return (
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-300/30 bg-rose-950/20 p-6 text-rose-100 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.14em] text-rose-200/80">Error</p>
        <p className="mt-2 text-base">{error}</p>
      </section>
    );
  }

  if (filtered.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-10 text-center backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.14em] text-zinc-400">No products</p>
        <h3 className="mt-2 text-xl font-medium text-zinc-100">Nothing matched your search</h3>
      </section>
    );
  }

  return (
    <motion.section
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
      }}
      className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
    >
      {filtered.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </motion.section>
  );
}

