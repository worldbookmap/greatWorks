// 작품 통합 검색: Wikidata + 시카고 미술관(AIC) + 메트로폴리탄 미술관(Met) + 국립현대미술관(MMCA)을
// 동시에 검색해 하나의 표준 표기 목록으로 합친다.

import { searchArtworks as searchWikidataArtworks } from './wikidata';
import { searchAicArtworks } from './aic';
import { searchMetArtworks } from './met';
import { searchMmcaArtworks } from './mmca';

export type ArtworkSource = 'wikidata' | 'aic' | 'met' | 'mmca';

export interface UnifiedArtworkSearchItem {
  source: ArtworkSource;
  id: string;
  label: string;
  description: string;
}

export async function searchAllArtworkSources(query: string): Promise<UnifiedArtworkSearchItem[]> {
  const [wikidata, aic, met, mmca] = await Promise.allSettled([
    searchWikidataArtworks(query, 6),
    searchAicArtworks(query, 5),
    searchMetArtworks(query, 5),
    searchMmcaArtworks(query, 5),
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
  return items;
}
