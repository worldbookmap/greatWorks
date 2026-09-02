'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImageOff, LayoutGrid, List, Palette, Plus, Search } from 'lucide-react';
import type { Artwork } from '@/lib/types';
import { Pagination } from '@/components/ui/Pagination';
import { ArtworkModal } from './ArtworkModal';
import { ArtworkDetailModal } from './ArtworkDetailModal';

type ViewMode = 'grid' | 'list';
const VIEW_MODE_KEY = 'artworks-view-mode';
const PAGE_SIZE = 15;

export function ArtworksView() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailArtworkId, setDetailArtworkId] = useState<string | null>(null);
  const [editState, setEditState] = useState<{ artworkId?: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const res = await fetch('/api/artworks' + (search ? `?q=${encodeURIComponent(search)}` : ''));
    if (res.ok) setArtworks(await res.json());
  }, [search]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(artworks.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedArtworks = artworks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved === 'grid' || saved === 'list') setViewMode(saved);
  }, []);

  function handleSetViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a39a8d]" strokeWidth={2.25} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="작품 이름, 소장처 검색"
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
          onClick={() => setEditState({})}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          작품 추가
        </button>
      </div>

      {!loading && artworks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-black/[0.1] py-20 text-center">
          <Palette className="h-8 w-8 text-[#c9beae]" strokeWidth={1.5} />
          <p className="text-sm text-[#8a8074]">등록된 작품이 없습니다.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {pagedArtworks.map((art) => (
            <button
              key={art.id}
              onClick={() => setDetailArtworkId(art.id)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.07] bg-surface text-left shadow-sm shadow-black/[0.03] transition-shadow hover:shadow-lg hover:shadow-black/[0.08]"
            >
              <div className="flex aspect-[4/5] items-center justify-center overflow-hidden bg-black/[0.03]">
                {art.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={art.image_url}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                ) : (
                  <ImageOff className="h-6 w-6 text-[#c9beae]" strokeWidth={1.5} />
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-[13.5px] font-semibold text-[#2a231c]">{art.title}</p>
                <p className="mt-0.5 truncate text-[12px] text-[#8a8074]">
                  {art.artist?.name ?? '작가 미상'}
                  {art.year != null && ` · ${art.year}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pagedArtworks.map((art) => (
            <button
              key={art.id}
              onClick={() => setDetailArtworkId(art.id)}
              className="flex items-center gap-3 rounded-xl border border-black/[0.07] bg-surface p-2.5 text-left shadow-sm shadow-black/[0.03] transition-shadow hover:shadow-lg hover:shadow-black/[0.08]"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/[0.03]">
                {art.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={art.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageOff className="h-4 w-4 text-[#c9beae]" strokeWidth={1.5} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-[#2a231c]">{art.title}</p>
                <p className="mt-0.5 truncate text-[12px] text-[#8a8074]">
                  {art.artist?.name ?? '작가 미상'}
                  {art.year != null && ` · ${art.year}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />

      {detailArtworkId && (
        <ArtworkDetailModal
          artworkId={detailArtworkId}
          onClose={() => setDetailArtworkId(null)}
          onEdit={() => {
            setEditState({ artworkId: detailArtworkId });
            setDetailArtworkId(null);
          }}
          onDeleted={() => {
            load();
            setDetailArtworkId(null);
          }}
        />
      )}

      {editState && (
        <ArtworkModal
          artworkId={editState.artworkId}
          onClose={() => setEditState(null)}
          onSaved={() => {
            load();
          }}
          onDeleted={() => {
            load();
            setEditState(null);
          }}
        />
      )}
    </div>
  );
}
