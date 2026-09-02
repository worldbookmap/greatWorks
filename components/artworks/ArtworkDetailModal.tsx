'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, ImageOff, Palette, Pencil, Trash2, X } from 'lucide-react';
import type { ArtworkDetail } from '@/lib/types';
import { AnnotationLayer } from './AnnotationLayer';

interface ArtworkDetailModalProps {
  artworkId: string;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

function formatYear(year: number | null, yearDisplay: string, lang: 'en' | 'ko') {
  if (yearDisplay) return yearDisplay;
  if (year == null) return '';
  if (lang === 'en') return year < 0 ? `${-year} BCE` : `${year}`;
  return year < 0 ? `기원전 ${-year}년` : `${year}년`;
}

function buildLine(parts: (string | undefined | null)[]) {
  return parts.filter((p): p is string => !!p && p.trim().length > 0).join(', ');
}

export function ArtworkDetailModal({ artworkId, onClose, onEdit, onDeleted }: ArtworkDetailModalProps) {
  const [artwork, setArtwork] = useState<ArtworkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);

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

  // 영문 표기 데이터가 실제로 하나라도 있을 때만 영/한 두 줄로 보여줍니다.
  // 없으면(기존 데이터 등) 저장된 값 그대로 한 줄만 보여줍니다.
  const hasEnglishData = !!(
    artwork?.title_en ||
    artwork?.artist?.name_en ||
    artwork?.medium_en ||
    artwork?.collection_name_en
  );

  const enLine = artwork
    ? buildLine([
        artwork.artist?.name_en || artwork.artist?.name || 'Unknown artist',
        `<${artwork.title_en || artwork.title}>`,
        formatYear(artwork.year, artwork.year_display, 'en'),
        artwork.medium_en || artwork.medium,
        artwork.dimensions,
        artwork.collection_name_en || artwork.collection_name,
      ])
    : '';

  const koLine = artwork
    ? buildLine([
        artwork.artist?.name || '작가 미상',
        `<${artwork.title}>`,
        formatYear(artwork.year, artwork.year_display, 'ko'),
        artwork.medium,
        artwork.dimensions,
        artwork.collection_name,
      ])
    : '';

  const primaryLine = hasEnglishData ? enLine : koLine;
  const showSecondLine = hasEnglishData && koLine && koLine !== enLine;

  return (
    <div
      className="fixed inset-0 z-[3500] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-surface shadow-2xl shadow-black/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] px-4 sm:px-6 py-4">
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

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {loading || !artwork ? (
            <p className="text-sm text-[#6b6258]">불러오는 중...</p>
          ) : (
            <div className="space-y-4">
              {artwork.image_url ? (
                <div className="relative">
                  <AnnotationLayer
                    imageUrl={artwork.image_url}
                    annotations={artwork.annotations}
                    readOnly
                    showMarkers={showHotspots}
                  />
                  {artwork.annotations.length > 0 && (
                    <button
                      onClick={() => setShowHotspots((v) => !v)}
                      className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-surface/90 px-2.5 py-1.5 text-[11.5px] font-medium text-[#4a4038] shadow-md backdrop-blur-sm transition-colors hover:bg-surface"
                    >
                      {showHotspots ? (
                        <EyeOff className="h-3.5 w-3.5" strokeWidth={2.25} />
                      ) : (
                        <Eye className="h-3.5 w-3.5" strokeWidth={2.25} />
                      )}
                      핫스팟 번호 {showHotspots ? '숨기기' : '보이기'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-black/[0.03]">
                  <ImageOff className="h-6 w-6 text-[#c9beae]" strokeWidth={1.5} />
                </div>
              )}

              <div className="space-y-0.5">
                <p className="text-[14px] leading-relaxed text-[#2a231c]">{primaryLine}</p>
                {showSecondLine && <p className="text-[13px] leading-relaxed text-[#6b6258]">{koLine}</p>}
              </div>

              {artwork.description && (
                <p className="whitespace-pre-wrap rounded-xl bg-black/[0.02] p-3 text-[13px] leading-relaxed text-[#4a4038]">
                  {artwork.description}
                </p>
              )}
            </div>
          )}
        </div>

        {!loading && artwork && (
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
