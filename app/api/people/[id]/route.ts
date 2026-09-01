import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const [{ data: person, error: personError }, { data: relRows, error: relError }] = await Promise.all([
    supabase.from('related_people').select('*').eq('id', id).single(),
    supabase
      .from('artist_relationships')
      .select('*, source:artists!artist_relationships_source_artist_id_fkey(id,name)')
      .eq('target_person_id', id),
  ]);

  if (personError) return NextResponse.json({ error: personError.message }, { status: 404 });
  if (relError) return NextResponse.json({ error: relError.message }, { status: 500 });

  return NextResponse.json({ ...person, relationships: relRows ?? [] });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error } = await supabase.from('related_people').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
