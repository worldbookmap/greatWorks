'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';

const MAX_PHOTO_EDGE = 2048;

// 휴대폰 사진은 용량이 크고(HEIC 등) 업로드 제한(10MB)을 넘기 쉬워서,
// 브라우저에서 긴 변 2048px JPEG로 줄여서 올립니다. 디코딩에 실패하면 원본을 그대로 씁니다.
async function shrinkImage(file: File): Promise<File> {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    URL.revokeObjectURL(url);

    const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return file;
    return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

async function uploadPhoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', await shrinkImage(file));
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? '사진 업로드에 실패했습니다.');
  return body.url;
}

const pickerButtonClass =
  'flex items-center justify-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-sm font-medium text-[#4a4038] transition hover:bg-black/[0.03] disabled:opacity-40 active:scale-[0.97]';

interface PhotoPickerProps {
  photoUrls: string[];
  onChange: (update: (prev: string[]) => string[]) => void;
  onUploadingChange: (uploading: boolean) => void;
  onError: (message: string | null) => void;
  max?: number;
  // true면 첫 번째 사진에 "대표" 표시를 붙입니다.
  markCover?: boolean;
}

export function PhotoPicker({ photoUrls, onChange, onUploadingChange, onError, max, markCover }: PhotoPickerProps) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);

  const remaining = max == null ? Infinity : max - photoUrls.length - uploadingCount;
  const full = remaining <= 0;

  useEffect(() => {
    onUploadingChange(uploadingCount > 0);
  }, [uploadingCount, onUploadingChange]);

  const changeUploading = (delta: number) => setUploadingCount((c) => c + delta);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    let files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    onError(null);
    if (files.length > remaining) {
      files = files.slice(0, Math.max(0, remaining));
      onError(`사진은 최대 ${max}장까지 올릴 수 있어 앞의 ${files.length}장만 추가합니다.`);
    }
    if (files.length === 0) return;

    changeUploading(files.length);
    await Promise.all(
      files.map(async (file) => {
        try {
          const url = await uploadPhoto(file);
          onChange((prev) => [...prev, url]);
        } catch (err) {
          onError((err as Error).message);
        } finally {
          changeUploading(-1);
        }
      }),
    );
  }

  function moveToFront(url: string) {
    onChange((prev) => [url, ...prev.filter((u) => u !== url)]);
  }

  return (
    <div>
      {/* capture 속성이 있으면 휴대폰에서 바로 카메라가 열립니다. 데스크톱에서는 파일 선택으로 동작합니다. */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFiles} className="hidden" />
      <input ref={albumInputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={full} onClick={() => cameraInputRef.current?.click()} className={pickerButtonClass}>
          <Camera className="h-4 w-4" strokeWidth={2.25} />
          카메라로 찍기
        </button>
        <button type="button" disabled={full} onClick={() => albumInputRef.current?.click()} className={pickerButtonClass}>
          <ImagePlus className="h-4 w-4" strokeWidth={2.25} />
          사진첩에서 선택
        </button>
      </div>
      {max != null && (
        <p className="mt-1.5 text-[12px] text-[#8a8074]">
          {photoUrls.length + uploadingCount} / {max}장{markCover && photoUrls.length > 1 && ' · 사진을 누르면 대표 사진으로 지정됩니다'}
        </p>
      )}

      {(photoUrls.length > 0 || uploadingCount > 0) && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photoUrls.map((url, i) => (
            <div key={url} className="relative aspect-square">
              <button
                type="button"
                onClick={() => markCover && moveToFront(url)}
                className={`h-full w-full overflow-hidden rounded-lg ring-1 ring-black/[0.08] ${markCover ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
              {markCover && i === 0 && (
                <span className="pointer-events-none absolute bottom-1 left-1 rounded-full bg-accent-strong px-1.5 py-0.5 text-[10.5px] font-semibold text-white">
                  대표
                </span>
              )}
              <button
                type="button"
                onClick={() => onChange((prev) => prev.filter((u) => u !== url))}
                aria-label="사진 빼기"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/75 active:scale-[0.97]"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          ))}
          {Array.from({ length: uploadingCount }).map((_, i) => (
            <div key={`uploading-${i}`} className="flex aspect-square items-center justify-center rounded-lg bg-black/[0.04] ring-1 ring-black/[0.08]">
              <Loader2 className="h-5 w-5 animate-spin text-[#8a8074]" strokeWidth={2.25} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
