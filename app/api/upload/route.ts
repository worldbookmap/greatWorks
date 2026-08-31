import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

const BUCKET = 'artwork-images';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB, 버킷 설정과 동일
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: '업로드할 이미지 파일이 없습니다.' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'PNG, JPEG, WEBP, GIF 이미지만 업로드할 수 있습니다.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: '이미지 용량은 10MB를 넘을 수 없습니다.' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, await file.arrayBuffer(), {
    contentType: file.type,
    cacheControl: '31536000',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
