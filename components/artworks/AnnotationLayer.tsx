'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Pencil, Save, Trash2, X } from 'lucide-react';
import type { Annotation } from '@/lib/types';

interface AnnotationLayerProps {
  imageUrl: string;
  annotations: Annotation[];
  onAdd?: (xPct: number, yPct: number, text: string) => Promise<void>;
  onEdit?: (id: string, text: string) => Promise<void>;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
  showMarkers?: boolean;
}

const VIEWPORT_MARGIN = 8;

// 마커 옆에 뜨는 핫스팟 정보창이 화면 밖으로 밀려나 잘리지 않도록,
// 뷰포트 기준으로 위치를 측정해 좌우로 밀어주고 필요하면 위/아래를 뒤집습니다.
// 가로 안전 영역은 브라우저 창 전체가 아니라 이미지 컨테이너(boundsRef) 기준으로
// 계산합니다. 모달 본문은 overflow-y-auto라 세로만 스크롤될 것 같지만, CSS 규칙상
// 세로 overflow를 auto로 두면 가로 overflow도 암묵적으로 auto가 되어 버려서,
// 창 너비만 기준으로 클램프하면 모달 폭보다 넓게 밀려난 팝업이 모달 안에서
// 가로 스크롤로 숨어버리는(=잘려 보이는) 문제가 있었습니다.
function ClampedPopup({
  className,
  boundsRef,
  children,
}: {
  className: string;
  boundsRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // 기본값부터 가운데 정렬(-50%)을 적용해야, 아래 effect가 최종 위치를 기준으로
  // 화면 밖으로 넘어가는지 정확히 측정할 수 있습니다. (미적용 상태로 측정하면
  // 마커 바로 오른쪽에 붙은 좁은 위치를 기준으로 재게 되어 클램핑이 어긋납니다.)
  const [style, setStyle] = useState<React.CSSProperties>({ transform: 'translateX(-50%)' });

  useLayoutEffect(() => {
    const el = ref.current;
    const bounds = boundsRef.current?.getBoundingClientRect();
    if (!el) return;
    const rect = el.getBoundingClientRect();

    const minX = Math.max(VIEWPORT_MARGIN, bounds ? bounds.left : VIEWPORT_MARGIN);
    const maxX = Math.min(window.innerWidth - VIEWPORT_MARGIN, bounds ? bounds.right : window.innerWidth - VIEWPORT_MARGIN);

    let shiftX = 0;
    if (rect.right > maxX) {
      shiftX -= rect.right - maxX;
    }
    if (rect.left + shiftX < minX) {
      shiftX += minX - (rect.left + shiftX);
    }

    const overflowsBottom = rect.bottom > window.innerHeight - VIEWPORT_MARGIN;
    const overflowsTop = rect.top < VIEWPORT_MARGIN;

    setStyle({
      transform: `translateX(calc(-50% + ${shiftX}px))`,
      ...(overflowsBottom && !overflowsTop ? { top: 'auto', bottom: '2rem' } : {}),
    });
  }, [boundsRef]);

  return (
    <div ref={ref} style={style} className={className}>
      {children}
    </div>
  );
}

export function AnnotationLayer({
  imageUrl,
  annotations,
  onAdd,
  onEdit,
  onDelete,
  readOnly = false,
  showMarkers = true,
}: AnnotationLayerProps) {
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingText, setPendingText] = useState('');
  const [saving, setSaving] = useState(false);
  // 여러 핫스팟 설명을 동시에 열어둘 수 있도록 단일 id 대신 집합으로 관리합니다.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function closeOne(id: string) {
    setOpenIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setEditingId((cur) => (cur === id ? null : cur));
  }

  function closeAll() {
    setOpenIds(new Set());
    setEditingId(null);
  }

  function startEdit(a: Annotation) {
    setEditingId(a.id);
    setEditText(a.text);
  }

  async function handleSaveEdit(id: string) {
    if (!onEdit || !editText.trim()) return;
    setSavingEdit(true);
    try {
      await onEdit(id, editText.trim());
      setEditingId(null);
    } finally {
      setSavingEdit(false);
    }
  }

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    closeAll();
    if (readOnly || !onAdd) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPos({ x, y });
    setPendingText('');
  }

  async function handleSavePending() {
    if (!pendingPos || !pendingText.trim() || !onAdd) return;
    setSaving(true);
    try {
      await onAdd(pendingPos.x, pendingPos.y, pendingText.trim());
      setPendingPos(null);
      setPendingText('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={containerRef} onClick={closeAll} className="relative rounded-xl bg-black/[0.03]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        onClick={handleImageClick}
        className={`block w-full select-none rounded-xl ${readOnly ? '' : 'cursor-crosshair'}`}
        draggable={false}
      />

      {showMarkers && annotations.map((a) => (
        <div
          key={a.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${a.x_pct}%`, top: `${a.y_pct}%` }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPendingPos(null);
              toggleOpen(a.id);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-accent text-[11px] font-bold text-white shadow-lg shadow-black/30 transition-transform hover:scale-110 active:scale-100"
          >
            {annotations.indexOf(a) + 1}
          </button>
          {openIds.has(a.id) && (
            <ClampedPopup
              boundsRef={containerRef}
              className="absolute left-1/2 top-8 z-10 w-[min(14rem,calc(100vw-2rem))] rounded-xl border border-black/[0.08] bg-surface/90 p-3 text-left shadow-2xl shadow-black/20 backdrop-blur-sm"
            >
              <div onClick={(e) => e.stopPropagation()}>
                {editingId === a.id ? (
                  <div className="space-y-2">
                    <textarea
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-lg border border-black/[0.08] bg-black/[0.02] px-2.5 py-2 text-[12.5px] text-[#2a231c] outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6b6258] transition hover:bg-black/[0.05] active:scale-[0.97]"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2.25} />
                      </button>
                      <button
                        onClick={() => handleSaveEdit(a.id)}
                        disabled={savingEdit || !editText.trim()}
                        className="flex items-center gap-1 rounded-lg bg-gradient-to-b from-accent to-accent-strong px-2.5 py-1 text-[12px] font-medium text-white transition hover:opacity-90 disabled:opacity-40 active:scale-[0.97]"
                      >
                        <Save className="h-3 w-3" strokeWidth={2.5} />
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#2a231c]">{a.text}</p>
                    {!readOnly && (onEdit || onDelete) && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        {onEdit && (
                          <button
                            onClick={() => startEdit(a)}
                            className="flex h-5 w-5 items-center justify-center rounded-md text-[#8a8074] transition hover:bg-black/[0.06] hover:text-[#2a231c] active:scale-[0.97]"
                          >
                            <Pencil className="h-3 w-3" strokeWidth={2.25} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => {
                              onDelete(a.id);
                              closeOne(a.id);
                            }}
                            className="flex h-5 w-5 items-center justify-center rounded-md text-red-500/70 transition hover:bg-red-500/10 hover:text-red-500 active:scale-[0.97]"
                          >
                            <Trash2 className="h-3 w-3" strokeWidth={2.25} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ClampedPopup>
          )}
        </div>
      ))}

      {pendingPos && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${pendingPos.x}%`, top: `${pendingPos.y}%` }}
        >
          <div className="h-6 w-6 rounded-full border-2 border-white bg-teal shadow-lg shadow-black/30" />
          <ClampedPopup
            key={`${pendingPos.x}-${pendingPos.y}`}
            boundsRef={containerRef}
            className="absolute left-1/2 top-8 z-10 w-[min(15rem,calc(100vw-2rem))] space-y-2 rounded-xl border border-black/[0.08] bg-surface p-3 shadow-2xl shadow-black/20"
          >
            <div onClick={(e) => e.stopPropagation()} className="space-y-2">
              <textarea
                autoFocus
                value={pendingText}
                onChange={(e) => setPendingText(e.target.value)}
                placeholder="이 위치에 대한 설명"
                rows={3}
                className="w-full resize-none rounded-lg border border-black/[0.08] bg-black/[0.02] px-2.5 py-2 text-[12.5px] text-[#2a231c] placeholder:text-[#a39a8d] outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setPendingPos(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6b6258] transition hover:bg-black/[0.05] active:scale-[0.97]"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.25} />
                </button>
                <button
                  onClick={handleSavePending}
                  disabled={saving || !pendingText.trim()}
                  className="flex items-center gap-1 rounded-lg bg-gradient-to-b from-accent to-accent-strong px-2.5 py-1 text-[12px] font-medium text-white transition hover:opacity-90 disabled:opacity-40 active:scale-[0.97]"
                >
                  <Save className="h-3 w-3" strokeWidth={2.5} />
                  저장
                </button>
              </div>
            </div>
          </ClampedPopup>
        </div>
      )}
    </div>
  );
}
