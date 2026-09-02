// Wikipedia 검색: Wikidata에 항목이 없는 작품(신생/덜 알려진 작품)을 위한 보조 검색.
// Wikidata 구조화 데이터는 없지만 위키백과 문서(제목/설명/이미지)만 있는 경우를 보완한다.

const USER_AGENT = 'greatWorks-art-catalog/1.0';

export type WikipediaLang = 'ko' | 'en';

export interface WikipediaSearchItem {
  lang: WikipediaLang;
  title: string;
  snippet: string;
}

interface WikipediaSummary {
  title: string;
  extract?: string;
  thumbnail?: { source: string };
  originalimage?: { source: string };
}

async function wpFetch<T>(lang: WikipediaLang, params: Record<string, string>): Promise<T> {
  const url = `https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({ format: 'json', ...params }).toString()}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Wikipedia 요청에 실패했습니다 (${res.status}).`);
  return res.json();
}

async function searchLang(lang: WikipediaLang, query: string, limit: number): Promise<WikipediaSearchItem[]> {
  const data = await wpFetch<{ query?: { search?: { title: string; snippet: string }[] } }>(lang, {
    action: 'query',
    list: 'search',
    srnamespace: '0',
    srsearch: query,
    srlimit: String(limit),
  });
  return (data.query?.search ?? []).map((item) => ({
    lang,
    title: item.title,
    snippet: item.snippet.replace(/<[^>]+>/g, ''),
  }));
}

// 한국어 위키백과에서 먼저 찾고, 결과가 없으면 영문 위키백과로 폴백한다.
export async function searchWikipedia(query: string, limit = 8): Promise<WikipediaSearchItem[]> {
  const koResults = await searchLang('ko', query, limit);
  if (koResults.length > 0) return koResults;
  return searchLang('en', query, limit);
}

export interface WikipediaArtworkDetail {
  title: string;
  description: string;
  imageUrl: string | null;
}

export async function getWikipediaSummary(lang: WikipediaLang, title: string): Promise<WikipediaArtworkDetail> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Wikipedia 문서를 가져오지 못했습니다 (${res.status}).`);
  const data: WikipediaSummary = await res.json();
  return {
    title: data.title,
    description: data.extract ?? '',
    imageUrl: data.originalimage?.source ?? data.thumbnail?.source ?? null,
  };
}
