"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ProductGrid from "./components/ProductGrid";

function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-4 bottom-4 z-40 rounded-2xl border border-white/15 bg-black/35 px-4 py-3 backdrop-blur-2xl md:hidden">
      <ul className="grid grid-cols-4 text-center text-xs text-zinc-200">
        <li className="font-medium text-white">Home</li>
        <li className="text-zinc-300">Search</li>
        <li className="text-zinc-300">Saved</li>
        <li className="text-zinc-300">Profile</li>
      </ul>
    </nav>
  );
}

function TopNav({
  query,
  setQuery,
  hidden,
}: {
  query: string;
  setQuery: (value: string) => void;
  hidden: boolean;
}) {
  return (
    <motion.header
      animate={{ y: hidden ? -120 : 0, opacity: hidden ? 0 : 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 border-b border-white/10 bg-black/35 backdrop-blur-2xl"
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-4 md:px-8">
        <div className="text-sm tracking-[0.18em] text-zinc-200">LUXE MARKET</div>
        <div className="w-full max-w-xl">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search premium products..."
            className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-400 focus:border-white/30"
          />
        </div>
      </div>
    </motion.header>
  );
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [navHidden, setNavHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;

    const onScroll = () => {
      const current = window.scrollY;
      const delta = current - lastY;

      if (current <= 24) {
        setNavHidden(false);
      } else if (delta > 8) {
        setNavHidden(true);
      } else if (delta < -8) {
        setNavHidden(false);
      }

      lastY = current;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_20%,#1f2d4c_0%,transparent_35%),radial-gradient(circle_at_90%_10%,#253b5f_0%,transparent_30%),linear-gradient(180deg,#06090f_0%,#0b1220_100%)] text-white">
      <TopNav query={query} setQuery={setQuery} hidden={navHidden} />

      <section className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-8 md:px-8 md:pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 md:text-5xl">Curated Luxury Marketplace</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Premium storefront with refined details, smooth motion, and modern conversion-focused presentation.
          </p>
        </div>

        <ProductGrid query={query} />
      </section>

      <MobileBottomNav />
    </main>
  );
}

