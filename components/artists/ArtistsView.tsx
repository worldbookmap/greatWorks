'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImageOff, Plus, Search, User } from 'lucide-react';
import type { Artist } from '@/lib/types';
import { ArtworkModal } from '@/components/artworks/ArtworkModal';
import { ArtistModal } from './ArtistModal';

export function ArtistsView() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [artistModalState, setArtistModalState] = useState<{ artistId?: string } | null>(null);
  const [artworkModalId, setArtworkModalId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/artists' + (search ? `?q=${encodeURIComponent(search)}` : ''));
    if (res.ok) setArtists(await res.json());
  }, [search]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  function lifespan(a: Artist) {
    if (a.birth_year == null && a.death_year == null) return '';
    return `${a.birth_year ?? '?'} – ${a.death_year ?? '?'}`;
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a39a8d]" strokeWidth={2.25} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="화가 이름, 국적, 사조 검색"
            className="w-full rounded-xl border border-black/[0.08] bg-surface py-2.5 pl-10 pr-3.5 text-sm text-[#2a231c] placeholder:text-[#a39a8d] outline-none transition-colors focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <button
          onClick={() => setArtistModalState({})}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          화가 추가
        </button>
      </div>

      {!loading && artists.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-black/[0.1] py-20 text-center">
          <User className="h-8 w-8 text-[#c9beae]" strokeWidth={1.5} />
          <p className="text-sm text-[#8a8074]">등록된 화가가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {artists.map((a) => (
            <button
              key={a.id}
              onClick={() => setArtistModalState({ artistId: a.id })}
              className="flex flex-col items-center gap-2.5 rounded-2xl border border-black/[0.07] bg-surface p-4 text-center shadow-sm shadow-black/[0.03] transition-shadow hover:shadow-lg hover:shadow-black/[0.08]"
            >
              {a.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.image_url} alt="" className="h-20 w-20 rounded-full object-cover ring-1 ring-black/[0.08]" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/[0.03] ring-1 ring-black/[0.08]">
                  <ImageOff className="h-5 w-5 text-[#c9beae]" strokeWidth={1.5} />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-[#2a231c]">{a.name}</p>
                <p className="mt-0.5 truncate text-[11.5px] text-[#8a8074]">
                  {[a.nationality, lifespan(a)].filter(Boolean).join(' · ')}
                </p>
                {a.movement && (
                  <span className="mt-1.5 inline-block rounded-full bg-teal/10 px-2 py-0.5 text-[10.5px] font-medium text-teal">
                    {a.movement}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {artistModalState && (
        <ArtistModal
          artistId={artistModalState.artistId}
          onClose={() => setArtistModalState(null)}
          onSaved={() => load()}
          onDeleted={() => {
            load();
            setArtistModalState(null);
          }}
          onOpenArtwork={(artworkId) => setArtworkModalId(artworkId)}
        />
      )}

      {artworkModalId && (
        <ArtworkModal
          artworkId={artworkModalId}
          onClose={() => setArtworkModalId(null)}
          onSaved={() => {}}
          onDeleted={() => setArtworkModalId(null)}
        />
      )}
    </div>
  );
}
