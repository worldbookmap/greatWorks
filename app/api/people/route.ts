import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase.from('related_people').select('*').order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { name, name_en, role, image_url } = body ?? {};

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name은 필수입니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('related_people')
    .insert({
      name,
      name_en: name_en ?? '',
      role: role ?? '',
      image_url: image_url ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
