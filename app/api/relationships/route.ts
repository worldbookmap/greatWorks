import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { RELATIONSHIP_TYPES } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { source_artist_id, target_artist_id, target_person_id, relationship_type, description } = body ?? {};

  if (typeof source_artist_id !== 'string' || !source_artist_id) {
    return NextResponse.json({ error: 'source_artist_id는 필수입니다.' }, { status: 400 });
  }
  // 대상은 작가 또는 작가가 아닌 중간 인물(배우자, 친구 등) 중 하나여야 합니다.
  const hasArtistTarget = typeof target_artist_id === 'string' && target_artist_id.length > 0;
  const hasPersonTarget = typeof target_person_id === 'string' && target_person_id.length > 0;
  if (hasArtistTarget === hasPersonTarget) {
    return NextResponse.json({ error: 'target_artist_id 또는 target_person_id 중 하나만 지정해주세요.' }, { status: 400 });
  }
  if (hasArtistTarget && source_artist_id === target_artist_id) {
    return NextResponse.json({ error: '같은 작가를 연결할 수 없습니다.' }, { status: 400 });
  }

  const type = RELATIONSHIP_TYPES.includes(relationship_type) ? relationship_type : '기타';

  const { data, error } = await supabase
    .from('artist_relationships')
    .insert({
      source_artist_id,
      target_artist_id: hasArtistTarget ? target_artist_id : null,
      target_person_id: hasPersonTarget ? target_person_id : null,
      relationship_type: type,
      description: description ?? '',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
