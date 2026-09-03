import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTateArtworkDetail } from '@/lib/tate';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const detail = await getTateArtworkDetail(id);
    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
