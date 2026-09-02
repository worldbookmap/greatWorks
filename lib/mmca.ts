// 국립현대미술관 저작권 소멸 소장품 — 문화공공데이터광장(KCISA) Open API.
// https://api.kcisa.kr/openapi/service/rest/meta10/get20150041
// 인증키가 필요하다 (환경변수 KCISA_API_KEY, https://www.culture.go.kr/data 에서 발급).
//
// 이 데이터셋은 저작권이 소멸된 소장품(약 110여 건)만 다루는 소규모 세트라,
// 검색 API 없이 전체 목록을 한 번에 받아 서버 메모리에서 필터링한다.
// 작가명/제작연도/재료/크기 같은 구조화 필드가 따로 없어 URL의 artistnm 파라미터와
// 설명문에서 최대한 추출하고, 못 찾으면 비워둔 채 사용자가 직접 입력하도록 한다.

const API = 'https://api.kcisa.kr/openapi/service/rest/meta10/get20150041';
const COLLECTION_NAME = '국립현대미술관';
// 국립현대미술관 서울관 위치 (소장처 좌표로 사용)
const LAT = 37.5795;
const LNG = 126.9803;

interface MmcaRawItem {
  title: string;
  description: string;
  url: string;
}

let cache: { items: MmcaRawItem[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

function extractTag(block: string, tag: string): string {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block);
  return match ? decodeXmlEntities(match[1]).trim() : '';
}

// description에는 <p>, <br> 같은 HTML 태그가 섞여 있는데, 본문에는 "<산수>"처럼
// 이 앱의 작품명 표기(<작품명>)와 똑같은 모양의 텍스트도 등장한다. 알려진 HTML 태그
// 이름만 제거해 실제 작품명 표기는 건드리지 않는다.
const KNOWN_HTML_TAGS = /&lt;\/?(?:p|br|b|i|strong|em|span|div|ul|ol|li|h[1-6])\s*\/?&gt;/gi;

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;br\s*\/?&gt;/gi, '\n')
    .replace(/&lt;\/p&gt;/gi, '\n\n')
    .replace(KNOWN_HTML_TAGS, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchAllItems(): Promise<MmcaRawItem[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.items;

  const apiKey = process.env.KCISA_API_KEY;
  if (!apiKey) throw new Error('국립현대미술관 검색을 사용하려면 KCISA_API_KEY 설정이 필요합니다.');

  const url = `${API}?serviceKey=${encodeURIComponent(apiKey)}&numOfRows=300&pageNo=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`국립현대미술관 요청에 실패했습니다 (${res.status}).`);
  const xml = await res.text();

  const items: MmcaRawItem[] = [];
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const block of itemBlocks) {
    items.push({
      title: extractTag(block, 'title'),
      description: extractTag(block, 'description'),
      url: extractTag(block, 'url'),
    });
  }
  cache = { items, fetchedAt: Date.now() };
  return items;
}

function artistNameOf(url: string): string {
  try {
    return new URL(url).searchParams.get('artistnm') ?? '';
  } catch {
    return '';
  }
}

function idOf(url: string): string {
  try {
    return new URL(url).searchParams.get('wrkinfoSeqno') ?? url;
  } catch {
    return url;
  }
}

export interface MmcaSearchItem {
  id: string;
  label: string;
  description: string;
}

// 설명문은 작가 약력과 작품 해설이 뒤섞인 산문이라, 등장하는 연도가 반드시 제작연도라는
// 보장이 없다(예: "1918년에 협회 회원으로 활동을 시작했다"는 작가 이력이지 제작연도가 아님).
// 잘못된 연도를 자동으로 채우는 위험을 피하기 위해 연도는 추출하지 않고, 설명 전문을
// description에 그대로 담아 사용자가 읽고 직접 입력하도록 한다.
export async function searchMmcaArtworks(query: string, limit = 5): Promise<MmcaSearchItem[]> {
  const items = await fetchAllItems();
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matched = items.filter(
    (i) => i.title.toLowerCase().includes(q) || artistNameOf(i.url).toLowerCase().includes(q)
  );

  // 표준 작품 정보 표기법: "작가명, <작품명>"
  return matched.slice(0, limit).map((i) => {
    const artist = artistNameOf(i.url);
    const label = [artist, `<${i.title}>`].filter(Boolean).join(', ');
    const shortDescription = i.description.split('\n')[0].slice(0, 90);
    return { id: idOf(i.url), label, description: shortDescription };
  });
}

export interface MmcaArtworkDetail {
  title: string;
  artistName: string;
  collectionName: string;
  lat: number;
  lng: number;
  description: string;
}

export async function getMmcaArtworkDetail(id: string): Promise<MmcaArtworkDetail> {
  const items = await fetchAllItems();
  const item = items.find((i) => idOf(i.url) === id);
  if (!item) throw new Error('작품 정보를 찾을 수 없습니다.');

  return {
    title: item.title,
    artistName: artistNameOf(item.url),
    collectionName: COLLECTION_NAME,
    lat: LAT,
    lng: LNG,
    description: item.description,
  };
}
