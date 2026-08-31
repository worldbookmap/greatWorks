import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const [{ data: artwork, error: artworkError }, { data: annotations, error: annotationsError }] = await Promise.all([
    supabase.from('artworks').select('*, artist:artists(*)').eq('id', id).single(),
    supabase.from('annotations').select('*').eq('artwork_id', id).order('created_at', { ascending: true }),
  ]);

  if (artworkError) return NextResponse.json({ error: artworkError.message }, { status: 404 });
  if (annotationsError) return NextResponse.json({ error: annotationsError.message }, { status: 500 });

  return NextResponse.json({ ...artwork, annotations: annotations ?? [] });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  for (const key of [
    'title',
    'artist_id',
    'year',
    'year_display',
    'collection_name',
    'collection_country',
    'collection_city',
    'lat',
    'lng',
    'image_url',
    'description',
    'medium',
    'dimensions',
    'wikidata_id',
  ] as const) {
    if (key in body) updates[key] = body[key];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from('artworks').update(updates).eq('id', id).select('*, artist:artists(*)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error } = await supabase.from('artworks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
