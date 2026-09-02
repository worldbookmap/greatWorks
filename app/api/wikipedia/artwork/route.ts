import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getWikipediaSummary, type WikipediaLang } from '@/lib/wikipedia';

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get('title')?.trim();
  const lang = request.nextUrl.searchParams.get('lang')?.trim();
  if (!title || (lang !== 'ko' && lang !== 'en')) {
    return NextResponse.json({ error: 'title과 lang(ko|en) 파라미터가 필요합니다.' }, { status: 400 });
  }

  try {
    const detail = await getWikipediaSummary(lang as WikipediaLang, title);
    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
