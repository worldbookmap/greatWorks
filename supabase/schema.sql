-- Supabase SQL Editor에서 실행하세요.

create extension if not exists pgcrypto;

create table if not exists artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text not null default '', -- 영문 이름
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
  target_artist_id uuid references artists(id) on delete cascade,
  relationship_type text not null default '기타', -- 사제관계/동료/라이벌/영향을 받음/협업/가족/기타
  description text not null default '',
  created_at timestamptz not null default now()
);

-- 작가가 아닌 중간 인물(배우자, 친구, 후원자 등)을 관계 대상으로 등록하기 위한 테이블.
create table if not exists related_people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text not null default '',
  role text not null default '', -- 예: 배우자, 친구, 후원자
  image_url text,
  created_at timestamptz not null default now()
);

-- 기존에 만든 테이블에도 반영되도록 (이미 있으면 무시됨)
alter table artist_relationships alter column target_artist_id drop not null;
alter table artist_relationships add column if not exists target_person_id uuid references related_people(id) on delete cascade;

-- 대상은 작가 또는 인물 중 하나만 가리켜야 하고, 작가끼리는 서로 달라야 합니다.
alter table artist_relationships drop constraint if exists artist_relationships_no_self;
alter table artist_relationships add constraint artist_relationships_no_self check (
  target_artist_id is null or source_artist_id <> target_artist_id
);
alter table artist_relationships drop constraint if exists artist_relationships_target_one_end;
alter table artist_relationships add constraint artist_relationships_target_one_end check (
  (target_artist_id is not null) <> (target_person_id is not null)
);

create table if not exists artworks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_en text not null default '', -- 영문 작품명
  artist_id uuid references artists(id) on delete set null,
  year integer,
  year_display text not null default '', -- "c. 1503" 같은 비정형 표기용
  collection_name text not null default '', -- 소장처(예: 루브르 박물관)
  collection_name_en text not null default '', -- 영문 소장처
  collection_country text not null default '',
  collection_city text not null default '',
  lat double precision,
  lng double precision,
  image_url text,
  description text not null default '',
  medium text not null default '', -- 재료/기법 (예: 캔버스에 유채)
  medium_en text not null default '', -- 영문 재료/기법
  dimensions text not null default '', -- 크기 (예: 73.7 × 92.1 cm)
  wikidata_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 기존에 만든 테이블에도 반영되도록 (이미 있으면 무시됨)
alter table artworks add column if not exists medium text not null default '';
alter table artworks add column if not exists dimensions text not null default '';
alter table artworks add column if not exists title_en text not null default '';
alter table artworks add column if not exists collection_name_en text not null default '';
alter table artworks add column if not exists medium_en text not null default '';
alter table artists add column if not exists name_en text not null default '';

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
create index if not exists artist_relationships_target_person_idx on artist_relationships(target_person_id);
