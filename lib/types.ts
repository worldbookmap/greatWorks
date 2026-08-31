export interface Artist {
  id: string;
  name: string;
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

export interface ArtistRelationship {
  id: string;
  source_artist_id: string;
  target_artist_id: string;
  relationship_type: RelationshipType;
  description: string;
  created_at: string;
  source?: Artist;
  target?: Artist;
}

export interface Artwork {
  id: string;
  title: string;
  artist_id: string | null;
  year: number | null;
  year_display: string;
  collection_name: string;
  collection_country: string;
  collection_city: string;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  description: string;
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
  type: 'artist' | 'artwork';
  label: string;
  imageUrl?: string | null;
}

export interface MindmapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}
