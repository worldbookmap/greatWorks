import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { searchAllArtworkSources } from '@/lib/artworkSearch';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q) return NextResponse.json([]);

  const results = await searchAllArtworkSources(q);
  return NextResponse.json(results);
}
