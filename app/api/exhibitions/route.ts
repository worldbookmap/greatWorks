import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MAX_EXHIBITION_PHOTOS } from '@/lib/types';

export async function GET() {
  const { data, error } = await supabase
    .from('exhibition_reviews')
    .select('*')
    .order('visited_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    return NextResponse.json({ error: '전시회 타이틀은 필수입니다.' }, { status: 400 });
  }
  const photoUrls = Array.isArray(body.photo_urls) ? body.photo_urls : [];
  if (photoUrls.length > MAX_EXHIBITION_PHOTOS) {
    return NextResponse.json({ error: `사진은 최대 ${MAX_EXHIBITION_PHOTOS}장까지 저장할 수 있습니다.` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('exhibition_reviews')
    .insert({
      title: body.title.trim(),
      venue: body.venue ?? '',
      visited_on: body.visited_on || null,
      review: body.review ?? '',
      photo_urls: photoUrls,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
