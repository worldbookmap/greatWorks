'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="이전 페이지"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-surface text-[#4a4038] transition-colors hover:bg-black/[0.03] disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
      </button>
      <span className="text-[13px] text-[#6b6258]">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="다음 페이지"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-surface text-[#4a4038] transition-colors hover:bg-black/[0.03] disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </div>
  );
}
