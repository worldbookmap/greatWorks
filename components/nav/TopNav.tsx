'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarRange, Images, Map, Palette, User, Waypoints } from 'lucide-react';

const TABS = [
  { href: '/artworks', label: '작품', icon: Images },
  { href: '/artists', label: '화가', icon: User },
  { href: '/era', label: '연대', icon: CalendarRange },
  { href: '/map', label: '지도', icon: Map },
  { href: '/mindmap', label: '마인드맵', icon: Waypoints },
];

export function TopNav() {
  const pathname = usePathname();
  if (pathname === '/login') return null;

  return (
    <header className="sticky top-0 z-[3000] flex items-center justify-between gap-2 border-b border-black/[0.06] bg-background/85 px-3 py-2.5 backdrop-blur-xl sm:px-5 sm:py-3 print:hidden">
      <Link href="/artworks" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-strong shadow-[0_0_20px_-4px_rgba(255,107,74,0.55)] sm:h-8 sm:w-8">
          <Palette className="h-4 w-4 text-white sm:h-4.5 sm:w-4.5" strokeWidth={2.25} />
        </span>
        <span className="truncate text-[14px] font-semibold tracking-tight text-[#2a231c] sm:text-[15px]">
          명화 도감
        </span>
      </Link>

      <nav className="flex shrink-0 items-center gap-0.5 rounded-full border border-black/[0.07] bg-black/[0.025] p-1 sm:gap-1">
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-all duration-200 sm:px-3.5 ${
                active
                  ? 'bg-white text-[#2a231c] shadow-[inset_0_0_0_1px_rgba(42,35,28,0.08)]'
                  : 'text-[#6b6258] hover:text-[#2a231c]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              <span className="hidden sm:inline">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
