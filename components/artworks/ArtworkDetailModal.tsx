'use client';

import { useEffect, useState } from 'react';
import { ImageOff, Palette, Pencil, Trash2, X } from 'lucide-react';
import type { ArtworkDetail } from '@/lib/types';
import { AnnotationLayer } from './AnnotationLayer';

interface ArtworkDetailModalProps {
  artworkId: string;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

function formatYear(year: number | null, yearDisplay: string) {
  if (yearDisplay) return yearDisplay;
  if (year == null) return '';
  return year < 0 ? `기원전 ${-year}년` : `${year}년`;
}

export function ArtworkDetailModal({ artworkId, onClose, onEdit, onDeleted }: ArtworkDetailModalProps) {
  const [artwork, setArtwork] = useState<ArtworkDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/artworks/${artworkId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setArtwork)
      .finally(() => setLoading(false));
  }, [artworkId]);

  async function handleDelete() {
    if (!confirm('이 작품을 삭제할까요? 설명 핫스팟도 함께 삭제됩니다.')) return;
    const res = await fetch(`/api/artworks/${artworkId}`, { method: 'DELETE' });
    if (res.ok) onDeleted();
  }

  const infoLine = artwork
    ? [
        artwork.artist?.name ?? '작가 미상',
        `<${artwork.title}>`,
        formatYear(artwork.year, artwork.year_display),
        artwork.medium,
        artwork.dimensions,
        artwork.collection_name,
      ]
        .filter(Boolean)
        .join(', ')
    : '';

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-black/[0.08] bg-surface shadow-2xl shadow-black/20">
        <div className="flex items-center justify-between gap-2 border-b border-black/[0.06] px-4 sm:px-6 py-4">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#2a231c]">
            <Palette className="h-4 w-4 text-accent-strong" strokeWidth={2.25} />
            작품 정보
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#6b6258] transition-colors hover:bg-black/[0.05]"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5">
          {loading || !artwork ? (
            <p className="text-sm text-[#6b6258]">불러오는 중...</p>
          ) : (
            <div className="space-y-4">
              {artwork.image_url ? (
                <AnnotationLayer imageUrl={artwork.image_url} annotations={artwork.annotations} readOnly />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-black/[0.03]">
                  <ImageOff className="h-6 w-6 text-[#c9beae]" strokeWidth={1.5} />
                </div>
              )}

              <p className="text-[14px] leading-relaxed text-[#2a231c]">{infoLine}</p>

              {artwork.description && (
                <p className="whitespace-pre-wrap rounded-xl bg-black/[0.02] p-3 text-[13px] leading-relaxed text-[#4a4038]">
                  {artwork.description}
                </p>
              )}

              <div className="flex gap-2 border-t border-black/[0.06] pt-4">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
