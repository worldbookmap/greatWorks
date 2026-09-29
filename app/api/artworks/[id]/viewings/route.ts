import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { data, error } = await supabase
    .from('artwork_viewings')
    .select('*')
    .eq('artwork_id', id)
    .order('viewed_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });

  const { data, error } = await supabase
    .from('artwork_viewings')
    .insert({
      artwork_id: id,
      viewed_on: body.viewed_on || null,
      place: body.place ?? '',
      review: body.review ?? '',
      photo_urls: Array.isArray(body.photo_urls) ? body.photo_urls : [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
