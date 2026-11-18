'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollToTop() {
  const pathname = usePathname();

  // Tell the browser not to restore scroll on back/forward — we handle it ourselves.
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
