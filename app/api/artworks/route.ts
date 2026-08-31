import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sanitizeSearchTerm } from '@/lib/search';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  const artistId = request.nextUrl.searchParams.get('artistId');

  let query = supabase
    .from('artworks')
    .select('*, artist:artists(*)')
    .order('created_at', { ascending: false });

  if (artistId) query = query.eq('artist_id', artistId);
  if (q) {
    const term = sanitizeSearchTerm(q);
    query = query.or(`title.ilike.%${term}%,collection_name.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const {
    title,
    artist_id,
    year,
    year_display,
    collection_name,
    collection_country,
    collection_city,
    lat,
    lng,
    image_url,
    description,
    wikidata_id,
  } = body ?? {};

  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title은 필수입니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('artworks')
    .insert({
      title,
      artist_id: artist_id || null,
      year: typeof year === 'number' ? year : null,
      year_display: year_display ?? '',
      collection_name: collection_name ?? '',
      collection_country: collection_country ?? '',
      collection_city: collection_city ?? '',
      lat: typeof lat === 'number' ? lat : null,
      lng: typeof lng === 'number' ? lng : null,
      image_url: image_url ?? null,
      description: description ?? '',
      wikidata_id: wikidata_id ?? null,
    })
    .select('*, artist:artists(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
