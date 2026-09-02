// 메트로폴리탄 미술관(The Met) Open Access API — 무료, 키 불필요.
// https://metmuseum.github.io/

const USER_AGENT = 'greatWorks-art-catalog/1.0';
const API = 'https://collectionapi.metmuseum.org/public/collection/v1';
const COLLECTION_NAME = '메트로폴리탄 미술관';
// The Met (Fifth Avenue) 위치 (소장처 좌표로 사용)
const LAT = 40.7794;
const LNG = -73.9632;

interface MetObject {
  objectID: number;
  title: string;
  artistDisplayName?: string;
  objectDate?: string;
  medium?: string;
  dimensions?: string;
  primaryImage?: string;
  primaryImageSmall?: string;
}

async function metFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`메트로폴리탄 미술관 요청에 실패했습니다 (${res.status}).`);
  return res.json();
}

function yearOf(objectDate?: string): number | null {
  const match = (objectDate ?? '').match(/-?\d{3,4}/);
  return match ? Number(match[0]) : null;
}

// 표준 작품 정보 표기법: "작가명, <작품명>, 제작연도. 재료, 크기"
function citationOf(o: MetObject): { label: string; description: string } {
  const label = [o.artistDisplayName, `<${o.title}>`, o.objectDate].filter(Boolean).join(', ');
  const description = [o.medium, o.dimensions].filter(Boolean).join(', ');
  return { label, description };
}

export interface MetSearchItem {
  id: number;
  label: string;
  description: string;
}

// Met 검색 API는 objectID 목록만 반환하므로, 상위 결과만 상세 조회해 조합한다.
export async function searchMetArtworks(query: string, limit = 5): Promise<MetSearchItem[]> {
  const search = await metFetch<{ objectIDs: number[] | null }>(
    `/search?hasImages=true&q=${encodeURIComponent(query)}`
  );
  const ids = (search.objectIDs ?? []).slice(0, limit);
  const objects = await Promise.all(
    ids.map((id) =>
      metFetch<MetObject>(`/objects/${id}`).catch(() => null)
    )
  );
  return objects
    .filter((o): o is MetObject => !!o?.title)
    .map((o) => ({ id: o.objectID, ...citationOf(o) }));
}

export interface MetArtworkDetail {
  title: string;
  artistName: string;
  year: number | null;
  yearDisplay: string;
  collectionName: string;
  lat: number;
  lng: number;
  imageUrl: string | null;
  medium: string;
  dimensions: string;
}

export async function getMetArtworkDetail(id: string): Promise<MetArtworkDetail> {
  const o = await metFetch<MetObject>(`/objects/${id}`);
  return {
    title: o.title,
    artistName: o.artistDisplayName ?? '',
    year: yearOf(o.objectDate),
    yearDisplay: o.objectDate ?? '',
    collectionName: COLLECTION_NAME,
    lat: LAT,
    lng: LNG,
    imageUrl: o.primaryImage || o.primaryImageSmall || null,
    medium: o.medium ?? '',
    dimensions: o.dimensions ?? '',
  };
}
