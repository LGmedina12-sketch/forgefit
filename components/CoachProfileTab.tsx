'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function CoachProfileTab() {
  const pathname = usePathname();
  const active = pathname?.startsWith('/coach');
  if (pathname === '/') return null;

  return (
    <Link
      href="/coach"
      className={`fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border px-5 py-3 text-sm font-black shadow-2xl backdrop-blur ${
        active
          ? 'border-orange-300 bg-orange-500 text-black'
          : 'border-white/10 bg-white/15 text-white'
      }`}
    >
      Coach / Profile
    </Link>
  );
}
