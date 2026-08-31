export interface PlaceSearchResult {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
}

interface NominatimSearchItem {
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
}

// OpenStreetMap Nominatim: 무료, 키 불필요. 사용 정책상 식별 가능한 User-Agent가 필요합니다.
// 소장처(박물관 등) 이름으로 좌표를 찾을 때 사용합니다.
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '6',
    'accept-language': 'ko',
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { 'User-Agent': 'greatWorks-art-catalog/1.0' },
  });

  if (!res.ok) {
    throw new Error(`장소 검색에 실패했습니다 (${res.status}).`);
  }

  const data: NominatimSearchItem[] = await res.json();
  return data
    .filter((item) => item.lat && item.lon)
    .map((item) => ({
      name: (item.name || item.display_name?.split(',')[0] || query).trim(),
      displayName: item.display_name ?? '',
      lat: Number(item.lat),
      lng: Number(item.lon),
    }));
}
