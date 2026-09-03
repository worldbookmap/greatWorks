// 작품 통합 검색: Wikidata + 시카고 미술관(AIC) + 메트로폴리탄 미술관(Met) + 국립현대미술관(MMCA)
// + 퐁피두 센터 + 내셔널 갤러리(런던) + 테이트모던을 동시에 검색해 하나의 표준 표기 목록으로 합친다.
//
// 루브르 박물관은 자체 검색을 프로그램으로 호출할 방법이 없어 뺐다 — 소장품 ID를 알면
// 상세 조회는 되지만 검색 페이지 자체가 봇 차단(429)에 막혀 있다. 테이트모던은 실시간
// 검색 API가 없어 lib/tate.ts에서 정적 오픈데이터를 대신 쓴다.

import { searchArtworks as searchWikidataArtworks } from './wikidata';
import { searchAicArtworks } from './aic';
import { searchMetArtworks } from './met';
import { searchMmcaArtworks } from './mmca';
import { searchPompidouArtworks } from './pompidou';
import { searchNationalGalleryArtworks } from './nationalgallery';
import { searchTateArtworks } from './tate';

export type ArtworkSource = 'wikidata' | 'aic' | 'met' | 'mmca' | 'pompidou' | 'nationalgallery' | 'tate';

export interface UnifiedArtworkSearchItem {
  source: ArtworkSource;
  id: string;
  label: string;
  description: string;
}

export async function searchAllArtworkSources(query: string): Promise<UnifiedArtworkSearchItem[]> {
  const [wikidata, aic, met, mmca, pompidou, nationalgallery] = await Promise.allSettled([
    searchWikidataArtworks(query, 6),
    searchAicArtworks(query, 5),
    searchMetArtworks(query, 5),
    searchMmcaArtworks(query, 5),
    searchPompidouArtworks(query, 5),
    searchNationalGalleryArtworks(query, 5),
  ]);

  const items: UnifiedArtworkSearchItem[] = [];
  if (wikidata.status === 'fulfilled') {
    items.push(...wikidata.value.map((i) => ({ source: 'wikidata' as const, id: i.id, label: i.label, description: i.description })));
  }
  if (mmca.status === 'fulfilled') {
    items.push(...mmca.value.map((i) => ({ source: 'mmca' as const, id: String(i.id), label: i.label, description: i.description })));
  }
  if (aic.status === 'fulfilled') {
    items.push(...aic.value.map((i) => ({ source: 'aic' as const, id: String(i.id), label: i.label, description: i.description })));
  }
  if (met.status === 'fulfilled') {
    items.push(...met.value.map((i) => ({ source: 'met' as const, id: String(i.id), label: i.label, description: i.description })));
  }
  if (pompidou.status === 'fulfilled') {
    items.push(...pompidou.value.map((i) => ({ source: 'pompidou' as const, id: String(i.id), label: i.label, description: i.description })));
  }
  if (nationalgallery.status === 'fulfilled') {
    items.push(...nationalgallery.value.map((i) => ({ source: 'nationalgallery' as const, id: String(i.id), label: i.label, description: i.description })));
  }

  // 테이트모던은 네트워크 호출 없이 미리 정리해 둔 정적 데이터에서 바로 검색한다.
  const tate = searchTateArtworks(query, 5);
  items.push(...tate.map((i) => ({ source: 'tate' as const, id: i.id, label: i.label, description: i.description })));

  return items;
}
