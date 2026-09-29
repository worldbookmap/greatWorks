'use client';

import { useState } from 'react';
import { Calendar, Camera, Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import type { ArtworkViewing } from '@/lib/types';
import { formatKoreanDate, todayString } from '@/lib/date';
import { PhotoLightbox } from '@/components/ui/PhotoLightbox';
import { PhotoPicker } from '@/components/ui/PhotoPicker';

const inputClass =
  'w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-3.5 py-2.5 text-sm text-[#2a231c] placeholder:text-[#a39a8d] outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20';
const labelClass = 'mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-[#4a4038]';
const secondaryButtonClass =
  'flex items-center justify-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-sm font-medium text-[#4a4038] transition hover:bg-black/[0.03] disabled:opacity-40 active:scale-[0.97]';

interface ViewingFormProps {
  artworkId: string;
  initial: ArtworkViewing | null;
  defaultPlace: string;
  onSaved: (viewing: ArtworkViewing) => void;
  onCancel: () => void;
}

function ViewingForm({ artworkId, initial, defaultPlace, onSaved, onCancel }: ViewingFormProps) {
  const [viewedOn, setViewedOn] = useState(initial ? initial.viewed_on ?? '' : todayString());
  const [place, setPlace] = useState(initial ? initial.place : defaultPlace);
  const [review, setReview] = useState(initial?.review ?? '');
  const [photoUrls, setPhotoUrls] = useState<string[]>(initial?.photo_urls ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!review.trim() && photoUrls.length === 0) {
      setError('사진이나 감상평 중 하나는 남겨주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { viewed_on: viewedOn || null, place, review, photo_urls: photoUrls };
      const res = await fetch(initial ? `/api/viewings/${initial.id}` : `/api/artworks/${artworkId}/viewings`, {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? '저장에 실패했습니다.');
      onSaved(body);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-black/[0.08] bg-black/[0.015] p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="sm:w-44">
          <label className={labelClass}>
            <Calendar className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
            관람일
          </label>
          <input type="date" value={viewedOn} onChange={(e) => setViewedOn(e.target.value)} className={inputClass} />
        </div>
        <div className="flex-1">
          <label className={labelClass}>
            <MapPin className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
            관람 장소
          </label>
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            className={inputClass}
            placeholder="예: 루브르 박물관, 특별전 이름"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>
          <Camera className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
          작품 사진
        </label>
        <PhotoPicker photoUrls={photoUrls} onChange={setPhotoUrls} onUploadingChange={setUploading} onError={setError} />
      </div>

      <div>
        <label className={labelClass}>
          <Pencil className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
          감상평
        </label>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={5}
          className={`${inputClass} resize-y leading-relaxed`}
          placeholder="실제로 마주한 작품은 어땠나요? 색감, 크기, 붓질, 그날의 느낌 등을 적어보세요."
        />
      </div>

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploading}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/25 transition hover:opacity-90 disabled:opacity-50 active:scale-[0.97]"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} />}
          저장
        </button>
      </div>
    </div>
  );
}

interface ArtworkViewingsProps {
  artworkId: string;
  defaultPlace: string;
  viewings: ArtworkViewing[];
  onChange: (viewings: ArtworkViewing[]) => void;
}

export function ArtworkViewings({ artworkId, defaultPlace, viewings, onChange }: ArtworkViewingsProps) {
  // null: 폼 닫힘, 'new': 새 기록 작성, 그 외: 수정 중인 기록 id
  const [editing, setEditing] = useState<string | null>(viewings.length === 0 ? 'new' : null);
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  function sortViewings(list: ArtworkViewing[]) {
    return [...list].sort((a, b) => {
      if (a.viewed_on !== b.viewed_on) {
        if (!a.viewed_on) return 1;
        if (!b.viewed_on) return -1;
        return b.viewed_on.localeCompare(a.viewed_on);
      }
      return b.created_at.localeCompare(a.created_at);
    });
  }

  function handleSaved(saved: ArtworkViewing) {
    const exists = viewings.some((v) => v.id === saved.id);
    onChange(sortViewings(exists ? viewings.map((v) => (v.id === saved.id ? saved : v)) : [saved, ...viewings]));
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('이 감상 기록을 삭제할까요?')) return;
    const res = await fetch(`/api/viewings/${id}`, { method: 'DELETE' });
    if (res.ok) onChange(viewings.filter((v) => v.id !== id));
  }

  return (
    <div className="space-y-4">
      {editing === 'new' ? (
        <ViewingForm
          artworkId={artworkId}
          initial={null}
          defaultPlace={defaultPlace}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <button
          onClick={() => setEditing('new')}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-black/[0.15] py-3.5 text-sm font-medium text-[#6b6258] transition hover:border-accent/40 hover:bg-accent/[0.04] hover:text-accent-strong active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          감상 기록 추가
        </button>
      )}

      {viewings.length === 0 && editing !== 'new' && (
        <p className="py-6 text-center text-sm text-[#8a8074]">아직 실제로 감상한 기록이 없습니다.</p>
      )}

      {viewings.map((viewing) =>
        editing === viewing.id ? (
          <ViewingForm
            key={viewing.id}
            artworkId={artworkId}
            initial={viewing}
            defaultPlace={defaultPlace}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <article key={viewing.id} className="space-y-3 rounded-2xl border border-black/[0.06] bg-white/60 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-serif text-[14.5px] font-semibold text-[#2a231c]">{formatKoreanDate(viewing.viewed_on, '관람일 미상')}</p>
                {viewing.place && (
                  <p className="mt-0.5 flex items-center gap-1 text-[12.5px] text-[#6b6258]">
                    <MapPin className="h-3 w-3 shrink-0" strokeWidth={2.25} />
                    <span className="truncate">{viewing.place}</span>
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditing(viewing.id)}
                  aria-label="감상 기록 수정"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6258] transition hover:bg-black/[0.05] active:scale-[0.97]"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
                </button>
                <button
                  onClick={() => handleDelete(viewing.id)}
                  aria-label="감상 기록 삭제"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-red-600/80 transition hover:bg-red-500/10 active:scale-[0.97]"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                </button>
              </div>
            </div>

            {viewing.photo_urls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {viewing.photo_urls.map((url, i) => (
                  <button
                    key={url}
                    onClick={() => setLightbox({ urls: viewing.photo_urls, index: i })}
                    className="aspect-square overflow-hidden rounded-lg ring-1 ring-black/[0.08] transition hover:opacity-90"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {viewing.review && (
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#4a4038]">{viewing.review}</p>
            )}
          </article>
        ),
      )}

      {lightbox && <PhotoLightbox urls={lightbox.urls} index={lightbox.index} onClose={() => setLightbox(null)} />}
    </div>
  );
}
