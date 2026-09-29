import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MAX_EXHIBITION_PHOTOS } from '@/lib/types';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  for (const key of ['title', 'venue', 'visited_on', 'review', 'photo_urls'] as const) {
    if (key in body) updates[key] = body[key];
  }
  if ('title' in updates && !String(updates.title ?? '').trim()) {
    return NextResponse.json({ error: '전시회 타이틀은 필수입니다.' }, { status: 400 });
  }
  if (Array.isArray(updates.photo_urls) && updates.photo_urls.length > MAX_EXHIBITION_PHOTOS) {
    return NextResponse.json({ error: `사진은 최대 ${MAX_EXHIBITION_PHOTOS}장까지 저장할 수 있습니다.` }, { status: 400 });
  }
  if ('visited_on' in updates && !updates.visited_on) updates.visited_on = null;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from('exhibition_reviews').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error } = await supabase.from('exhibition_reviews').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
