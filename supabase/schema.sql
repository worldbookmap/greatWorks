-- Supabase SQL Editor에서 실행하세요.

create extension if not exists pgcrypto;

create table if not exists artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text not null default '',
  birth_year integer,
  death_year integer,
  nationality text not null default '',
  movement text not null default '', -- 화파/사조
  image_url text,
  wikidata_id text,
  created_at timestamptz not null default now()
);

create table if not exists artist_relationships (
  id uuid primary key default gen_random_uuid(),
  source_artist_id uuid not null references artists(id) on delete cascade,
  target_artist_id uuid not null references artists(id) on delete cascade,
  relationship_type text not null default '기타', -- 사제관계/동료/라이벌/영향을 받음/협업/가족/기타
  description text not null default '',
  created_at timestamptz not null default now(),
  constraint artist_relationships_no_self check (source_artist_id <> target_artist_id)
);

create table if not exists artworks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist_id uuid references artists(id) on delete set null,
  year integer,
  year_display text not null default '', -- "c. 1503" 같은 비정형 표기용
  collection_name text not null default '', -- 소장처(예: 루브르 박물관)
  collection_country text not null default '',
  collection_city text not null default '',
  lat double precision,
  lng double precision,
  image_url text,
  description text not null default '',
  wikidata_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists annotations (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references artworks(id) on delete cascade,
  x_pct double precision not null, -- 작품 이미지 위 위치 (0~100)
  y_pct double precision not null,
  text text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists artworks_artist_id_idx on artworks(artist_id);
create index if not exists annotations_artwork_id_idx on annotations(artwork_id);
create index if not exists artist_relationships_source_idx on artist_relationships(source_artist_id);
create index if not exists artist_relationships_target_idx on artist_relationships(target_artist_id);
