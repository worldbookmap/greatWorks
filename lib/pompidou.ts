// 퐁피두 센터(Centre Pompidou) 소장품 검색 — 비공식 내부 API.
// 소장품 검색 사이트(collection.centrepompidou.fr, "Navigart" 플랫폼)가
// 자체적으로 호출하는 AJAX 엔드포인트를 그대로 사용한다. 공식 문서화된
// 오픈API가 아니므로 예고 없이 바뀌거나 막힐 수 있다.
//
// q= 자유 텍스트 검색은 서지사항(bibliography) 같은 무관한 필드까지 뒤져
// 관련 없는 결과가 많이 섞여 나온다(예: "kandinsky" 검색 시 상위 결과 대부분이
// 다른 작가 작품의 참고문헌 각주에 "Kandinsky"가 언급된 경우). 넉넉히 가져온 뒤
// 제목/작가명에 검색어의 모든 단어가 실제로 포함된 것만 남겨 정확도를 높인다.

const USER_AGENT = 'greatWorks-art-catalog/1.0';
const API = 'https://api.navigart.fr/15/artworks';
const COLLECTION_NAME = '퐁피두 센터';
// Centre Pompidou 위치 (소장처 좌표로 사용)
const LAT = 48.8607;
const LNG = 2.3522;

// 넉넉히 가져와야 제목/작가명 필터를 통과하는 결과가 남는다 (위 설명 참고).
const FETCH_SIZE = 100;

interface PompidouArtwork {
  _id: string;
  title_notice?: string;
  authors_notice?: string;
  date_creation?: string;
  dimensions?: string;
  domain?: string;
  domain_denomination?: string;
  mst?: string;
  medias?: { file_name: string; url_template: string }[];
}

interface PompidouListResponse {
  results?: { _source: { ua: { artwork: PompidouArtwork } } }[];
}

interface PompidouDetailResponse {
  results?: { _source: { ua: { artwork: PompidouArtwork } } }[];
}

async function pompidouFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`퐁피두 센터 요청에 실패했습니다 (${res.status}).`);
  return res.json();
}

function imageUrlOf(medias?: { file_name: string; url_template: string }[]): string | null {
  const media = medias?.[0];
  if (!media) return null;
  return media.url_template.replace('{size}', '800').replace('{file_name}', media.file_name);
}

function yearOf(dateCreation?: string): number | null {
  const match = (dateCreation ?? '').match(/-?\d{3,4}/);
  return match ? Number(match[0]) : null;
}

// 표준 작품 정보 표기법: "작가명, <작품명>, 제작연도. 재료, 크기"
function citationOf(a: PompidouArtwork): { label: string; description: string } {
  const label = [a.authors_notice, `<${a.title_notice}>`, a.date_creation].filter(Boolean).join(', ');
  const description = [a.mst || a.domain_denomination || a.domain, a.dimensions].filter(Boolean).join(', ');
  return { label, description };
}

export interface PompidouSearchItem {
  id: string;
  label: string;
  description: string;
}

export async function searchPompidouArtworks(query: string, limit = 5): Promise<PompidouSearchItem[]> {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const data = await pompidouFetch<PompidouListResponse>(`?size=${FETCH_SIZE}&q=${encodeURIComponent(query)}`);
  const artworks = (data.results ?? []).map((r) => r._source.ua.artwork).filter((a) => a.title_notice);

  const matched = artworks.filter((a) => {
    const haystack = `${a.title_notice ?? ''} ${a.authors_notice ?? ''}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });

  return matched.slice(0, limit).map((a) => ({ id: a._id, ...citationOf(a) }));
}

export interface PompidouArtworkDetail {
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

export async function getPompidouArtworkDetail(id: string): Promise<PompidouArtworkDetail> {
  const data = await pompidouFetch<PompidouDetailResponse>(`/${id}`);
  const a = data.results?.[0]?._source.ua.artwork;
  if (!a) throw new Error('작품 정보를 찾을 수 없습니다.');

  const year = yearOf(a.date_creation);
  return {
    title: a.title_notice ?? '',
    artistName: a.authors_notice ?? '',
    year,
    yearDisplay: year != null ? '' : (a.date_creation ?? ''),
    collectionName: COLLECTION_NAME,
    lat: LAT,
    lng: LNG,
    imageUrl: imageUrlOf(a.medias),
    medium: a.mst || a.domain_denomination || a.domain || '',
    dimensions: a.dimensions ?? '',
  };
}
