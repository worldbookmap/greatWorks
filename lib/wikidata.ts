// Wikidata 연동: 무료·키 불필요. 작가/작품을 검색해 이름·연도·소장처·이미지를 자동으로 채웁니다.
// https://www.wikidata.org/w/api.php

const USER_AGENT = 'greatWorks-art-catalog/1.0';
const API = 'https://www.wikidata.org/w/api.php';

export interface WikidataSearchItem {
  id: string;
  label: string;
  description: string;
}

interface WikidataTimeValue {
  time: string;
}
interface WikidataEntityIdValue {
  id: string;
}
interface WikidataCoordinateValue {
  latitude: number;
  longitude: number;
}
interface WikidataQuantityValue {
  amount: string;
  unit?: string;
}

// 자주 쓰이는 단위 QID → 짧은 표기
const UNIT_ABBR: Record<string, string> = {
  Q174728: 'cm',
  Q11573: 'm',
  Q218593: 'in',
  Q3710: 'mm',
};
interface WikidataSnak {
  mainsnak?: { datavalue?: { value: unknown } };
}
type WikidataClaims = Record<string, WikidataSnak[]>;
interface WikidataEntity {
  id: string;
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  claims?: WikidataClaims;
}

async function wdFetch<T>(params: Record<string, string>): Promise<T> {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params }).toString()}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Wikidata 요청에 실패했습니다 (${res.status}).`);
  return res.json();
}

export async function searchEntities(query: string, limit = 8): Promise<WikidataSearchItem[]> {
  const data = await wdFetch<{ search?: { id: string; label?: string; description?: string }[] }>({
    action: 'wbsearchentities',
    search: query,
    language: 'ko',
    uselang: 'ko',
    type: 'item',
    limit: String(limit),
  });
  return (data.search ?? []).map((item) => ({
    id: item.id,
    label: item.label ?? item.id,
    description: item.description ?? '',
  }));
}

// 회화/조각/드로잉/판화/사진/프레스코/벽화 등 "시각예술 작품" 유형 (P31)
// wbsearchentities는 라벨만 보고 매칭해 영화·소설 등 동명이인 항목이 섞이므로,
// 구조화 검색(haswbstatement)으로 실제 작품 항목만 걸러낸다.
const ARTWORK_TYPE_IDS = ['Q3305213', 'Q860861', 'Q93184', 'Q11060274', 'Q125191', 'Q22669139', 'Q219423'];

export async function searchArtworks(query: string, limit = 8): Promise<WikidataSearchItem[]> {
  const typeFilter = ARTWORK_TYPE_IDS.map((id) => `P31=${id}`).join('|');
  const data = await wdFetch<{ query?: { search?: { title: string }[] } }>({
    action: 'query',
    list: 'search',
    srnamespace: '0',
    srsearch: `${query} haswbstatement:${typeFilter}`,
    srlimit: String(limit),
  });
  const ids = (data.query?.search ?? []).map((item) => item.title);
  // 세부 유형이 위 목록에 없는 작품(예: 태피스트리)은 필터에 걸리지 않으므로 일반 검색으로 폴백
  if (ids.length === 0) return searchEntities(query, limit);

  const entities = await getEntities(ids);
  return ids.map((id) => ({
    id,
    label: labelOf(entities[id]) || id,
    description: descriptionOf(entities[id]),
  }));
}

async function getEntities(ids: string[]): Promise<Record<string, WikidataEntity>> {
  if (ids.length === 0) return {};
  const data = await wdFetch<{ entities?: Record<string, WikidataEntity> }>({
    action: 'wbgetentities',
    ids: ids.join('|'),
    props: 'labels|claims|descriptions',
    languages: 'ko|en',
  });
  return data.entities ?? {};
}

function labelOf(entity: WikidataEntity | undefined): string {
  return entity?.labels?.ko?.value ?? entity?.labels?.en?.value ?? entity?.id ?? '';
}

// 영문 표기 전용 (한글로 폴백하지 않음) — 상세보기에서 영/한 병기에 사용
function labelEnOf(entity: WikidataEntity | undefined): string {
  return entity?.labels?.en?.value ?? '';
}

function descriptionOf(entity: WikidataEntity | undefined): string {
  return entity?.descriptions?.ko?.value ?? entity?.descriptions?.en?.value ?? '';
}

function firstValue(claims: WikidataClaims | undefined, prop: string): unknown {
  return claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
}

function entityIdOf(claims: WikidataClaims | undefined, prop: string): string | null {
  const v = firstValue(claims, prop);
  if (v && typeof v === 'object' && 'id' in v) return (v as WikidataEntityIdValue).id;
  return null;
}

function allEntityIdsOf(claims: WikidataClaims | undefined, prop: string): string[] {
  return (claims?.[prop] ?? [])
    .map((snak) => snak.mainsnak?.datavalue?.value)
    .filter((v): v is WikidataEntityIdValue => !!v && typeof v === 'object' && 'id' in v)
    .map((v) => v.id);
}

function quantityOf(claims: WikidataClaims | undefined, prop: string): { amount: number; unitId: string | null } | null {
  const v = firstValue(claims, prop);
  if (!v || typeof v !== 'object' || !('amount' in v)) return null;
  const q = v as WikidataQuantityValue;
  const amount = Number(q.amount.replace('+', ''));
  const unitId = q.unit && q.unit !== '1' ? (q.unit.split('/').pop() ?? null) : null;
  return { amount, unitId };
}

function yearOf(claims: WikidataClaims | undefined, prop: string): number | null {
  const v = firstValue(claims, prop);
  if (!v || typeof v !== 'object' || !('time' in v)) return null;
  const match = /^([+-]\d+)-/.exec((v as WikidataTimeValue).time);
  return match ? Number(match[1]) : null;
}

function coordinateOf(claims: WikidataClaims | undefined, prop: string): { lat: number; lng: number } | null {
  const v = firstValue(claims, prop);
  if (!v || typeof v !== 'object' || !('latitude' in v)) return null;
  const coord = v as WikidataCoordinateValue;
  return { lat: coord.latitude, lng: coord.longitude };
}

function imageUrlOf(claims: WikidataClaims | undefined, prop = 'P18'): string | null {
  const v = firstValue(claims, prop);
  if (typeof v !== 'string') return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(v)}?width=1000`;
}

