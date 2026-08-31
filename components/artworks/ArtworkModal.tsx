'use client';

import { useEffect, useState } from 'react';
import {
  BookImage,
  Building2,
  CalendarClock,
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
  Wand2,
  X,
} from 'lucide-react';
import type { Annotation, Artist, ArtworkDetail } from '@/lib/types';
import type { WikidataSearchItem, WikidataArtworkDetail } from '@/lib/wikidata';
import type { PlaceSearchResult } from '@/lib/geocode';
import { AnnotationLayer } from './AnnotationLayer';

const inputClass =
  'w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-3.5 py-2.5 text-sm text-[#2a231c] placeholder:text-[#a39a8d] outline-none transition-colors focus:border-accent/50 focus:ring-2 focus:ring-accent/20';
const labelClass = 'mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-[#4a4038]';

interface ArtworkModalProps {
  artworkId?: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function ArtworkModal({ artworkId, onClose, onSaved, onDeleted }: ArtworkModalProps) {
  const [id, setId] = useState<string | undefined>(artworkId);
  const [title, setTitle] = useState('');
  const [artistId, setArtistId] = useState('');
  const [year, setYear] = useState('');
  const [yearDisplay, setYearDisplay] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [collectionCountry, setCollectionCountry] = useState('');
  const [collectionCity, setCollectionCity] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [medium, setMedium] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [wikidataId, setWikidataId] = useState('');

  const [artists, setArtists] = useState<Artist[]>([]);
  const [suggestedArtistName, setSuggestedArtistName] = useState<string | null>(null);
  const [creatingArtist, setCreatingArtist] = useState(false);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(!!artworkId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [wdQuery, setWdQuery] = useState('');
  const [wdResults, setWdResults] = useState<WikidataSearchItem[]>([]);
  const [wdSearching, setWdSearching] = useState(false);
  const [wdApplying, setWdApplying] = useState<string | null>(null);

  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
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
        setArtistId(data.artist_id ?? '');
        setYear(data.year != null ? String(data.year) : '');
        setYearDisplay(data.year_display ?? '');
        setCollectionName(data.collection_name ?? '');
        setCollectionCountry(data.collection_country ?? '');
        setCollectionCity(data.collection_city ?? '');
        setLat(data.lat);
        setLng(data.lng);
        setImageUrl(data.image_url ?? '');
        setDescription(data.description ?? '');
        setMedium(data.medium ?? '');
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

  async function handleSearchWikidata() {
    if (!wdQuery.trim()) return;
    setWdSearching(true);
    setWdResults([]);
    const res = await fetch(`/api/wikidata/search-artwork?q=${encodeURIComponent(wdQuery)}`);
    if (res.ok) setWdResults(await res.json());
    setWdSearching(false);
  }

  async function handleApplyWikidataResult(item: WikidataSearchItem) {
    setWdApplying(item.id);
    setError(null);
    try {
      const res = await fetch(`/api/wikidata/artwork/${item.id}`);
      if (!res.ok) throw new Error('작품 정보를 가져오지 못했습니다.');
      const detail: WikidataArtworkDetail = await res.json();

      setTitle(detail.title || item.label);
      setYear(detail.year != null ? String(detail.year) : '');
      setCollectionName(detail.collectionName);
      setLat(detail.lat);
      setLng(detail.lng);
      if (detail.imageUrl) setImageUrl(detail.imageUrl);
      if (detail.medium) setMedium(detail.medium);
      if (detail.dimensions) setDimensions(detail.dimensions);
      setWikidataId(detail.wikidataId);

      if (detail.artistName) {
        const match = artists.find((a) => a.name.trim().toLowerCase() === detail.artistName.trim().toLowerCase());
        if (match) {
          setArtistId(match.id);
          setSuggestedArtistName(null);
        } else {
          setArtistId('');
          setSuggestedArtistName(detail.artistName);
        }
      }

      setWdResults([]);
      setWdQuery('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWdApplying(null);
    }
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

  async function handleSave() {
    if (!title.trim()) {
      setError('작품 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      title,
      artist_id: artistId || null,
      year: year.trim() ? Number(year) : null,
      year_display: yearDisplay,
      collection_name: collectionName,
      collection_country: collectionCountry,
      collection_city: collectionCity,
      lat,
      lng,
      image_url: imageUrl || null,
      description,
      medium,
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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-black/[0.08] bg-surface shadow-2xl shadow-black/20">
        <div className="flex items-center justify-between gap-2 border-b border-black/[0.06] px-4 sm:px-6 py-4">
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

        <div className="px-4 sm:px-6 py-5">
          {loading ? (
            <p className="text-sm text-[#6b6258]">불러오는 중...</p>
          ) : (
            <div className="space-y-5">
              {!id && (
                <div className="rounded-xl border border-teal/25 bg-teal/[0.06] p-3.5">
                  <label className={labelClass}>
                    <Search className="h-3.5 w-3.5 text-teal" strokeWidth={2.25} />
                    Wikidata에서 작품 검색 (이름/작가/연도/소장처 자동 입력)
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={wdQuery}
                      onChange={(e) => setWdQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchWikidata()}
                      placeholder="예: Mona Lisa, 별이 빛나는 밤"
                      className={inputClass}
                    />
                    <button
                      onClick={handleSearchWikidata}
                      disabled={wdSearching}
                      className="shrink-0 rounded-xl border border-black/[0.08] bg-white px-4 py-2 text-sm font-medium text-[#4a4038] transition-colors hover:bg-black/[0.03] disabled:opacity-40"
                    >
                      {wdSearching ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} /> : '검색'}
                    </button>
                  </div>
                  {wdResults.length > 0 && (
                    <ul className="mt-2.5 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-black/[0.06] bg-white p-1.5">
                      {wdResults.map((item) => (
                        <li key={item.id}>
                          <button
                            onClick={() => handleApplyWikidataResult(item)}
                            disabled={wdApplying === item.id}
                            className="flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-teal/10 disabled:opacity-50"
                          >
                            {wdApplying === item.id ? (
                              <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-teal" strokeWidth={2.25} />
                            ) : (
                              <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" strokeWidth={2.25} />
                            )}
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-[#2a231c]">{item.label}</span>
                              {item.description && (
                                <span className="block truncate text-xs text-[#8a8074]">{item.description}</span>
                              )}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div>
                <label className={labelClass}>작품 이름</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="예: 별이 빛나는 밤" />
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
                  이미지 URL
                </label>
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inputClass} placeholder="https://..." />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelClass}>
                    <Layers className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
                    재료 / 기법
                  </label>
                  <input value={medium} onChange={(e) => setMedium(e.target.value)} className={inputClass} placeholder="예: 캔버스에 유채" />
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
      </div>
    </div>
  );
}
