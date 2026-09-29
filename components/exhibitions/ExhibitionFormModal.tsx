'use client';

import { useState } from 'react';
import { Calendar, Camera, Loader2, MapPin, Pencil, Ticket, X } from 'lucide-react';
import { MAX_EXHIBITION_PHOTOS, type ExhibitionReview } from '@/lib/types';
import { todayString } from '@/lib/date';
import { PhotoPicker } from '@/components/ui/PhotoPicker';
import { useToast } from '@/components/ui/Toast';

const inputClass =
  'w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-3.5 py-2.5 text-sm text-[#2a231c] placeholder:text-[#a39a8d] outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20';
const labelClass = 'mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-[#4a4038]';

interface ExhibitionFormModalProps {
  initial: ExhibitionReview | null;
  onClose: () => void;
  onSaved: (review: ExhibitionReview) => void;
}

export function ExhibitionFormModal({ initial, onClose, onSaved }: ExhibitionFormModalProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [venue, setVenue] = useState(initial?.venue ?? '');
  const [visitedOn, setVisitedOn] = useState(initial ? initial.visited_on ?? '' : todayString());
  const [review, setReview] = useState(initial?.review ?? '');
  const [photoUrls, setPhotoUrls] = useState<string[]>(initial?.photo_urls ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  async function handleSave() {
    if (!title.trim()) {
      setError('전시회 타이틀을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { title, venue, visited_on: visitedOn || null, review, photo_urls: photoUrls };
      const res = await fetch(initial ? `/api/exhibitions/${initial.id}` : '/api/exhibitions', {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? '저장에 실패했습니다.');
      showToast('저장되었습니다');
      onSaved(body);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
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
            {initial ? '전시회 후기 수정' : '전시회 후기 추가'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#6b6258] transition hover:bg-black/[0.05] active:scale-[0.97]"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 sm:px-6 py-5">
          <div>
            <label className={labelClass}>
              <Ticket className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
              전시회 타이틀
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="예: 인상파, 빛을 그리다"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label className={labelClass}>
                <MapPin className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
                장소
              </label>
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className={inputClass}
                placeholder="예: 국립현대미술관 서울관"
              />
            </div>
            <div className="sm:w-44">
              <label className={labelClass}>
                <Calendar className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
                일자
              </label>
              <input type="date" value={visitedOn} onChange={(e) => setVisitedOn(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              <Camera className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
              주요 사진
            </label>
            <PhotoPicker
              photoUrls={photoUrls}
              onChange={setPhotoUrls}
              onUploadingChange={setUploading}
              onError={setError}
              max={MAX_EXHIBITION_PHOTOS}
              markCover
            />
          </div>

          <div>
            <label className={labelClass}>
              <Pencil className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
              감상
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={7}
              className={`${inputClass} resize-y leading-relaxed`}
              placeholder="전시의 구성, 인상 깊었던 작품, 함께 간 사람, 그날의 느낌 등을 적어보세요."
            />
          </div>

          {error && <p className="text-[13px] text-red-600">{error}</p>}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-black/[0.06] px-4 sm:px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-black/[0.08] bg-white px-4 py-2 text-sm font-medium text-[#4a4038] transition hover:bg-black/[0.03] active:scale-[0.97]"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent/25 transition hover:opacity-90 disabled:opacity-50 active:scale-[0.97]"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} />}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
