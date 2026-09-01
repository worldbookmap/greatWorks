'use client';

import { useEffect, useState } from 'react';
import { ImageOff, Palette, Pencil, Trash2, User, Users, X } from 'lucide-react';
import type { Artist, ArtistRelationship, Artwork } from '@/lib/types';

interface ArtistDetail extends Artist {
  artworks: Artwork[];
  relationships: ArtistRelationship[];
}

interface ArtistDetailModalProps {
  artistId: string;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  onOpenArtwork: (artworkId: string) => void;
}

function lifespan(a: Artist) {
  if (a.birth_year == null && a.death_year == null) return '';
  return `${a.birth_year ?? '?'} – ${a.death_year ?? '?'}`;
}

export function ArtistDetailModal({ artistId, onClose, onEdit, onDeleted, onOpenArtwork }: ArtistDetailModalProps) {
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/artists/${artistId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setArtist)
      .finally(() => setLoading(false));
  }, [artistId]);

  async function handleDelete() {
    if (!confirm('이 작가를 삭제할까요? 연결된 관계도 함께 삭제됩니다. (작품은 남지만 작가 연결이 해제됩니다)')) return;
    const res = await fetch(`/api/artists/${artistId}`, { method: 'DELETE' });
    if (res.ok) onDeleted();
  }

  const subtitle = artist ? [artist.nationality, lifespan(artist)].filter(Boolean).join(' · ') : '';

  return (
    <div className="fixed inset-0 z-[3500] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-surface shadow-2xl shadow-black/20">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] px-4 sm:px-6 py-4">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#2a231c]">
            <User className="h-4 w-4 text-accent-strong" strokeWidth={2.25} />
            화가 정보
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#6b6258] transition-colors hover:bg-black/[0.05]"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {loading || !artist ? (
            <p className="text-sm text-[#6b6258]">불러오는 중...</p>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4">
                {artist.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artist.image_url} alt="" className="h-24 w-24 shrink-0 rounded-2xl object-cover ring-1 ring-black/[0.08]" />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-black/[0.03] ring-1 ring-black/[0.08]">
                    <ImageOff className="h-6 w-6 text-[#c9beae]" strokeWidth={1.5} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[17px] font-semibold text-[#2a231c]">{artist.name}</p>
                  {artist.name_en && artist.name_en !== artist.name && (
                    <p className="text-[13px] text-[#8a8074]">{artist.name_en}</p>
                  )}
                  {subtitle && <p className="mt-1 text-[13px] text-[#6b6258]">{subtitle}</p>}
                  {artist.movement && (
                    <span className="mt-2 inline-block rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-medium text-teal">
                      {artist.movement}
                    </span>
                  )}
                </div>
              </div>

              {artist.bio && <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#4a4038]">{artist.bio}</p>}

              {artist.relationships.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#8a8074]">
                    <Users className="h-3.5 w-3.5 text-teal" strokeWidth={2.25} />
                    관계
                  </h3>
                  <ul className="space-y-1">
                    {artist.relationships.map((rel) => {
                      const other = rel.source_artist_id === artist.id ? rel.target : rel.source;
                      const direction = rel.source_artist_id === artist.id ? '→' : '←';
                      return (
                        <li key={rel.id} className="flex items-center gap-2 text-[12.5px] text-[#2a231c]">
                          <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[11px] font-semibold text-teal">
                            {rel.relationship_type}
                          </span>
                          <span>
                            {direction} {other?.name ?? '알 수 없음'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {artist.artworks.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#8a8074]">
                    <Palette className="h-3.5 w-3.5 text-accent-strong" strokeWidth={2.25} />
                    작품 ({artist.artworks.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {artist.artworks.map((art) => (
                      <button
                        key={art.id}
                        onClick={() => onOpenArtwork(art.id)}
                        className="group overflow-hidden rounded-xl border border-black/[0.07] text-left"
                      >
                        <div className="flex aspect-square items-center justify-center overflow-hidden bg-black/[0.03]">
                          {art.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={art.image_url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                          ) : (
                            <ImageOff className="h-4 w-4 text-[#c9beae]" strokeWidth={1.5} />
                          )}
                        </div>
                        <p className="truncate px-1.5 py-1 text-[11px] font-medium text-[#2a231c]">{art.title}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!loading && artist && (
          <div className="flex shrink-0 gap-2 border-t border-black/[0.06] px-4 sm:px-6 py-4">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
              수정
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
