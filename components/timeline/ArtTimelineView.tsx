'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, ImageOff } from 'lucide-react';
import type { Artwork } from '@/lib/types';
import { ArtworkDetailModal } from '@/components/artworks/ArtworkDetailModal';
import { ArtworkModal } from '@/components/artworks/ArtworkModal';

interface EraGroup {
  key: string;
  label: string;
  artworks: Artwork[];
}

const UNKNOWN_KEY = 'unknown';

function decadeLabel(decade: number) {
  if (decade < 0) return `기원전 ${-decade}년대`;
  return `${decade}년대`;
}

function yearLabel(art: Artwork) {
  if (art.year_display) return art.year_display;
  if (art.year == null) return '';
  return art.year < 0 ? `기원전 ${-art.year}년` : `${art.year}년`;
}

export function ArtTimelineView() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailArtworkId, setDetailArtworkId] = useState<string | null>(null);
  const [editArtworkId, setEditArtworkId] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/artworks');
    if (res.ok) setArtworks(await res.json());
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const groups: EraGroup[] = useMemo(() => {
    const byDecade = new Map<number, Artwork[]>();
    const unknown: Artwork[] = [];

    for (const art of artworks) {
      if (art.year == null) {
        unknown.push(art);
        continue;
      }
      const decade = Math.floor(art.year / 10) * 10;
      const list = byDecade.get(decade);
      if (list) list.push(art);
      else byDecade.set(decade, [art]);
    }

    const sortWithinDecade = (list: Artwork[]) =>
      [...list].sort((a, b) => (a.year ?? 0) - (b.year ?? 0) || a.title.localeCompare(b.title, 'ko'));

    const decadeGroups: EraGroup[] = Array.from(byDecade.entries())
      .sort(([a], [b]) => a - b)
      .map(([decade, list]) => ({
        key: String(decade),
        label: decadeLabel(decade),
        artworks: sortWithinDecade(list),
      }));

    if (unknown.length > 0) {
      decadeGroups.push({
        key: UNKNOWN_KEY,
        label: '연도 미상',
        artworks: [...unknown].sort((a, b) => a.title.localeCompare(b.title, 'ko')),
      });
    }

    return decadeGroups;
  }, [artworks]);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center gap-2">
        <CalendarRange className="h-5 w-5 text-accent-strong" strokeWidth={2.25} />
        <h1 className="text-[17px] font-semibold text-[#2a231c]">작품 연대</h1>
        <p className="text-[12.5px] text-[#8a8074]">같은 연대에 만들어진 작품을 모아 비교해보세요</p>
      </div>

      {!loading && artworks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-black/[0.1] py-20 text-center">
          <CalendarRange className="h-8 w-8 text-[#c9beae]" strokeWidth={1.5} />
          <p className="text-sm text-[#8a8074]">등록된 작품이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key}>
              <h2 className="mb-3 flex items-baseline gap-2 border-b border-black/[0.06] pb-2">
                <span className="text-[15px] font-semibold text-[#2a231c]">{group.label}</span>
                <span className="text-[12px] text-[#8a8074]">{group.artworks.length}점</span>
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {group.artworks.map((art) => (
                  <button
                    key={art.id}
                    onClick={() => setDetailArtworkId(art.id)}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.07] bg-surface text-left shadow-sm shadow-black/[0.03] transition-shadow hover:shadow-lg hover:shadow-black/[0.08]"
                  >
                    <div className="flex aspect-square items-center justify-center overflow-hidden bg-black/[0.03]">
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
                    <div className="p-2.5">
                      <p className="truncate text-[12.5px] font-semibold text-[#2a231c]">{art.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-[#8a8074]">{art.artist?.name ?? '작가 미상'}</p>
                      {yearLabel(art) && <p className="mt-0.5 truncate text-[11px] text-accent-strong">{yearLabel(art)}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {detailArtworkId && (
        <ArtworkDetailModal
          artworkId={detailArtworkId}
          onClose={() => setDetailArtworkId(null)}
          onEdit={() => {
            setEditArtworkId(detailArtworkId);
            setDetailArtworkId(null);
          }}
          onDeleted={() => {
            load();
            setDetailArtworkId(null);
          }}
        />
      )}

      {editArtworkId && (
        <ArtworkModal
          artworkId={editArtworkId}
          onClose={() => setEditArtworkId(null)}
          onSaved={() => load()}
          onDeleted={() => {
            load();
            setEditArtworkId(null);
          }}
        />
      )}
    </div>
  );
}
