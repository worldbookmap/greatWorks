import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const [{ data: artist, error: artistError }, { data: artworks, error: artworksError }, { data: relRows, error: relError }] =
    await Promise.all([
      supabase.from('artists').select('*').eq('id', id).single(),
      supabase.from('artworks').select('*').eq('artist_id', id).order('year', { ascending: true }),
      supabase
        .from('artist_relationships')
        .select('*, source:artists!artist_relationships_source_artist_id_fkey(id,name), target:artists!artist_relationships_target_artist_id_fkey(id,name)')
        .or(`source_artist_id.eq.${id},target_artist_id.eq.${id}`),
    ]);

  if (artistError) return NextResponse.json({ error: artistError.message }, { status: 404 });
  if (artworksError) return NextResponse.json({ error: artworksError.message }, { status: 500 });
  if (relError) return NextResponse.json({ error: relError.message }, { status: 500 });

  return NextResponse.json({ ...artist, artworks: artworks ?? [], relationships: relRows ?? [] });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  for (const key of ['name', 'name_en', 'bio', 'birth_year', 'death_year', 'nationality', 'movement', 'image_url', 'wikidata_id'] as const) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabase.from('artists').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error } = await supabase.from('artists').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
