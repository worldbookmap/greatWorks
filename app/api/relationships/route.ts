import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { RELATIONSHIP_TYPES } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { source_artist_id, target_artist_id, relationship_type, description } = body ?? {};

  if (typeof source_artist_id !== 'string' || typeof target_artist_id !== 'string' || !source_artist_id || !target_artist_id) {
    return NextResponse.json({ error: 'source_artist_id, target_artist_id는 필수입니다.' }, { status: 400 });
  }
  if (source_artist_id === target_artist_id) {
    return NextResponse.json({ error: '같은 작가를 연결할 수 없습니다.' }, { status: 400 });
  }

  const type = RELATIONSHIP_TYPES.includes(relationship_type) ? relationship_type : '기타';

  const { data, error } = await supabase
    .from('artist_relationships')
    .insert({ source_artist_id, target_artist_id, relationship_type: type, description: description ?? '' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
