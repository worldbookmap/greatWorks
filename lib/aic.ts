// 시카고 미술관(Art Institute of Chicago) Open API — 무료, 키 불필요.
// https://api.artic.edu/docs/

const USER_AGENT = 'greatWorks-art-catalog/1.0';
const API = 'https://api.artic.edu/api/v1';
const IIIF_URL = 'https://www.artic.edu/iiif/2';
const COLLECTION_NAME = '시카고 미술관';
// Art Institute of Chicago 위치 (소장처 좌표로 사용)
const LAT = 41.8796;
const LNG = -87.6237;

const FIELDS = 'id,title,artist_display,date_display,medium_display,dimensions,image_id';

interface AicRawArtwork {
  id: number;
  title: string;
  artist_display?: string;
  date_display?: string;
  medium_display?: string;
  dimensions?: string;
  image_id?: string | null;
}

async function aicFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${API}${path}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`시카고 미술관 요청에 실패했습니다 (${res.status}).`);
  return res.json();
}

function imageUrlOf(imageId?: string | null): string | null {
  return imageId ? `${IIIF_URL}/${imageId}/full/843,/0/default.jpg` : null;
}

// artist_display는 "작가명\n국적, 생몰년" 형식의 여러 줄 텍스트라 첫 줄만 취한다.
function artistNameOf(artistDisplay?: string): string {
  return (artistDisplay ?? '').split('\n')[0].trim();
}

function yearOf(dateDisplay?: string): number | null {
  const match = (dateDisplay ?? '').match(/-?\d{3,4}/);
  return match ? Number(match[0]) : null;
}

// 표준 작품 정보 표기법: "작가명, <작품명>, 제작연도. 재료, 크기"
function citationOf(a: AicRawArtwork): { label: string; description: string } {
  const artist = artistNameOf(a.artist_display);
  const label = [artist, `<${a.title}>`, a.date_display].filter(Boolean).join(', ');
  const description = [a.medium_display, a.dimensions].filter(Boolean).join(', ');
  return { label, description };
}

export interface AicSearchItem {
  id: number;
  label: string;
  description: string;
}

export async function searchAicArtworks(query: string, limit = 6): Promise<AicSearchItem[]> {
  const data = await aicFetch<{ data: AicRawArtwork[] }>('/artworks/search', {
    q: query,
    limit: String(limit),
    fields: FIELDS,
  });
  return data.data.map((a) => ({ id: a.id, ...citationOf(a) }));
}

export interface AicArtworkDetail {
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

export async function getAicArtworkDetail(id: string): Promise<AicArtworkDetail> {
  const data = await aicFetch<{ data: AicRawArtwork }>(`/artworks/${id}`, { fields: FIELDS });
  const a = data.data;
  return {
    title: a.title,
    artistName: artistNameOf(a.artist_display),
    year: yearOf(a.date_display),
    yearDisplay: a.date_display ?? '',
    collectionName: COLLECTION_NAME,
    lat: LAT,
    lng: LNG,
    imageUrl: imageUrlOf(a.image_id),
    medium: a.medium_display ?? '',
    dimensions: a.dimensions ?? '',
  };
}
