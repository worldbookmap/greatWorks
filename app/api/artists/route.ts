import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { toFuzzyIlikePattern } from '@/lib/search';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();

  let query = supabase.from('artists').select('*').order('name', { ascending: true });
  if (q) {
    const pattern = toFuzzyIlikePattern(q);
    query = query.or(`name.ilike.${pattern},nationality.ilike.${pattern},movement.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { name, name_en, bio, birth_year, death_year, nationality, movement, image_url, wikidata_id } = body ?? {};

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name은 필수입니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('artists')
    .insert({
      name,
      name_en: name_en ?? '',
      bio: bio ?? '',
      birth_year: typeof birth_year === 'number' ? birth_year : null,
      death_year: typeof death_year === 'number' ? death_year : null,
      nationality: nationality ?? '',
      movement: movement ?? '',
      image_url: image_url ?? null,
      wikidata_id: wikidata_id ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
