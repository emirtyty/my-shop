'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, House } from 'lucide-react';

export default function GlobalNavControls() {
  const router = useRouter();
  const pathname = usePathname();

  const onBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };

  return (
    <nav className="global-nav-controls" aria-label="Глобальная навигация">
      <button type="button" className="global-nav-controls__btn" onClick={onBack} aria-label="Назад">
        <ArrowLeft size={20} />
      </button>
      {pathname !== '/' ? (
        <Link href="/" className="global-nav-controls__btn" aria-label="На главную">
          <House size={20} />
        </Link>
      ) : (
        <span className="global-nav-controls__btn is-hidden" aria-hidden>
          <House size={20} />
        </span>
      )}
    </nav>
  );
}
