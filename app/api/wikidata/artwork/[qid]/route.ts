import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getArtworkDetail } from '@/lib/wikidata';

type Params = { params: Promise<{ qid: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { qid } = await params;
  try {
    const detail = await getArtworkDetail(qid);
    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
