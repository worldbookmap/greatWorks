// 영국 내셔널 갤러리(National Gallery, London) 소장품 검색 — 비공식 내부 엔드포인트.
// nationalgallery.org.uk의 소장품 검색 페이지(explore-the-collection)가 자체적으로
// 호출하는 AJAX 검색을 그대로 사용한다. JSON이 아닌 HTML 조각을 돌려주므로
// 필요한 필드만 정규식으로 뽑아 쓴다. 공식 오픈API가 아니므로 예고 없이
// 바뀌거나 막힐 수 있다 — 검색당 목록 1회, 선택 시 상세 1회만 호출해
// 일반 사용자가 브라우저로 검색하는 것과 비슷한 수준으로만 쓴다.

const USER_AGENT = 'greatWorks-art-catalog/1.0';
const BASE_URL = 'https://www.nationalgallery.org.uk';
const SEARCH_URL = `${BASE_URL}/paintings/explore-the-collection`;
const COLLECTION_NAME = '내셔널 갤러리 (런던)';
// National Gallery, London (Trafalgar Square) 위치 (소장처 좌표로 사용)
const LAT = 51.5089;
const LNG = -0.1283;

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(s: string): string {
  return decodeHtmlEntities(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

// 이 사이트의 AJAX 검색은 최초 GET에서 발급된 세션 쿠키가 있어야 응답한다.
async function fetchSessionCookie(query: string): Promise<string> {
  const res = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  return res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
}

interface NgListItem {
  slug: string;
  title: string;
  artistName: string;
  dateDisplay: string;
  imageUrl: string | null;
}

async function fetchListItems(query: string, limit: number): Promise<NgListItem[]> {
  const cookie = await fetchSessionCookie(query);
  const res = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(query)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': USER_AGENT,
      Cookie: cookie,
    },
    body: new URLSearchParams({ q: query, sfi: '', swo: '', ob: 'Random', obiuc: '0', fi: '1', la: '30', viids: '' }),
  });
  if (!res.ok) throw new Error(`내셔널 갤러리 요청에 실패했습니다 (${res.status}).`);
  const html = await res.text();

  const items: NgListItem[] = [];
  const blockRe = /<li class="search-result"[\s\S]*?<\/li>/g;
  let block: RegExpExecArray | null;
  while ((block = blockRe.exec(html)) && items.length < limit) {
    const b = block[0];
    const href = /<div class="title">\s*<a href="([^"]+)"/.exec(b)?.[1];
    const title = /<div class="title">\s*<a[^>]*>([\s\S]*?)<\/a>/.exec(b)?.[1];
    const artistName = /Artist:<\/span>\s*<a[^>]*>([\s\S]*?)<\/a>/.exec(b)?.[1];
    const dateDisplay = /Date made:<\/span>\s*([^<]*)/.exec(b)?.[1];
    const imagePath = /data-square-image-url="([^"]+)"/.exec(b)?.[1];
    if (!href || !title) continue;

    const slug = href.replace(/^\/paintings\//, '');
    items.push({
      slug,
      title: stripTags(title),
      artistName: artistName ? stripTags(artistName) : '',
      dateDisplay: dateDisplay ? stripTags(dateDisplay) : '',
      imageUrl: imagePath ? `${BASE_URL}${decodeHtmlEntities(imagePath)}` : null,
    });
  }
  return items;
}

function yearOf(dateDisplay: string): number | null {
  const match = dateDisplay.match(/-?\d{3,4}/);
  return match ? Number(match[0]) : null;
}

// 표준 작품 정보 표기법: "작가명, <작품명>, 제작연도"
function citationOf(item: NgListItem): { label: string; description: string } {
  const label = [item.artistName, `<${item.title}>`, item.dateDisplay].filter(Boolean).join(', ');
  return { label, description: '' };
}

export interface NationalGallerySearchItem {
  id: string;
  label: string;
  description: string;
}

export async function searchNationalGalleryArtworks(query: string, limit = 5): Promise<NationalGallerySearchItem[]> {
  const items = await fetchListItems(query, limit);
  return items.map((item) => ({ id: item.slug, ...citationOf(item) }));
}

function fieldOf(html: string, label: string): string {
  const match = new RegExp(`<dt[^>]*>\\s*${label}\\s*</dt>\\s*<dd[^>]*>([\\s\\S]*?)</dd>`).exec(html);
  return match ? stripTags(match[1]) : '';
}

export interface NationalGalleryArtworkDetail {
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

export async function getNationalGalleryArtworkDetail(slug: string): Promise<NationalGalleryArtworkDetail> {
  const res = await fetch(`${BASE_URL}/paintings/${slug}`, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`내셔널 갤러리 요청에 실패했습니다 (${res.status}).`);
  const html = await res.text();

  const title = fieldOf(html, 'Full title') || fieldOf(html, 'Title');
  const artistName = fieldOf(html, 'Artist');
  const dateDisplay = fieldOf(html, 'Date made');
  const year = yearOf(dateDisplay);
  const imagePath = /<meta name="thumbnail" content="([^"]+)"/.exec(html)?.[1];

  return {
    title,
    artistName,
    year,
    yearDisplay: year != null ? '' : dateDisplay,
    collectionName: COLLECTION_NAME,
    lat: LAT,
    lng: LNG,
    imageUrl: imagePath ? `${BASE_URL}${decodeHtmlEntities(imagePath)}` : null,
    medium: fieldOf(html, 'Medium and support'),
    dimensions: fieldOf(html, 'Dimensions'),
  };
}
