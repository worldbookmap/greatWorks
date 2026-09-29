'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export function PhotoLightbox({ urls, index, onClose }: { urls: string[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index);
  const hasMany = urls.length > 1;
  const go = (delta: number) => setCurrent((c) => (c + delta + urls.length) % urls.length);

  // 모달 패널의 transform 안에서는 fixed가 화면 기준이 아니게 되므로 body에 띄웁니다.
  return createPortal(
    <div
      className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/85 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={urls[current]}
        alt=""
        className="max-h-full max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+1rem)] flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
      >
        <X className="h-5 w-5" strokeWidth={2.25} />
      </button>
      {hasMany && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="이전 사진"
            className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="다음 사진"
            className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <p className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] rounded-full bg-black/50 px-3 py-1 text-xs text-white">
            {current + 1} / {urls.length}
          </p>
        </>
      )}
    </div>,
    document.body,
  );
}
