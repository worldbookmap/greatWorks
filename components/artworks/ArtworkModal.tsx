'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BookImage,
  Building2,
  CalendarClock,
  ClipboardPaste,
  Layers,
  Loader2,
  MapPinned,
  Palette,
  Ruler,
  Save,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import type { Annotation, Artist, ArtworkDetail } from '@/lib/types';
import type { WikidataArtworkDetail, WikidataSearchItem } from '@/lib/wikidata';
import type { WikipediaSearchItem, WikipediaArtworkDetail } from '@/lib/wikipedia';
import type { UnifiedArtworkSearchItem } from '@/lib/artworkSearch';
import type { AicArtworkDetail } from '@/lib/aic';
import type { MetArtworkDetail } from '@/lib/met';
import type { PlaceSearchResult } from '@/lib/geocode';
import { useToast } from '@/components/ui/Toast';
import { AnnotationLayer } from './AnnotationLayer';

const inputClass =
  'w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-3.5 py-2.5 text-sm text-[#2a231c] placeholder:text-[#a39a8d] outline-none transition-colors focus:border-accent/50 focus:ring-2 focus:ring-accent/20';
const labelClass = 'mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-[#4a4038]';

const SOURCE_LABEL: Record<'wikidata' | 'aic' | 'met', string> = {
  wikidata: 'Wikidata',
  aic: '시카고',
  met: 'Met',
};
const SOURCE_BADGE: Record<'wikidata' | 'aic' | 'met', string> = {
  wikidata: 'bg-teal/15 text-teal',
  aic: 'bg-accent/15 text-accent-strong',
  met: 'bg-gold/15 text-gold',
};

interface QuickArtworkEntry {
  title?: string;
  artistName?: string;
  year?: number | null;
  yearDisplay?: string;
  medium?: string;
  dimensions?: string;
  collectionName?: string;
}

