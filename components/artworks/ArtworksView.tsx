'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe2, ImageOff, LayoutGrid, List, Palette, Plus, Search, User } from 'lucide-react';
import type { Artwork } from '@/lib/types';
import { Pagination } from '@/components/ui/Pagination';
import { RemoteThumbnail } from '@/components/ui/RemoteThumbnail';
import { ArtworkModal } from './ArtworkModal';
import { ArtworkDetailModal } from './ArtworkDetailModal';

type ViewMode = 'grid' | 'list';
const VIEW_MODE_KEY = 'artworks-view-mode';
const PAGE_SIZE = 15;

type GroupKey = 'movement' | 'nationality' | 'artist';

const GROUP_OPTIONS: { key: GroupKey; label: string; unknownLabel: string; icon: typeof Palette; getKey: (art: Artwork) => string }[] = [
  { key: 'movement', label: '사조', unknownLabel: '사조 미상', icon: Palette, getKey: (art) => art.artist?.movement?.trim() ?? '' },
  { key: 'nationality', label: '국가', unknownLabel: '국가 미상', icon: Globe2, getKey: (art) => art.artist?.nationality?.trim() ?? '' },
  { key: 'artist', label: '화가', unknownLabel: '작가 미상', icon: User, getKey: (art) => art.artist?.name?.trim() ?? '' },
];

interface GroupSection {
  key: string;
  label: string;
  artworks: Artwork[];
}

function ArtworkGridCard({ art, onClick }: { art: Artwork; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.07] bg-surface text-left shadow-sm shadow-black/[0.03] transition hover:shadow-lg hover:shadow-black/[0.08] active:scale-[0.97]"
    >
      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-black/[0.03]">
        {art.image_url ? (
          <RemoteThumbnail
            src={art.image_url}
            alt=""
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <ImageOff className="h-6 w-6 text-[#c9beae]" strokeWidth={1.5} />
        )}
      </div>
      <div className="p-3">
        <p className="truncate font-serif text-[14.5px] font-semibold tracking-normal text-[#2a231c]">{art.title}</p>
        <p className="mt-0.5 truncate text-[12px] text-[#8a8074]">
          {art.artist?.name ?? '작가 미상'}
          {art.year != null && ` · ${art.year}`}
        </p>
      </div>
    </button>
  );
}

function ArtworkListRow({ art, onClick }: { art: Artwork; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-black/[0.07] bg-surface p-2.5 text-left shadow-sm shadow-black/[0.03] transition hover:shadow-lg hover:shadow-black/[0.08] active:scale-[0.97]"
    >
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/[0.03]">
        {art.image_url ? (
          <RemoteThumbnail src={art.image_url} alt="" sizes="56px" className="object-cover" />
        ) : (
          <ImageOff className="h-4 w-4 text-[#c9beae]" strokeWidth={1.5} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[14.5px] font-semibold tracking-normal text-[#2a231c]">{art.title}</p>
        <p className="mt-0.5 truncate text-[12px] text-[#8a8074]">
          {art.artist?.name ?? '작가 미상'}
          {art.year != null && ` · ${art.year}`}
        </p>
      </div>
    </button>
  );
}

function ArtworkCollection({ artworks, viewMode, onSelect }: { artworks: Artwork[]; viewMode: ViewMode; onSelect: (id: string) => void }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {artworks.map((art) => (
          <ArtworkGridCard key={art.id} art={art} onClick={() => onSelect(art.id)} />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {artworks.map((art) => (
        <ArtworkListRow key={art.id} art={art} onClick={() => onSelect(art.id)} />
      ))}
    </div>
  );
}

export function ArtworksView() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailArtworkId, setDetailArtworkId] = useState<string | null>(null);
  const [editState, setEditState] = useState<{ artworkId?: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);
  const [groupBy, setGroupBy] = useState<GroupKey | null>(null);

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

  const activeGroupOption = GROUP_OPTIONS.find((option) => option.key === groupBy) ?? null;

  const groupedSections: GroupSection[] | null = useMemo(() => {
    if (!activeGroupOption) return null;

    const map = new Map<string, Artwork[]>();
    for (const art of artworks) {
      const key = activeGroupOption.getKey(art) || activeGroupOption.unknownLabel;
      const list = map.get(key);
      if (list) list.push(art);
      else map.set(key, [art]);
    }

    const sortArtworks = (list: Artwork[]) => [...list].sort((a, b) => a.title.localeCompare(b.title, 'ko'));

    const sections = Array.from(map.entries())
      .filter(([key]) => key !== activeGroupOption.unknownLabel)
      .sort(([a], [b]) => a.localeCompare(b, 'ko'))
      .map(([key, list]) => ({ key, label: key, artworks: sortArtworks(list) }));

    const unknown = map.get(activeGroupOption.unknownLabel);
    if (unknown) {
      sections.push({ key: activeGroupOption.unknownLabel, label: activeGroupOption.unknownLabel, artworks: sortArtworks(unknown) });
    }

    return sections;
  }, [artworks, activeGroupOption]);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a39a8d]" strokeWidth={2.25} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="작품 이름, 소장처 검색"
            className="w-full rounded-xl border border-black/[0.08] bg-surface py-2.5 pl-10 pr-3.5 text-sm text-[#2a231c] placeholder:text-[#a39a8d] outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-black/[0.08] bg-surface p-1">
          <button
            onClick={() => handleSetViewMode('grid')}
            aria-label="카드형 보기"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition active:scale-[0.94] ${
              viewMode === 'grid' ? 'bg-black/[0.06] text-[#2a231c]' : 'text-[#a39a8d] hover:text-[#4a4038]'
            }`}
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={2.25} />
          </button>
          <button
            onClick={() => handleSetViewMode('list')}
            aria-label="목록형 보기"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition active:scale-[0.94] ${
              viewMode === 'list' ? 'bg-black/[0.06] text-[#2a231c]' : 'text-[#a39a8d] hover:text-[#4a4038]'
            }`}
          >
            <List className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-black/[0.08] bg-surface p-1">
          {GROUP_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = groupBy === option.key;
            return (
              <button
                key={option.key}
                onClick={() => setGroupBy(active ? null : option.key)}
                aria-label={`${option.label}로 구분해 보기`}
                aria-pressed={active}
                title={`${option.label}로 구분해 보기`}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium transition active:scale-[0.94] ${
                  active ? 'bg-black/[0.06] text-[#2a231c]' : 'text-[#a39a8d] hover:text-[#4a4038]'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setEditState({})}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/25 transition hover:opacity-90 active:scale-[0.97]"
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
      ) : groupedSections ? (
        <div className="space-y-8">
          {groupedSections.map((section) => (
            <section key={section.key}>
              <h2 className="mb-3 flex items-baseline gap-2 border-b border-black/[0.06] pb-2">
                <span className="font-serif text-[16px] font-semibold tracking-normal text-[#2a231c]">{section.label}</span>
                <span className="text-[12px] text-[#8a8074]">{section.artworks.length}점</span>
              </h2>
              <ArtworkCollection artworks={section.artworks} viewMode={viewMode} onSelect={setDetailArtworkId} />
            </section>
          ))}
        </div>
      ) : (
        <ArtworkCollection artworks={pagedArtworks} viewMode={viewMode} onSelect={setDetailArtworkId} />
      )}

      {!groupedSections && <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />}

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
