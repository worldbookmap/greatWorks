'use client';

import { useState } from 'react';
import { Calendar, MapPin, Pencil, Ticket, Trash2, X } from 'lucide-react';
import type { ExhibitionReview } from '@/lib/types';
import { formatKoreanDate } from '@/lib/date';
import { PhotoLightbox } from '@/components/ui/PhotoLightbox';

interface ExhibitionDetailModalProps {
  exhibition: ExhibitionReview;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

export function ExhibitionDetailModal({ exhibition, onClose, onEdit, onDeleted }: ExhibitionDetailModalProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [cover, ...rest] = exhibition.photo_urls;

  async function handleDelete() {
    if (!confirm('이 전시회 후기를 삭제할까요?')) return;
    const res = await fetch(`/api/exhibitions/${exhibition.id}`, { method: 'DELETE' });
    if (res.ok) onDeleted();
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[3500] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="modal-panel flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-surface shadow-2xl shadow-black/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] px-4 sm:px-6 py-4">
          <h2 className="flex items-center gap-2 font-serif text-[16px] font-semibold tracking-normal text-[#2a231c]">
            <Ticket className="h-4 w-4 text-accent-strong" strokeWidth={2.25} />
            전시회 후기
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#6b6258] transition hover:bg-black/[0.05] active:scale-[0.97]"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 sm:px-6 py-5">
          {cover && (
            <button
              onClick={() => setLightboxIndex(0)}
              className="block w-full overflow-hidden rounded-xl bg-black/[0.03] ring-1 ring-black/[0.06]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="max-h-[60vh] w-full object-contain" />
            </button>
          )}
          {rest.length > 0 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {rest.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setLightboxIndex(i + 1)}
                  className="aspect-square overflow-hidden rounded-lg ring-1 ring-black/[0.08] transition hover:opacity-90"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <p className="font-serif text-[18px] font-semibold leading-snug tracking-normal text-[#2a231c]">{exhibition.title}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#6b6258]">
              {exhibition.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2.25} />
                  {exhibition.venue}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" strokeWidth={2.25} />
                {formatKoreanDate(exhibition.visited_on, '관람일 미상')}
              </span>
            </div>
          </div>

          {exhibition.review && (
            <p className="whitespace-pre-wrap rounded-xl bg-black/[0.02] p-3 text-[13.5px] leading-relaxed text-[#4a4038]">
              {exhibition.review}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-black/[0.06] px-4 sm:px-6 py-4">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent/25 transition hover:opacity-90 active:scale-[0.97]"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
            수정
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-500/10 active:scale-[0.97]"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
            삭제
          </button>
        </div>
      </div>

      {lightboxIndex != null && (
        <PhotoLightbox urls={exhibition.photo_urls} index={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}