// "작가명, <작품명>, 제작연도. 재료, 크기. 소장처" 형식의 한 줄 입력을 각 항목으로 분리합니다.
function parseQuickArtworkEntry(input: string): QuickArtworkEntry | null {
  const text = input.trim();
  if (!text) return null;

  // 소수점이 있는 크기 표기(예: 73.7 cm)를 문장 구분자로 잘못 나누지 않도록,
  // 마침표 뒤에 공백이나 문자열 끝이 오는 경우만 구분자로 취급합니다.
  const [firstSeg, secondSeg, ...restSegs] = text
    .split(/\.(?=\s|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
  const result: QuickArtworkEntry = {};

  if (firstSeg) {
    const parts = firstSeg
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const titleIdx = parts.findIndex((p) => /^<.+>$/.test(p));

    if (titleIdx >= 0) {
      result.title = parts[titleIdx].slice(1, -1).trim();
      const before = parts.slice(0, titleIdx).join(', ').trim();
      const after = parts.slice(titleIdx + 1).join(', ').trim();
      if (before) result.artistName = before;
      if (after) {
        const yearMatch = after.match(/-?\d+/);
        result.year = yearMatch ? Number(yearMatch[0]) : null;
        result.yearDisplay = after;
      }
    } else if (parts.length > 0) {
      // <작품명> 표기가 없으면 "작가명, 작품명, 연도" 순서로 추정합니다.
      if (parts[0]) result.artistName = parts[0];
      if (parts[1]) result.title = parts[1];
      if (parts[2]) {
        const yearMatch = parts[2].match(/-?\d+/);
        result.year = yearMatch ? Number(yearMatch[0]) : null;
        result.yearDisplay = parts[2];
      }
    }
  }

  if (secondSeg) {
    const parts = secondSeg
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts[0]) result.medium = parts[0];
    if (parts.length > 1) result.dimensions = parts.slice(1).join(', ');
  }

  if (restSegs.length > 0) {
    result.collectionName = restSegs.join('. ').trim();
  }

  return result;
}

interface ArtworkModalProps {
  artworkId?: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function ArtworkModal({ artworkId, onClose, onSaved, onDeleted }: ArtworkModalProps) {
  const { showToast } = useToast();
  const [id, setId] = useState<string | undefined>(artworkId);
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [artistId, setArtistId] = useState('');
  const [year, setYear] = useState('');
  const [yearDisplay, setYearDisplay] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [collectionNameEn, setCollectionNameEn] = useState('');
  const [collectionCountry, setCollectionCountry] = useState('');
  const [collectionCity, setCollectionCity] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [medium, setMedium] = useState('');
  const [mediumEn, setMediumEn] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [wikidataId, setWikidataId] = useState('');

  const [artists, setArtists] = useState<Artist[]>([]);
  const [suggestedArtistName, setSuggestedArtistName] = useState<string | null>(null);
  const [creatingArtist, setCreatingArtist] = useState(false);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(!!artworkId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnifiedArtworkSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const [wpResults, setWpResults] = useState<WikipediaSearchItem[]>([]);
  const [wpSearching, setWpSearching] = useState(false);
  const [wpApplying, setWpApplying] = useState<string | null>(null);
  const [wpSearched, setWpSearched] = useState(false);

  const [quickEntry, setQuickEntry] = useState('');

  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showPlaceSearch, setShowPlaceSearch] = useState(false);

  useEffect(() => {
    fetch('/api/artists')
      .then((res) => (res.ok ? res.json() : []))
      .then(setArtists);
  }, []);

  useEffect(() => {
    if (!artworkId) return;
    (async () => {
      const res = await fetch(`/api/artworks/${artworkId}`);
      if (res.ok) {
        const data: ArtworkDetail = await res.json();
        setTitle(data.title);
        setTitleEn(data.title_en ?? '');
        setArtistId(data.artist_id ?? '');
        setYear(data.year != null ? String(data.year) : '');
        setYearDisplay(data.year_display ?? '');
        setCollectionName(data.collection_name ?? '');
        setCollectionNameEn(data.collection_name_en ?? '');
        setCollectionCountry(data.collection_country ?? '');
        setCollectionCity(data.collection_city ?? '');
        setLat(data.lat);
        setLng(data.lng);
        setImageUrl(data.image_url ?? '');
        setDescription(data.description ?? '');
        setMedium(data.medium ?? '');
        setMediumEn(data.medium_en ?? '');
        setDimensions(data.dimensions ?? '');
        setWikidataId(data.wikidata_id ?? '');
        setAnnotations(data.annotations ?? []);
      }
      setLoading(false);
    })();
  }, [artworkId]);

  async function refreshAnnotations(currentId: string) {
    const res = await fetch(`/api/artworks/${currentId}/annotations`);
    if (res.ok) setAnnotations(await res.json());
  }

  // 검색 결과의 작가명을 기존 등록된 작가와 매칭하거나, 새로 등록하도록 제안한다.
  function applyArtistName(name: string) {
    if (!name) return;
    const match = artists.find((a) => a.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (match) {
      setArtistId(match.id);
      setSuggestedArtistName(null);
    } else {
      setArtistId('');
      setSuggestedArtistName(name);
    }
  }

  async function handleSearchArtworks() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setSearched(false);
    setWpResults([]);
    setWpSearched(false);
    const res = await fetch(`/api/artwork-search?q=${encodeURIComponent(searchQuery)}`);
    const results: UnifiedArtworkSearchItem[] = res.ok ? await res.json() : [];
    setSearchResults(results);
    setSearching(false);
    setSearched(true);

    // Wikidata/AIC/Met 어디에도 없으면 위키백과에서 한 번 더 찾아본다.
    if (results.length === 0) await handleSearchWikipedia();
  }

  async function handleSearchWikipedia() {
    setWpSearching(true);
    setWpResults([]);
    const res = await fetch(`/api/wikipedia/search-artwork?q=${encodeURIComponent(searchQuery)}`);
    if (res.ok) setWpResults(await res.json());
    setWpSearching(false);
    setWpSearched(true);
  }

  async function handleApplySearchResult(item: UnifiedArtworkSearchItem) {
    const key = `${item.source}:${item.id}`;
    setApplyingKey(key);
    setError(null);
    try {
      if (item.source === 'wikidata') {
        const res = await fetch(`/api/wikidata/artwork/${item.id}`);
        if (!res.ok) throw new Error('작품 정보를 가져오지 못했습니다.');
        const detail: WikidataArtworkDetail = await res.json();

        setTitle(detail.title || item.label);
        setTitleEn(detail.titleEn);
        setYear(detail.year != null ? String(detail.year) : '');
        setCollectionName(detail.collectionName);
        setCollectionNameEn(detail.collectionNameEn);
        setLat(detail.lat);
        setLng(detail.lng);
        if (detail.imageUrl) setImageUrl(detail.imageUrl);
        if (detail.medium) setMedium(detail.medium);
        setMediumEn(detail.mediumEn);
        if (detail.dimensions) setDimensions(detail.dimensions);
        setWikidataId(detail.wikidataId);
        applyArtistName(detail.artistName);
      } else {
        const endpoint = item.source === 'aic' ? `/api/aic/artwork/${item.id}` : `/api/met/artwork/${item.id}`;
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('작품 정보를 가져오지 못했습니다.');
        const detail: AicArtworkDetail | MetArtworkDetail = await res.json();

        setTitle(detail.title || item.label);
        setYear(detail.year != null ? String(detail.year) : '');
        setYearDisplay(detail.year != null ? '' : detail.yearDisplay);
        setCollectionName(detail.collectionName);
        setLat(detail.lat);
        setLng(detail.lng);
        if (detail.imageUrl) setImageUrl(detail.imageUrl);
        if (detail.medium) setMedium(detail.medium);
        if (detail.dimensions) setDimensions(detail.dimensions);
        setWikidataId('');
        applyArtistName(detail.artistName);
      }

      setSearchResults([]);
      setSearchQuery('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApplyingKey(null);
    }
  }

  async function handleApplyWikipediaResult(item: WikipediaSearchItem) {
    setWpApplying(item.title);
    setError(null);
    try {
      const res = await fetch(`/api/wikipedia/artwork?lang=${item.lang}&title=${encodeURIComponent(item.title)}`);
      if (!res.ok) throw new Error('작품 정보를 가져오지 못했습니다.');
      const detail: WikipediaArtworkDetail = await res.json();

      setTitle(detail.title);
      if (detail.imageUrl) setImageUrl(detail.imageUrl);
      if (detail.description) setDescription(detail.description);

      setWpResults([]);
      setSearchQuery('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWpApplying(null);
    }
  }

  function handleApplyQuickEntry() {
    const parsed = parseQuickArtworkEntry(quickEntry);
    if (!parsed) return;

    if (parsed.title) setTitle(parsed.title);
    if (parsed.year != null) setYear(String(parsed.year));
    if (parsed.yearDisplay) setYearDisplay(parsed.yearDisplay);
    if (parsed.medium) setMedium(parsed.medium);
    if (parsed.dimensions) setDimensions(parsed.dimensions);
    if (parsed.collectionName) setCollectionName(parsed.collectionName);

    if (parsed.artistName) applyArtistName(parsed.artistName);
  }

  async function handleCreateSuggestedArtist() {
    if (!suggestedArtistName) return;
    setCreatingArtist(true);
    setError(null);
    try {
      const searchRes = await fetch(`/api/wikidata/search-artist?q=${encodeURIComponent(suggestedArtistName)}`);
      const candidates: WikidataSearchItem[] = searchRes.ok ? await searchRes.json() : [];
      let payload: Record<string, unknown> = { name: suggestedArtistName };

      if (candidates[0]) {
        const detailRes = await fetch(`/api/wikidata/artist/${candidates[0].id}`);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          payload = {
            name: detail.name || suggestedArtistName,
            name_en: detail.nameEn,
            bio: detail.bio,
            birth_year: detail.birthYear,
            death_year: detail.deathYear,
            nationality: detail.nationality,
            movement: detail.movement,
            image_url: detail.imageUrl,
            wikidata_id: detail.wikidataId,
          };
        }
      }

      const createRes = await fetch('/api/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!createRes.ok) throw new Error('작가 등록에 실패했습니다.');
      const created: Artist = await createRes.json();
      setArtists((prev) => [created, ...prev]);
      setArtistId(created.id);
      setSuggestedArtistName(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreatingArtist(false);
    }
  }

  async function handleSearchPlace() {
    if (!placeQuery.trim()) return;
    setPlaceSearching(true);
    setPlaceResults([]);
    const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(placeQuery)}`);
    if (res.ok) setPlaceResults(await res.json());
    setPlaceSearching(false);
  }

  function handleApplyPlace(place: PlaceSearchResult) {
    setLat(place.lat);
    setLng(place.lng);
    setShowPlaceSearch(false);
    setPlaceResults([]);
    setPlaceQuery('');
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? '이미지 업로드에 실패했습니다.');
      setImageUrl(body.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('작품 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      title,
      title_en: titleEn,
      artist_id: artistId || null,
      year: year.trim() ? Number(year) : null,
      year_display: yearDisplay,
      collection_name: collectionName,
      collection_name_en: collectionNameEn,
      collection_country: collectionCountry,
      collection_city: collectionCity,
      lat,
      lng,
      image_url: imageUrl || null,
      description,
      medium,
      medium_en: mediumEn,
      dimensions,
      wikidata_id: wikidataId || null,
    };
    try {
      if (id) {
        const res = await fetch(`/api/artworks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('저장에 실패했습니다.');
      } else {
        const res = await fetch('/api/artworks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('저장에 실패했습니다.');
        const created = await res.json();
        setId(created.id);
      }
      showToast('저장되었습니다');
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm('이 작품을 삭제할까요? 설명 핫스팟도 함께 삭제됩니다.')) return;
    const res = await fetch(`/api/artworks/${id}`, { method: 'DELETE' });
    if (res.ok) onDeleted();
  }

  async function handleAddAnnotation(xPct: number, yPct: number, text: string) {
    if (!id) return;
    const res = await fetch(`/api/artworks/${id}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x_pct: xPct, y_pct: yPct, text }),
    });
    if (res.ok) await refreshAnnotations(id);
  }

  async function handleDeleteAnnotation(annotationId: string) {
    if (!id) return;
    const res = await fetch(`/api/annotations/${annotationId}`, { method: 'DELETE' });
    if (res.ok) await refreshAnnotations(id);
  }

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
            {id ? '작품 정보 수정' : '새 작품 추가'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#6b6258] transition-colors hover:bg-black/[0.05]"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {loading ? (
            <p className="text-sm text-[#6b6258]">불러오는 중...</p>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-accent/25 bg-accent/[0.06] p-3.5">
                <label className={labelClass}>
                  <ClipboardPaste className="h-3.5 w-3.5 text-accent-strong" strokeWidth={2.25} />
                  빠른 입력 — 한 줄로 붙여넣으면 항목을 자동으로 나눠 넣어요
                </label>
                <textarea
                  value={quickEntry}
                  onChange={(e) => setQuickEntry(e.target.value)}
                  rows={2}
                  placeholder="작가명, <작품명>, 제작연도. 재료, 크기(높이 X 너비 단위). 소장처"
                  className={`${inputClass} resize-none`}
                />
                <button
                  type="button"
                  onClick={handleApplyQuickEntry}
                  disabled={!quickEntry.trim()}
                  className="mt-2 flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#4a4038] transition-colors hover:bg-black/[0.03] disabled:opacity-40"
                >
                  <Wand2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                  자동으로 나누어 넣기
                </button>
              </div>

              {!id && (
                <div className="rounded-xl border border-teal/25 bg-teal/[0.06] p-3.5">
                  <label className={labelClass}>
                    <Search className="h-3.5 w-3.5 text-teal" strokeWidth={2.25} />
                    통합 검색 — Wikidata · 시카고 미술관 · 메트로폴리탄 미술관 (이름/작가/연도/소장처/이미지 자동 입력)
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchArtworks()}
                      placeholder="예: Mona Lisa, 별이 빛나는 밤"
                      className={inputClass}
                    />
                    <button
                      onClick={handleSearchArtworks}
                      disabled={searching}
                      className="shrink-0 rounded-xl border border-black/[0.08] bg-white px-4 py-2 text-sm font-medium text-[#4a4038] transition-colors hover:bg-black/[0.03] disabled:opacity-40"
                    >
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} /> : '검색'}
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <ul className="mt-2.5 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-black/[0.06] bg-white p-1.5">
                      {searchResults.map((item) => {
                        const key = `${item.source}:${item.id}`;
                        return (
                          <li key={key}>
                            <button
                              onClick={() => handleApplySearchResult(item)}
                              disabled={applyingKey === key}
                              className="flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-teal/10 disabled:opacity-50"
                            >
                              {applyingKey === key ? (
                                <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-teal" strokeWidth={2.25} />
                              ) : (
                                <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" strokeWidth={2.25} />
                              )}
                              <span className="min-w-0">
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${SOURCE_BADGE[item.source]}`}
                                  >
                                    {SOURCE_LABEL[item.source]}
                                  </span>
                                  <span className="truncate font-medium text-[#2a231c]">{item.label}</span>
                                </span>
                                {item.description && (
                                  <span className="block truncate text-xs text-[#8a8074]">{item.description}</span>
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {!id && searched && searchResults.length === 0 && (
                <div className="rounded-xl border border-gold/25 bg-gold/[0.06] p-3.5">
                  <label className={labelClass}>
                    <Search className="h-3.5 w-3.5 text-gold" strokeWidth={2.25} />
                    Wikidata에 없어서 위키백과에서 찾아봤어요 (이름/설명/이미지만 자동 입력)
                  </label>
                  {wpSearching ? (
                    <p className="flex items-center gap-1.5 text-sm text-[#6b6258]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} />
                      검색 중...
                    </p>
                  ) : wpResults.length > 0 ? (
                    <ul className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-black/[0.06] bg-white p-1.5">
                      {wpResults.map((item) => (
                        <li key={`${item.lang}-${item.title}`}>
                          <button
                            onClick={() => handleApplyWikipediaResult(item)}
                            disabled={wpApplying === item.title}
                            className="flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-gold/10 disabled:opacity-50"
                          >
                            {wpApplying === item.title ? (
                              <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-gold" strokeWidth={2.25} />
                            ) : (
                              <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" strokeWidth={2.25} />
                            )}
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-[#2a231c]">{item.title}</span>
                              <span className="block truncate text-xs text-[#8a8074]">{item.snippet}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    wpSearched && (
                      <p className="text-sm text-[#8a8074]">위키백과에서도 찾지 못했어요. 아래 항목을 직접 입력해주세요.</p>
                    )
                  )}
                </div>
              )}

              <div>
                <label className={labelClass}>작품 이름</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="예: 별이 빛나는 밤" />
                <input
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  className={`${inputClass} mt-1.5 text-[12.5px]`}
                  placeholder="영문 작품명 (선택, 예: The Starry Night)"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelClass}>작가</label>
                  <select value={artistId} onChange={(e) => setArtistId(e.target.value)} className={`${inputClass} appearance-none`}>
                    <option value="">선택 안 함</option>
                    {artists.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {suggestedArtistName && (
                    <button
                      onClick={handleCreateSuggestedArtist}
                      disabled={creatingArtist}
                      className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-teal transition-opacity hover:opacity-80 disabled:opacity-50"
                    >
                      {creatingArtist ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} /> : <Wand2 className="h-3 w-3" strokeWidth={2.5} />}
                      &apos;{suggestedArtistName}&apos; 작가로 새로 등록
                    </button>
                  )}
                </div>
                <div className="w-28">
                  <label className={labelClass}>
                    <CalendarClock className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
                    연도
                  </label>
                  <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>연도 표기 (선택, 예: c. 1503)</label>
                <input value={yearDisplay} onChange={(e) => setYearDisplay(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>
                  <BookImage className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
                  이미지 {!imageUrl && <span className="font-normal text-[#a39a8d]">— Wikidata에 없으면 직접 업로드하세요</span>}
                </label>
                <div className="flex items-center gap-2">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" className="h-[42px] w-[42px] shrink-0 rounded-lg object-cover ring-1 ring-black/[0.08]" />
                  ) : (
                    <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg bg-black/[0.03] ring-1 ring-black/[0.08]">
                      <BookImage className="h-4 w-4 text-[#c9beae]" strokeWidth={1.5} />
                    </div>
                  )}
                  <input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className={inputClass}
                    placeholder="https://... 또는 직접 업로드"
                  />
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-3.5 text-sm font-medium text-[#4a4038] transition-colors hover:bg-black/[0.03] disabled:opacity-40"
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} /> : <Upload className="h-3.5 w-3.5" strokeWidth={2.25} />}
                    업로드
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelClass}>
                    <Layers className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
                    재료 / 기법
                  </label>
                  <input value={medium} onChange={(e) => setMedium(e.target.value)} className={inputClass} placeholder="예: 캔버스에 유채" />
                  <input
                    value={mediumEn}
                    onChange={(e) => setMediumEn(e.target.value)}
                    className={`${inputClass} mt-1.5 text-[12.5px]`}
                    placeholder="영문 (선택, 예: Oil on canvas)"
                  />
                </div>
                <div className="w-40">
                  <label className={labelClass}>
                    <Ruler className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
                    크기
                  </label>
                  <input value={dimensions} onChange={(e) => setDimensions(e.target.value)} className={inputClass} placeholder="예: 73.7 × 92.1 cm" />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  <Building2 className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
                  소장처
                </label>
                <input value={collectionName} onChange={(e) => setCollectionName(e.target.value)} className={inputClass} placeholder="예: 루브르 박물관" />
                <input
                  value={collectionNameEn}
                  onChange={(e) => setCollectionNameEn(e.target.value)}
                  className={`${inputClass} mt-1.5 text-[12.5px]`}
                  placeholder="영문 소장처 (선택, 예: Musée du Louvre)"
                />
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className={labelClass}>
                    <MapPinned className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
                    좌표
                  </label>
                  <p className="rounded-xl border border-black/[0.08] bg-black/[0.02] px-3.5 py-2.5 text-sm text-[#4a4038]">
                    {lat != null && lng != null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '설정 안 됨 — 지도에 표시되지 않아요'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlaceSearch((v) => !v)}
                  className="flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-3.5 text-sm font-medium text-[#4a4038] transition-colors hover:bg-black/[0.03]"
                >
                  <Search className="h-3.5 w-3.5" strokeWidth={2.25} />
                  위치 검색
                </button>
              </div>
              {showPlaceSearch && (
                <div className="rounded-xl border border-black/[0.08] bg-black/[0.02] p-3">
                  <div className="flex gap-2">
                    <input
                      value={placeQuery}
                      onChange={(e) => setPlaceQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchPlace()}
                      placeholder="소장처 이름으로 좌표 검색"
                      className={inputClass}
                    />
                    <button
                      onClick={handleSearchPlace}
                      disabled={placeSearching}
                      className="shrink-0 rounded-xl border border-black/[0.08] bg-white px-4 py-2 text-sm font-medium text-[#4a4038] disabled:opacity-40"
                    >
                      {placeSearching ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} /> : '검색'}
                    </button>
                  </div>
                  {placeResults.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {placeResults.map((p, i) => (
                        <li key={`${p.lat}-${p.lng}-${i}`}>
                          <button
                            onClick={() => handleApplyPlace(p)}
                            className="block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[#2a231c] hover:bg-white"
                          >
                            <span className="font-medium">{p.name}</span>{' '}
                            <span className="text-[#8a8074]">{p.displayName}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div>
                <label className={labelClass}>
                  <Sparkles className="h-3.5 w-3.5 text-accent-strong" strokeWidth={2.25} />
                  설명
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="border-t border-black/[0.06] pt-5">
                <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-[#2a231c]">
                  <Sparkles className="h-4 w-4 text-teal" strokeWidth={2.25} />
                  이미지 속 설명 핫스팟
                </h3>
                {!id && <p className="text-xs text-[#8a8074]">작품을 먼저 저장하면 이미지 위에 설명을 추가할 수 있어요.</p>}
                {id && !imageUrl && <p className="text-xs text-[#8a8074]">이미지 URL을 먼저 입력하고 저장해주세요.</p>}
                {id && imageUrl && (
                  <>
                    <p className="mb-2 text-xs text-[#8a8074]">이미지를 클릭하면 그 위치에 설명을 추가할 수 있어요.</p>
                    <AnnotationLayer
                      imageUrl={imageUrl}
                      annotations={annotations}
                      onAdd={handleAddAnnotation}
                      onDelete={handleDeleteAnnotation}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {!loading && (
          <div className="flex shrink-0 flex-col gap-2 border-t border-black/[0.06] px-4 sm:px-6 py-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-600">
                <TriangleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" strokeWidth={2.25} />
                {saving ? '저장 중...' : id ? '저장' : '저장하고 설명 추가하기'}
              </button>
              {id && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                  작품 삭제
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
