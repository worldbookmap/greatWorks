'use client';

import { useCallback, useEffect, useState } from 'react';
import { Calendar, ImageOff, MapPin, Plus, Ticket } from 'lucide-react';
import type { ExhibitionReview } from '@/lib/types';
import { formatKoreanDate } from '@/lib/date';
import { RemoteThumbnail } from '@/components/ui/RemoteThumbnail';
import { ExhibitionDetailModal } from './ExhibitionDetailModal';
import { ExhibitionFormModal } from './ExhibitionFormModal';

function ExhibitionCard({ exhibition, onClick }: { exhibition: ExhibitionReview; onClick: () => void }) {
  const cover = exhibition.photo_urls[0];
  return (
    <button
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.07] bg-surface text-left shadow-sm shadow-black/[0.03] transition hover:shadow-lg hover:shadow-black/[0.08] active:scale-[0.97]"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-black/[0.03]">
        {cover ? (
          <RemoteThumbnail
            src={cover}
            alt=""
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <ImageOff className="h-6 w-6 text-[#c9beae]" strokeWidth={1.5} />
        )}
        {exhibition.photo_urls.length > 1 && (
          <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
            {exhibition.photo_urls.length}장
          </span>
        )}
      </div>
      <div className="space-y-1 p-3.5">
        <p className="line-clamp-2 font-serif text-[15px] font-semibold leading-snug tracking-normal text-[#2a231c]">
          {exhibition.title}
        </p>
        <div className="space-y-0.5 text-[12px] text-[#8a8074]">
          {exhibition.venue && (
            <p className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" strokeWidth={2.25} />
              <span className="truncate">{exhibition.venue}</span>
            </p>
          )}
          <p className="flex items-center gap-1">
            <Calendar className="h-3 w-3 shrink-0" strokeWidth={2.25} />
            {formatKoreanDate(exhibition.visited_on, '관람일 미상')}
          </p>
        </div>
        {exhibition.review && <p className="line-clamp-2 pt-1 text-[12.5px] leading-relaxed text-[#6b6258]">{exhibition.review}</p>}
      </div>
    </button>
  );
}

export function ExhibitionsView() {
  const [exhibitions, setExhibitions] = useState<ExhibitionReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  // null: 폼 닫힘, { exhibition: null }: 새로 작성, 그 외: 수정
  const [formState, setFormState] = useState<{ exhibition: ExhibitionReview | null } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/exhibitions');
    const body = await res.json().catch(() => null);
    if (res.ok) {
      setExhibitions(body);
      setLoadError(null);
    } else {
      setLoadError(body?.error ?? '전시회 후기를 불러오지 못했습니다.');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const detail = exhibitions.find((e) => e.id === detailId) ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between gap-2">
        <h1 className="flex items-baseline gap-2">
          <span className="font-serif text-[20px] font-semibold tracking-normal text-[#2a231c]">전시회 후기</span>
          {!loading && exhibitions.length > 0 && <span className="text-[13px] text-[#8a8074]">{exhibitions.length}건</span>}
        </h1>
        <button
          onClick={() => setFormState({ exhibition: null })}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/25 transition hover:opacity-90 active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          후기 추가
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[#8a8074]">불러오는 중...</p>
      ) : loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : exhibitions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-black/[0.1] py-20 text-center">
          <Ticket className="h-8 w-8 text-[#c9beae]" strokeWidth={1.5} />
          <p className="text-sm text-[#8a8074]">아직 작성한 전시회 후기가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exhibitions.map((exhibition) => (
            <ExhibitionCard key={exhibition.id} exhibition={exhibition} onClick={() => setDetailId(exhibition.id)} />
          ))}
        </div>
      )}

      {detail && (
        <ExhibitionDetailModal
          exhibition={detail}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setFormState({ exhibition: detail });
            setDetailId(null);
          }}
          onDeleted={() => {
            setDetailId(null);
            load();
          }}
        />
      )}

      {formState && (
        <ExhibitionFormModal
          initial={formState.exhibition}
          onClose={() => setFormState(null)}
          onSaved={(saved) => {
            setExhibitions((prev) =>
              prev.some((e) => e.id === saved.id) ? prev.map((e) => (e.id === saved.id ? saved : e)) : [saved, ...prev],
            );
            setFormState(null);
            setDetailId(saved.id);
            load();
          }}
        />
      )}
    </div>
  );
}
