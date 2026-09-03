// 테이트모던(Tate Modern) 소장품 검색 — 실시간 검색 API가 없어, 테이트가 공개한
// 정적 오픈데이터(github.com/tategallery/collection, CC0)를 내려받아 lib/data/tate-artworks.json으로
// 미리 정리해 두고 그 안에서 검색한다. 이 데이터셋은 2014년 이후 갱신되지 않아
// 소장품 제목/작가/연도/재료/크기는 그대로 신뢰할 수 있지만, 함께 있던 이미지 URL은
// 사이트 구조가 바뀌며 대부분 죽었다. 그래서 이미지만은 각 작품의 현재
// tate.org.uk 페이지를 선택 시 한 번 불러와 실제 대표 이미지(og:image)를 가져온다
// (그 페이지 자체가 사라졌거나 이미지가 없으면 이미지 없이 나머지 정보만 채운다).

import tateArtworksData from './data/tate-artworks.json';

const USER_AGENT = 'greatWorks-art-catalog/1.0';
const COLLECTION_NAME = '테이트모던';
// Tate Modern (Bankside, London) 위치 (소장처 좌표로 사용)
const LAT = 51.5076;
const LNG = -0.0994;

// [id, artist, title, dateText, medium, dimensions, url]
type TateRow = [string, string, string, string, string, string, string];

const ROWS = tateArtworksData as TateRow[];

let idIndex: Map<string, TateRow> | null = null;
function indexById(): Map<string, TateRow> {
  if (!idIndex) {
    idIndex = new Map(ROWS.map((row) => [row[0], row]));
  }
  return idIndex;
}

export interface TateSearchItem {
  id: string;
  label: string;
  description: string;
}

function yearOf(dateText: string): number | null {
  const match = dateText.match(/-?\d{3,4}/);
  return match ? Number(match[0]) : null;
}

// 표준 작품 정보 표기법: "작가명, <작품명>, 제작연도. 재료, 크기"
function citationOf(row: TateRow): { label: string; description: string } {
  const [, artist, title, dateText, medium, dimensions] = row;
  const label = [artist, `<${title}>`, dateText].filter(Boolean).join(', ');
  const description = [medium, dimensions].filter(Boolean).join(', ');
  return { label, description };
}

export function searchTateArtworks(query: string, limit = 5): TateSearchItem[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const matched: TateRow[] = [];
  for (const row of ROWS) {
    const haystack = `${row[1]} ${row[2]}`.toLowerCase();
    if (words.every((w) => haystack.includes(w))) {
      matched.push(row);
      if (matched.length >= limit) break;
    }
  }

  return matched.map((row) => ({ id: row[0], ...citationOf(row) }));
}

export interface TateArtworkDetail {
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

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return null;
    const html = await res.text();
    return /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function getTateArtworkDetail(id: string): Promise<TateArtworkDetail> {
  const row = indexById().get(id);
  if (!row) throw new Error('작품 정보를 찾을 수 없습니다.');

  const [, artist, title, dateText, medium, dimensions, url] = row;
  const year = yearOf(dateText);
  const imageUrl = url ? await fetchOgImage(url) : null;

  return {
    title,
    artistName: artist,
    year,
    yearDisplay: year != null ? '' : dateText,
    collectionName: COLLECTION_NAME,
    lat: LAT,
    lng: LNG,
    imageUrl,
    medium,
    dimensions,
  };
}
