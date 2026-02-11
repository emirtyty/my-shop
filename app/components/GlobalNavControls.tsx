'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, House } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function GlobalNavControls() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSellerStorefront, setIsSellerStorefront] = useState(false);
  const isHome = pathname === '/';
  const isDirectoryPage = pathname === '/categories' || pathname === '/sellers';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setIsSellerStorefront(isHome && Boolean(params.get('shop')?.trim()));
  }, [isHome]);

  const onBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };

  if (isHome && !isSellerStorefront) {
    return null;
  }

  return (
    <nav className={`global-nav-controls ${isDirectoryPage ? 'is-hidden-mobile' : ''}`} aria-label="Глобальная навигация">
      <button type="button" className="global-nav-controls__btn" onClick={onBack} aria-label="Назад">
        <ArrowLeft size={20} />
      </button>
      <Link href="/" className="global-nav-controls__btn" aria-label="На главную">
        <House size={20} />
      </Link>
    </nav>
  );
}
