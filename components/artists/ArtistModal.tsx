'use client';

import { useEffect, useState } from 'react';
import {
  Globe2,
  ImageOff,
  Landmark,
  Loader2,
  Palette,
  Plus,
  Save,
  Search,
  Trash2,
  TriangleAlert,
  User,
  UserRound,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import type { Artist, ArtistRelationship, Artwork, RelatedPerson, RelationshipType } from '@/lib/types';
import { RELATIONSHIP_TYPES } from '@/lib/types';
import type { WikidataArtistDetail, WikidataSearchItem } from '@/lib/wikidata';
import { useToast } from '@/components/ui/Toast';

const inputClass =
  'w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-3.5 py-2.5 text-sm text-[#2a231c] placeholder:text-[#a39a8d] outline-none transition-colors focus:border-accent/50 focus:ring-2 focus:ring-accent/20';
const labelClass = 'mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-[#4a4038]';

interface ArtistModalProps {
  artistId?: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onOpenArtwork: (artworkId: string) => void;
}

export function ArtistModal({ artistId, onClose, onSaved, onDeleted, onOpenArtwork }: ArtistModalProps) {
  const { showToast } = useToast();
  const [id, setId] = useState<string | undefined>(artistId);
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [bio, setBio] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [deathYear, setDeathYear] = useState('');
  const [nationality, setNationality] = useState('');
  const [movement, setMovement] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [wikidataId, setWikidataId] = useState('');

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [relationships, setRelationships] = useState<ArtistRelationship[]>([]);
  const [allArtists, setAllArtists] = useState<Artist[]>([]);
  const [allPeople, setAllPeople] = useState<RelatedPerson[]>([]);

  const [loading, setLoading] = useState(!!artistId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [wdQuery, setWdQuery] = useState('');
  const [wdResults, setWdResults] = useState<WikidataSearchItem[]>([]);
  const [wdSearching, setWdSearching] = useState(false);
  const [wdApplying, setWdApplying] = useState<string | null>(null);

  const [relTargetKind, setRelTargetKind] = useState<'artist' | 'person'>('artist');
  const [relTargetId, setRelTargetId] = useState('');
  const [relPersonId, setRelPersonId] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRole, setNewPersonRole] = useState('');
  const [creatingPerson, setCreatingPerson] = useState(false);
  const [relType, setRelType] = useState<RelationshipType>('사제관계');
  const [relTypeCustom, setRelTypeCustom] = useState('');
  const [relDescription, setRelDescription] = useState('');
  const [addingRelationship, setAddingRelationship] = useState(false);

  useEffect(() => {
    fetch('/api/artists')
      .then((res) => (res.ok ? res.json() : []))
      .then(setAllArtists);
    fetch('/api/people')
      .then((res) => (res.ok ? res.json() : []))
      .then(setAllPeople);
  }, []);

  useEffect(() => {
    if (!artistId) return;
    (async () => {
      const res = await fetch(`/api/artists/${artistId}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.name);
        setNameEn(data.name_en ?? '');
        setBio(data.bio ?? '');
        setBirthYear(data.birth_year != null ? String(data.birth_year) : '');
        setDeathYear(data.death_year != null ? String(data.death_year) : '');
        setNationality(data.nationality ?? '');
        setMovement(data.movement ?? '');
        setImageUrl(data.image_url ?? '');
        setWikidataId(data.wikidata_id ?? '');
        setArtworks(data.artworks ?? []);
        setRelationships(data.relationships ?? []);
      }
      setLoading(false);
    })();
  }, [artistId]);

  async function refreshDetail(currentId: string) {
    const res = await fetch(`/api/artists/${currentId}`);
    if (res.ok) {
      const data = await res.json();
      setArtworks(data.artworks ?? []);
      setRelationships(data.relationships ?? []);
    }
  }

  async function handleSearchWikidata() {
    if (!wdQuery.trim()) return;
    setWdSearching(true);
    setWdResults([]);
    const res = await fetch(`/api/wikidata/search-artist?q=${encodeURIComponent(wdQuery)}`);
    if (res.ok) setWdResults(await res.json());
    setWdSearching(false);
  }

  async function handleApplyWikidataResult(item: WikidataSearchItem) {
    setWdApplying(item.id);
    setError(null);
    try {
      const res = await fetch(`/api/wikidata/artist/${item.id}`);
      if (!res.ok) throw new Error('작가 정보를 가져오지 못했습니다.');
      const detail: WikidataArtistDetail = await res.json();

      setName(detail.name || item.label);
      setNameEn(detail.nameEn);
      if (detail.bio) setBio(detail.bio);
      setBirthYear(detail.birthYear != null ? String(detail.birthYear) : '');
      setDeathYear(detail.deathYear != null ? String(detail.deathYear) : '');
      setNationality(detail.nationality);
      setMovement(detail.movement);
      if (detail.imageUrl) setImageUrl(detail.imageUrl);
      setWikidataId(detail.wikidataId);

      setWdResults([]);
      setWdQuery('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWdApplying(null);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('작가 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name,
      name_en: nameEn,
      bio,
      birth_year: birthYear.trim() ? Number(birthYear) : null,
      death_year: deathYear.trim() ? Number(deathYear) : null,
      nationality,
      movement,
      image_url: imageUrl || null,
      wikidata_id: wikidataId || null,
    };
    try {
      if (id) {
        const res = await fetch(`/api/artists/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('저장에 실패했습니다.');
      } else {
        const res = await fetch('/api/artists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('저장에 실패했습니다.');
        const created = await res.json();
        setId(created.id);
        setAllArtists((prev) => [created, ...prev]);
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
    if (!confirm('이 작가를 삭제할까요? 연결된 관계도 함께 삭제됩니다. (작품은 남지만 작가 연결이 해제됩니다)')) return;
    const res = await fetch(`/api/artists/${id}`, { method: 'DELETE' });
    if (res.ok) onDeleted();
  }

  // 대상 작가/인물 중 하나를 지정해 현재 작가와의 관계를 만듭니다.
  async function createRelationship(targetArtistId: string | null, targetPersonId: string | null) {
    const effectiveType = relType === '기타' && relTypeCustom.trim() ? relTypeCustom.trim() : relType;
    const res = await fetch('/api/relationships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_artist_id: id,
        target_artist_id: targetArtistId,
        target_person_id: targetPersonId,
        relationship_type: effectiveType,
        description: relDescription,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? '관계 추가에 실패했습니다.');
    }
  }

  // 새 인물은 등록과 동시에 현재 작가와의 관계도 함께 만들어야, 등록만 하고
  // 연결(인물관계 화면 표시)을 놓치는 일이 없습니다.
  async function handleCreatePerson() {
    if (!newPersonName.trim() || !id) return;
    setCreatingPerson(true);
    setError(null);
    try {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPersonName.trim(), role: newPersonRole.trim() }),
      });
      if (!res.ok) throw new Error('인물 등록에 실패했습니다.');
      const created: RelatedPerson = await res.json();
      setAllPeople((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'ko')));

      await createRelationship(null, created.id);

      setNewPersonName('');
      setNewPersonRole('');
      setRelPersonId('');
      setRelDescription('');
      setRelTypeCustom('');
      await refreshDetail(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreatingPerson(false);
    }
  }

  async function handleAddRelationship() {
    if (!id) return;
    if (relTargetKind === 'artist' && !relTargetId) return;
    if (relTargetKind === 'person' && !relPersonId) return;
    setAddingRelationship(true);
    setError(null);
    try {
      await createRelationship(relTargetKind === 'artist' ? relTargetId : null, relTargetKind === 'person' ? relPersonId : null);
      setRelTargetId('');
      setRelPersonId('');
      setRelDescription('');
      setRelTypeCustom('');
      await refreshDetail(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAddingRelationship(false);
    }
  }

  async function handleDeleteRelationship(relId: string) {
    if (!id) return;
    const res = await fetch(`/api/relationships/${relId}`, { method: 'DELETE' });
    if (res.ok) await refreshDetail(id);
  }

  const otherArtists = allArtists.filter((a) => a.id !== id);

  return (
    <div className="fixed inset-0 z-[3500] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-surface shadow-2xl shadow-black/20">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] px-4 sm:px-6 py-4">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#2a231c]">
            <User className="h-4 w-4 text-accent-strong" strokeWidth={2.25} />
            {id ? '화가 정보 수정' : '새 화가 추가'}
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
              {!id && (
                <div className="rounded-xl border border-teal/25 bg-teal/[0.06] p-3.5">
                  <label className={labelClass}>
                    <Search className="h-3.5 w-3.5 text-teal" strokeWidth={2.25} />
                    Wikidata에서 화가 검색 (약력·생몰년·사조 자동 입력)
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={wdQuery}
                      onChange={(e) => setWdQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchWikidata()}
                      placeholder="예: Vincent van Gogh, 클로드 모네"
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

              <div className="flex gap-3">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover ring-1 ring-black/[0.08]" />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-black/[0.03] ring-1 ring-black/[0.08]">
                    <ImageOff className="h-5 w-5 text-[#c9beae]" strokeWidth={1.5} />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="화가 이름" />
                  <input
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className={`${inputClass} text-[12.5px]`}
                    placeholder="영문 이름 (선택, 예: Vincent van Gogh)"
                  />
                  <input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className={`${inputClass} text-[12.5px]`}
                    placeholder="초상화 이미지 URL"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-24">
                  <label className={labelClass}>출생년</label>
                  <input type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className={inputClass} />
                </div>
                <div className="w-24">
                  <label className={labelClass}>사망년</label>
                  <input type="number" value={deathYear} onChange={(e) => setDeathYear(e.target.value)} className={inputClass} />
                </div>
                <div className="flex-1">
                  <label className={labelClass}>
                    <Globe2 className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
                    국적
                  </label>
                  <input value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  <Palette className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
                  화파 / 사조
                </label>
                <input value={movement} onChange={(e) => setMovement(e.target.value)} className={inputClass} placeholder="예: 인상주의" />
              </div>

              <div>
                <label className={labelClass}>
                  <Landmark className="h-3.5 w-3.5 text-[#8a8074]" strokeWidth={2.25} />
                  약력
                </label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
              </div>

              <div className="border-t border-black/[0.06] pt-5">
                <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-[#2a231c]">
                  <Users className="h-4 w-4 text-teal" strokeWidth={2.25} />
                  다른 작가 · 인물과의 관계
                </h3>
                {!id && <p className="mb-3 text-xs text-[#8a8074]">작가를 먼저 저장하면 관계를 추가할 수 있어요.</p>}
                {id && (
                  <>
                    <div className="mb-2 inline-flex items-center gap-0.5 rounded-lg border border-black/[0.08] bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => setRelTargetKind('artist')}
                        className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                          relTargetKind === 'artist' ? 'bg-teal/10 text-teal' : 'text-[#8a8074] hover:text-[#4a4038]'
                        }`}
                      >
                        <User className="h-3 w-3" strokeWidth={2.5} />
                        작가
                      </button>
                      <button
                        type="button"
                        onClick={() => setRelTargetKind('person')}
                        className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                          relTargetKind === 'person' ? 'bg-teal/10 text-teal' : 'text-[#8a8074] hover:text-[#4a4038]'
                        }`}
                      >
                        <UserRound className="h-3 w-3" strokeWidth={2.5} />
                        인물 (배우자·친구 등)
                      </button>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {relTargetKind === 'artist' ? (
                        <select
                          value={relTargetId}
                          onChange={(e) => setRelTargetId(e.target.value)}
                          className={`${inputClass} w-auto flex-1 appearance-none`}
                        >
                          <option value="">작가 선택</option>
                          {otherArtists.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={relPersonId}
                          onChange={(e) => setRelPersonId(e.target.value)}
                          className={`${inputClass} w-auto flex-1 appearance-none`}
                        >
                          <option value="">새 인물 추가...</option>
                          {allPeople.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.role ? ` (${p.role})` : ''}
                            </option>
                          ))}
                        </select>
                      )}
                      <select
                        value={relType}
                        onChange={(e) => setRelType(e.target.value as RelationshipType)}
                        className={`${inputClass} w-32 appearance-none`}
                      >
                        {RELATIONSHIP_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      {relType === '기타' && (
                        <input
                          value={relTypeCustom}
                          onChange={(e) => setRelTypeCustom(e.target.value)}
                          placeholder="관계 직접 입력 (예: 동업자)"
                          className={`${inputClass} w-auto flex-1 text-[12.5px]`}
                        />
                      )}
                      <button
                        onClick={handleAddRelationship}
                        disabled={(relTargetKind === 'artist' ? !relTargetId : !relPersonId) || addingRelationship}
                        className="flex shrink-0 items-center gap-1 rounded-lg border border-black/[0.08] bg-white px-2.5 py-2 text-xs font-medium text-[#4a4038] transition-colors hover:bg-teal/10 disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" strokeWidth={2.5} />
                        추가
                      </button>
                    </div>

                    {relTargetKind === 'person' && !relPersonId && (
                      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-gold/25 bg-gold/[0.06] p-2.5">
                        <input
                          value={newPersonName}
                          onChange={(e) => setNewPersonName(e.target.value)}
                          placeholder="이름 (예: 테오 반 고흐)"
                          className={`${inputClass} w-auto flex-1 text-[12.5px]`}
                        />
                        <input
                          value={newPersonRole}
                          onChange={(e) => setNewPersonRole(e.target.value)}
                          placeholder="관계 (예: 동생, 배우자, 친구)"
                          className={`${inputClass} w-auto flex-1 text-[12.5px]`}
                        />
                        <button
                          type="button"
                          onClick={handleCreatePerson}
                          disabled={!newPersonName.trim() || creatingPerson}
                          className="flex shrink-0 items-center gap-1 rounded-lg border border-black/[0.08] bg-white px-2.5 py-2 text-xs font-medium text-[#4a4038] transition-colors hover:bg-gold/10 disabled:opacity-40"
                        >
                          {creatingPerson ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} /> : <Plus className="h-3 w-3" strokeWidth={2.5} />}
                          인물 추가
                        </button>
                      </div>
                    )}

                    <input
                      value={relDescription}
                      onChange={(e) => setRelDescription(e.target.value)}
                      placeholder="관계 설명 (선택)"
                      className={`${inputClass} mb-3 text-[12.5px]`}
                    />

                    {relationships.length === 0 ? (
                      <p className="text-xs text-[#8a8074]">등록된 관계가 없습니다.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {relationships.map((rel) => {
                          const isPerson = !!rel.target_person;
                          const otherName = isPerson ? rel.target_person?.name : (rel.source_artist_id === id ? rel.target : rel.source)?.name;
                          const direction = rel.source_artist_id === id ? '→' : '←';
                          return (
                            <li
                              key={rel.id}
                              className="flex items-center gap-2.5 rounded-lg border border-black/[0.06] bg-black/[0.015] px-3 py-2 text-sm"
                            >
                              <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[11px] font-semibold text-teal">
                                {rel.relationship_type}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[#2a231c]">
                                {direction} {otherName ?? '알 수 없음'}
                                {isPerson && rel.target_person?.role && (
                                  <span className="text-[#8a8074]"> · {rel.target_person.role}</span>
                                )}
                                {rel.description && <span className="text-[#8a8074]"> · {rel.description}</span>}
                              </span>
                              <button
                                onClick={() => handleDeleteRelationship(rel.id)}
                                className="flex shrink-0 h-6 w-6 items-center justify-center rounded-lg text-red-500/70 transition-colors hover:bg-red-500/10 hover:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                )}
              </div>

              {id && (
                <div className="border-t border-black/[0.06] pt-5">
                  <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-[#2a231c]">
                    <Palette className="h-4 w-4 text-accent-strong" strokeWidth={2.25} />
                    작품 <span className="font-normal text-[#8a8074]">({artworks.length})</span>
                  </h3>
                  {artworks.length === 0 ? (
                    <p className="text-xs text-[#8a8074]">등록된 작품이 없습니다.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {artworks.map((art) => (
                        <button
                          key={art.id}
                          onClick={() => onOpenArtwork(art.id)}
                          className="group overflow-hidden rounded-xl border border-black/[0.07] text-left"
                        >
                          <div className="flex aspect-square items-center justify-center overflow-hidden bg-black/[0.03]">
                            {art.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={art.image_url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                            ) : (
                              <ImageOff className="h-4 w-4 text-[#c9beae]" strokeWidth={1.5} />
                            )}
                          </div>
                          <p className="truncate px-1.5 py-1 text-[11px] font-medium text-[#2a231c]">{art.title}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
                {saving ? '저장 중...' : id ? '저장' : '저장하고 관계 추가하기'}
              </button>
              {id && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                  화가 삭제
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
