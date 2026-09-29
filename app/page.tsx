'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarRange,
  Images,
  Landmark,
  Loader2,
  Ticket,
  User,
  Waypoints,
} from 'lucide-react';
import type { Artist, Artwork } from '@/lib/types';

interface Stat {
  key: string;
  label: string;
  value: number;
  hint?: string;
  icon: typeof Images;
}

const QUICK_LINKS = [
  { href: '/artworks', label: '작품 둘러보기', icon: Images },
  { href: '/artists', label: '화가 둘러보기', icon: User },
  { href: '/era', label: '연대로 보기', icon: CalendarRange },
  { href: '/mindmap', label: '인물관계 보기', icon: Waypoints },
  { href: '/exhibitions', label: '전시회 후기', icon: Ticket },
];

function decadeLabel(decade: number) {
  if (decade < 0) return `기원전 ${-decade}년대`;
  return `${decade}년대`;
}

export default function Home() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetch('/api/artworks'), fetch('/api/artists')])
      .then(async ([artworksRes, artistsRes]) => {
        if (cancelled) return;
        if (artworksRes.ok) setArtworks(await artworksRes.json());
        if (artistsRes.ok) setArtists(await artistsRes.json());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { decadeCount, eraRange, venueCount } = useMemo(() => {
    const decades = new Set<number>();
    const venues = new Set<string>();
    let min: number | null = null;
    let max: number | null = null;

    for (const art of artworks) {
      if (art.year != null) {
        const decade = Math.floor(art.year / 10) * 10;
        decades.add(decade);
        min = min == null ? decade : Math.min(min, decade);
        max = max == null ? decade : Math.max(max, decade);
      }
      if (art.collection_name) venues.add(art.collection_name);
    }

    return {
      decadeCount: decades.size,
      eraRange: min != null && max != null ? `${decadeLabel(min)} ~ ${decadeLabel(max)}` : null,
      venueCount: venues.size,
    };
  }, [artworks]);

  const stats: Stat[] = [
    { key: 'artworks', label: '작품', value: artworks.length, icon: Images },
    { key: 'artists', label: '화가', value: artists.length, icon: User },
    { key: 'eras', label: '시대', value: decadeCount, hint: eraRange ?? undefined, icon: CalendarRange },
    { key: 'venues', label: '소장처', value: venueCount, icon: Landmark },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 py-14 sm:px-6 sm:py-20">
      <div className="flex flex-col items-center text-center">
        <h1 className="font-serif text-[26px] font-semibold tracking-normal text-[#2a231c] sm:text-[32px]">
          명화 도감
        </h1>
        <p className="mt-2 max-w-md text-[13.5px] text-[#8a8074] sm:text-sm">
          화가와 작품, 소장 위치, 작가들 사이의 관계를 한눈에 살펴봅니다
        </p>
      </div>

      {loading ? (
        <div className="mt-14 flex flex-col items-center gap-3 text-[#8a8074]">
          <Loader2 className="h-6 w-6 animate-spin text-accent-strong" strokeWidth={2.25} />
          <p className="text-[13px]">자료를 불러오는 중입니다…</p>
        </div>
      ) : (
        <>
          <div className="mt-12 grid w-full grid-cols-2 gap-3 sm:mt-14 sm:grid-cols-4 sm:gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.key}
                  className="modal-panel flex flex-col items-center gap-2 rounded-2xl border border-black/[0.07] bg-surface px-4 py-6 text-center shadow-sm shadow-black/[0.03]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-strong shadow-[0_0_16px_-4px_rgba(255,107,74,0.5)]">
                    <Icon className="h-4.5 w-4.5 text-white" strokeWidth={2.25} />
                  </span>
                  <span className="font-serif text-[26px] font-semibold tracking-normal text-[#2a231c]">
                    {stat.value.toLocaleString('ko')}
                  </span>
                  <span className="text-[12.5px] text-[#8a8074]">{stat.label}</span>
                  {stat.hint && <span className="text-[10.5px] text-[#a39a8d]">{stat.hint}</span>}
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-2 sm:mt-12">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-surface px-3.5 py-2 text-[12.5px] font-medium text-[#4a4038] transition hover:border-accent/40 hover:text-[#2a231c] active:scale-[0.96]"
                >
                  <Icon className="h-3.5 w-3.5 text-accent-strong" strokeWidth={2.25} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
