import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { data, error } = await supabase
    .from('annotations')
    .select('*')
    .eq('artwork_id', id)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const { x_pct, y_pct, text } = body ?? {};

  if (typeof x_pct !== 'number' || typeof y_pct !== 'number') {
    return NextResponse.json({ error: 'x_pct, y_pct는 필수입니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('annotations')
    .insert({ artwork_id: id, x_pct, y_pct, text: text ?? '' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
