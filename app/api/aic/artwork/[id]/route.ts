import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAicArtworkDetail } from '@/lib/aic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const detail = await getAicArtworkDetail(id);
    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