export interface WikidataArtworkDetail {
  wikidataId: string;
  title: string;
  titleEn: string;
  artistName: string;
  artistNameEn: string;
  year: number | null;
  collectionName: string;
  collectionNameEn: string;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
  medium: string;
  mediumEn: string;
  dimensions: string;
}

// P170 creator, P571 inception, P276 location / P195 collection, P625 coordinate, P18 image,
// P186 material used, P2048 height / P2049 width
export async function getArtworkDetail(qid: string): Promise<WikidataArtworkDetail> {
  const entities = await getEntities([qid]);
  const entity = entities[qid];
  const claims = entity?.claims;

  const creatorId = entityIdOf(claims, 'P170');
  const collectionId = entityIdOf(claims, 'P276') ?? entityIdOf(claims, 'P195');
  const materialIds = allEntityIdsOf(claims, 'P186');
  const heightQ = quantityOf(claims, 'P2048');
  const widthQ = quantityOf(claims, 'P2049');

  const refIds = [creatorId, collectionId, ...materialIds, heightQ?.unitId, widthQ?.unitId].filter(
    (v): v is string => !!v
  );
  const refs = await getEntities(refIds);

  const collectionEntity = collectionId ? refs[collectionId] : undefined;
  const medium = materialIds.map((id) => labelOf(refs[id])).filter(Boolean).join(', ');
  const mediumEn = materialIds.map((id) => labelEnOf(refs[id])).filter(Boolean).join(', ');

  let dimensions = '';
  if (widthQ && heightQ) {
    const unitId = heightQ.unitId ?? widthQ.unitId;
    const unitLabel = unitId ? (UNIT_ABBR[unitId] ?? labelOf(refs[unitId])) : '';
    dimensions = `${widthQ.amount} × ${heightQ.amount}${unitLabel ? ` ${unitLabel}` : ''}`;
  } else if (heightQ) {
    const unitLabel = heightQ.unitId ? (UNIT_ABBR[heightQ.unitId] ?? labelOf(refs[heightQ.unitId])) : '';
    dimensions = `${heightQ.amount}${unitLabel ? ` ${unitLabel}` : ''}`;
  }

  return {
    wikidataId: qid,
    title: labelOf(entity),
    titleEn: labelEnOf(entity),
    artistName: creatorId ? labelOf(refs[creatorId]) : '',
    artistNameEn: creatorId ? labelEnOf(refs[creatorId]) : '',
    year: yearOf(claims, 'P571'),
    collectionName: collectionId ? labelOf(collectionEntity) : '',
    collectionNameEn: collectionId ? labelEnOf(collectionEntity) : '',
    ...(coordinateOf(collectionEntity?.claims, 'P625') ?? { lat: null, lng: null }),
    imageUrl: imageUrlOf(claims),
    medium,
    mediumEn,
    dimensions,
  };
}

export interface WikidataArtistDetail {
  wikidataId: string;
  name: string;
  nameEn: string;
  bio: string;
  birthYear: number | null;
  deathYear: number | null;
  nationality: string;
  movement: string;
  imageUrl: string | null;
}

// P569 birth date, P570 death date, P27 citizenship, P135 movement, P18 image
export async function getArtistDetail(qid: string): Promise<WikidataArtistDetail> {
  const entities = await getEntities([qid]);
  const entity = entities[qid];
  const claims = entity?.claims;

  const nationalityId = entityIdOf(claims, 'P27');
  const movementId = entityIdOf(claims, 'P135');
  const refs = await getEntities([nationalityId, movementId].filter((v): v is string => !!v));

  return {
    wikidataId: qid,
    name: labelOf(entity),
    nameEn: labelEnOf(entity),
    bio: descriptionOf(entity),
    birthYear: yearOf(claims, 'P569'),
    deathYear: yearOf(claims, 'P570'),
    nationality: nationalityId ? labelOf(refs[nationalityId]) : '',
    movement: movementId ? labelOf(refs[movementId]) : '',
    imageUrl: imageUrlOf(claims),
  };
}
