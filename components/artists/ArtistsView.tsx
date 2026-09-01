'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImageOff, LayoutGrid, List, Plus, Search, User } from 'lucide-react';
import type { Artist } from '@/lib/types';
import { ArtworkModal } from '@/components/artworks/ArtworkModal';
import { ArtworkDetailModal } from '@/components/artworks/ArtworkDetailModal';
import { ArtistModal } from './ArtistModal';
import { ArtistDetailModal } from './ArtistDetailModal';

type ViewMode = 'grid' | 'list';
const VIEW_MODE_KEY = 'artists-view-mode';

export function ArtistsView() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailArtistId, setDetailArtistId] = useState<string | null>(null);
  const [editArtistState, setEditArtistState] = useState<{ artistId?: string } | null>(null);
  const [detailArtworkId, setDetailArtworkId] = useState<string | null>(null);
  const [editArtworkId, setEditArtworkId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const load = useCallback(async () => {
    const res = await fetch('/api/artists' + (search ? `?q=${encodeURIComponent(search)}` : ''));
    if (res.ok) setArtists(await res.json());
  }, [search]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved === 'grid' || saved === 'list') setViewMode(saved);
  }, []);

  function handleSetViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

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
        <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-black/[0.08] bg-surface p-1">
          <button
            onClick={() => handleSetViewMode('grid')}
            aria-label="카드형 보기"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-black/[0.06] text-[#2a231c]' : 'text-[#a39a8d] hover:text-[#4a4038]'
            }`}
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={2.25} />
          </button>
          <button
            onClick={() => handleSetViewMode('list')}
            aria-label="목록형 보기"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-black/[0.06] text-[#2a231c]' : 'text-[#a39a8d] hover:text-[#4a4038]'
            }`}
          >
            <List className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
        <button
          onClick={() => setEditArtistState({})}
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
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {artists.map((a) => (
            <button
              key={a.id}
              onClick={() => setDetailArtistId(a.id)}
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
      ) : (
        <div className="flex flex-col gap-2">
          {artists.map((a) => (
            <button
              key={a.id}
              onClick={() => setDetailArtistId(a.id)}
              className="flex items-center gap-3 rounded-xl border border-black/[0.07] bg-surface p-2.5 text-left shadow-sm shadow-black/[0.03] transition-shadow hover:shadow-lg hover:shadow-black/[0.08]"
            >
              {a.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.image_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-black/[0.08]" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/[0.03] ring-1 ring-black/[0.08]">
                  <ImageOff className="h-4 w-4 text-[#c9beae]" strokeWidth={1.5} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-[#2a231c]">{a.name}</p>
                <p className="mt-0.5 truncate text-[11.5px] text-[#8a8074]">
                  {[a.nationality, lifespan(a)].filter(Boolean).join(' · ')}
                </p>
              </div>
              {a.movement && (
                <span className="shrink-0 rounded-full bg-teal/10 px-2 py-0.5 text-[10.5px] font-medium text-teal">
                  {a.movement}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {detailArtistId && (
        <ArtistDetailModal
          artistId={detailArtistId}
          onClose={() => setDetailArtistId(null)}
          onEdit={() => {
            setEditArtistState({ artistId: detailArtistId });
            setDetailArtistId(null);
          }}
          onDeleted={() => {
            load();
            setDetailArtistId(null);
          }}
          onOpenArtwork={(artworkId) => setDetailArtworkId(artworkId)}
        />
      )}

      {editArtistState && (
        <ArtistModal
          artistId={editArtistState.artistId}
          onClose={() => setEditArtistState(null)}
          onSaved={() => load()}
          onDeleted={() => {
            load();
            setEditArtistState(null);
          }}
          onOpenArtwork={(artworkId) => setDetailArtworkId(artworkId)}
        />
      )}

      {detailArtworkId && (
        <ArtworkDetailModal
          artworkId={detailArtworkId}
          onClose={() => setDetailArtworkId(null)}
          onEdit={() => {
            setEditArtworkId(detailArtworkId);
            setDetailArtworkId(null);
          }}
          onDeleted={() => setDetailArtworkId(null)}
        />
      )}

      {editArtworkId && (
        <ArtworkModal
          artworkId={editArtworkId}
          onClose={() => setEditArtworkId(null)}
          onSaved={() => {}}
          onDeleted={() => setEditArtworkId(null)}
        />
      )}
    </div>
  );
}
