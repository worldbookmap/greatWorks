'use client';

import { useEffect, useState } from 'react';
import { Trash2, UserRound, Users, X } from 'lucide-react';
import type { PersonDetail } from '@/lib/types';

interface PersonDetailModalProps {
  personId: string;
  onClose: () => void;
  onDeleted: () => void;
  onOpenArtist: (artistId: string) => void;
}

export function PersonDetailModal({ personId, onClose, onDeleted, onOpenArtist }: PersonDetailModalProps) {
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/people/${personId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setPerson)
      .finally(() => setLoading(false));
  }, [personId]);

  async function handleDelete() {
    if (!confirm('이 인물을 삭제할까요? 연결된 관계도 함께 삭제됩니다.')) return;
    const res = await fetch(`/api/people/${personId}`, { method: 'DELETE' });
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
            <UserRound className="h-4 w-4 text-gold" strokeWidth={2.25} />
            인물 정보
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#6b6258] transition hover:bg-black/[0.05] active:scale-[0.97]"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {loading || !person ? (
            <p className="text-sm text-[#6b6258]">불러오는 중...</p>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4">
                {person.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={person.image_url} alt="" className="h-24 w-24 shrink-0 rounded-2xl object-cover ring-1 ring-black/[0.08]" />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-black/[0.03] ring-1 ring-black/[0.08]">
                    <UserRound className="h-6 w-6 text-[#c9beae]" strokeWidth={1.5} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-serif text-[19px] font-semibold tracking-normal text-[#2a231c]">{person.name}</p>
                  {person.name_en && person.name_en !== person.name && (
                    <p className="text-[13px] text-[#8a8074]">{person.name_en}</p>
                  )}
                  {person.role && (
                    <span className="mt-2 inline-block rounded-full bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold">
                      {person.role}
                    </span>
                  )}
                </div>
              </div>

              {person.relationships.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#8a8074]">
                    <Users className="h-3.5 w-3.5 text-teal" strokeWidth={2.25} />
                    관계
                  </h3>
                  <ul className="space-y-1">
                    {person.relationships.map((rel) => (
                      <li key={rel.id} className="flex items-center gap-2 text-[12.5px] text-[#2a231c]">
                        <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[11px] font-semibold text-teal">
                          {rel.relationship_type}
                        </span>
                        <span>
                          ←{' '}
                          {rel.source ? (
                            <button onClick={() => onOpenArtist(rel.source!.id)} className="font-medium hover:underline">
                              {rel.source.name}
                            </button>
                          ) : (
                            '알 수 없음'
                          )}
                          {rel.description && <span className="text-[#8a8074]"> · {rel.description}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {!loading && person && (
          <div className="flex shrink-0 gap-2 border-t border-black/[0.06] px-4 sm:px-6 py-4">
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-500/10 active:scale-[0.97]"
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
