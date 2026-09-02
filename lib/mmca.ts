// 국립현대미술관(MMCA) 소장품 검색 — 비공식 내부 API.
// mmca.go.kr의 소장품 검색 페이지(collectionsList.do)가 자체적으로 호출하는
// AJAX/상세 엔드포인트를 그대로 사용한다. 공식 문서화된 오픈API가 아니므로
// 예고 없이 바뀌거나 막힐 수 있다 — 검색당 목록 1회, 선택 시 상세 1회만
// 호출해 일반 사용자가 브라우저로 검색하는 것과 비슷한 수준으로만 쓴다.

const USER_AGENT = 'greatWorks-art-catalog/1.0';
const LIST_URL = 'https://www.mmca.go.kr/collections/AjaxCollectionsList.do';
const DETAIL_URL = 'https://www.mmca.go.kr/collections/collectionsDetailPage.do';
const COLLECTION_NAME = '국립현대미술관';
// 국립현대미술관 서울관 위치 (소장처 좌표로 사용)
const LAT = 37.5795;
const LNG = 126.9803;

interface MmcaListItem {
  museumId: string;
  wrkinfoSeqno: number;
  artistnm: string;
  artistnmEng?: string;
  wrkNm: string;
  wrkNmEng?: string;
  wrkProdTermRangeTextKor?: string;
}

export interface MmcaSearchItem {
  id: string;
  label: string;
  description: string;
}

async function fetchListItems(searchText: string): Promise<MmcaListItem[]> {
  const res = await fetch(LIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8', 'User-Agent': USER_AGENT },
    body: new URLSearchParams({ searchText, pageIndex: '1' }),
  });
  if (!res.ok) throw new Error(`국립현대미술관 요청에 실패했습니다 (${res.status}).`);
  const data: { collectionsList?: MmcaListItem[] } = await res.json();
  return data.collectionsList ?? [];
}

// 표준 작품 정보 표기법: "작가명, <작품명>, 제작연도"
export async function searchMmcaArtworks(query: string, limit = 5): Promise<MmcaSearchItem[]> {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  // MMCA 자체 검색은 단어를 하나만 받아들이고, 공백으로 여러 단어를 함께
  // 넣으면(예: "이불 사이보그") 그대로 0건을 반환한다. 단어별로 따로 검색한 뒤
  // 모든 단어를 만족하는 항목만 남겨, "작가명 일부 + 작품명 일부" 조합도 찾히게 한다.
  const resultsPerWord = await Promise.all(words.map((w) => fetchListItems(w)));
  const [first, ...rest] = resultsPerWord;
  const restIdSets = rest.map((items) => new Set(items.map((i) => i.wrkinfoSeqno)));
  const merged = first.filter((item) => restIdSets.every((idSet) => idSet.has(item.wrkinfoSeqno)));

  return merged.slice(0, limit).map((i) => {
    const label = [i.artistnm, `<${i.wrkNm}>`, i.wrkProdTermRangeTextKor].filter(Boolean).join(', ');
    const description = [i.artistnmEng, i.wrkNmEng].filter(Boolean).join(' · ');
    return { id: `${i.museumId}-${i.wrkinfoSeqno}`, label, description };
  });
}

export interface MmcaArtworkDetail {
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
  description: string;
}

function fieldOf(html: string, label: string): string {
  const match = new RegExp(`<dt>\\s*${label}\\s*</dt>\\s*<dd[^>]*>([\\s\\S]*?)</dd>`).exec(html);
  if (!match) return '';
  return match[1]
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 작가명 dd는 "이불 LEE Bul"처럼 국문/영문이 붙어 있어, 대신 검색 링크의
// onclick 핸들러(fn_artistSearch('이불'))에서 국문 이름만 깔끔하게 뽑는다.
function artistNameOf(html: string): string {
  return /fn_artistSearch\('([^']*)'\)/.exec(html)?.[1] ?? '';
}

// 서버가 이미지 서비스/저작권 허용 여부를 이미 판단해 렌더링하므로,
// 그 판단을 다시 구현하지 않고 실제 렌더링된 이미지 태그가 있는지만 본다.
function imageUrlOf(html: string): string | null {
  return /src=['"](https:\/\/umss\.mmca\.go\.kr[^'"]*)['"]/.exec(html)?.[1] ?? null;
}

function yearOf(text: string): number | null {
  const match = text.match(/\d{3,4}/);
  return match ? Number(match[0]) : null;
}

// 본문에는 "<사이보그 W5>"처럼 이 앱의 작품명 표기(<작품명>)와 똑같은 모양의
// 텍스트도 등장하므로, 알려진 HTML 태그 이름만 제거해 작품명 표기는 건드리지 않는다.
const KNOWN_HTML_TAGS = /<\/?(?:p|br|b|i|strong|em|span|div|ul|ol|li|h[1-6])\s*\/?>/gi;

function descriptionOf(html: string): string {
  const match = /id="workInfoTextArea"[^>]*>([\s\S]*?)<\/div>/.exec(html);
  if (!match) return '';
  return match[1]
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(KNOWN_HTML_TAGS, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function getMmcaArtworkDetail(id: string): Promise<MmcaArtworkDetail> {
  const [museumId, wrkinfoSeqno] = id.split('-');
  if (!museumId || !wrkinfoSeqno) throw new Error('잘못된 작품 id입니다.');

  const res = await fetch(DETAIL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8', 'User-Agent': USER_AGENT },
    body: new URLSearchParams({ museumId, wrkinfoSeqno }),
  });
  if (!res.ok) throw new Error(`국립현대미술관 요청에 실패했습니다 (${res.status}).`);
  const html = await res.text();

  const yearText = fieldOf(html, '제작연도');
  const year = yearOf(yearText);

  return {
    title: fieldOf(html, '작품명'),
    artistName: artistNameOf(html),
    year,
    yearDisplay: year != null ? '' : yearText,
    collectionName: COLLECTION_NAME,
    lat: LAT,
    lng: LNG,
    imageUrl: imageUrlOf(html),
    medium: fieldOf(html, '재료'),
    dimensions: fieldOf(html, '규격'),
    description: descriptionOf(html),
  };
}
