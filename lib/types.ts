export interface Artist {
  id: string;
  name: string;
  name_en: string;
  bio: string;
  birth_year: number | null;
  death_year: number | null;
  nationality: string;
  movement: string;
  image_url: string | null;
  wikidata_id: string | null;
  created_at: string;
}

export type RelationshipType =
  | '사제관계'
  | '동료'
  | '라이벌'
  | '영향을 받음'
  | '협업'
  | '가족'
  | '기타';

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  '사제관계',
  '동료',
  '라이벌',
  '영향을 받음',
  '협업',
  '가족',
  '기타',
];

export interface RelatedPerson {
  id: string;
  name: string;
  name_en: string;
  role: string; // 예: 배우자, 친구, 후원자
  image_url: string | null;
  created_at: string;
}

export interface PersonDetail extends RelatedPerson {
  relationships: ArtistRelationship[];
}

export interface ArtistRelationship {
  id: string;
  source_artist_id: string;
  target_artist_id: string | null;
  target_person_id: string | null;
  // "기타"를 고르고 직접 입력하면 그 문구가 그대로 저장되므로 고정된 7종 중
  // 하나가 아닐 수 있습니다.
  relationship_type: string;
  description: string;
  created_at: string;
  source?: Artist;
  target?: Artist;
  target_person?: RelatedPerson;
}

export interface Artwork {
  id: string;
  title: string;
  title_en: string;
  artist_id: string | null;
  year: number | null;
  year_display: string;
  collection_name: string;
  collection_name_en: string;
  collection_country: string;
  collection_city: string;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  description: string;
  medium: string;
  medium_en: string;
  dimensions: string;
  wikidata_id: string | null;
  created_at: string;
  updated_at: string;
  artist?: Artist;
}

export interface Annotation {
  id: string;
  artwork_id: string;
  x_pct: number;
  y_pct: number;
  text: string;
  created_at: string;
}

export interface ArtworkDetail extends Artwork {
  annotations: Annotation[];
}

export interface MindmapNode {
  id: string;
  type: 'artist' | 'artwork' | 'person';
  label: string;
  imageUrl?: string | null;
}

export interface MindmapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}
