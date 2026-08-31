import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { MindmapEdge, MindmapNode } from '@/lib/types';

export async function GET() {
  const [{ data: artists, error: artistErr }, { data: artworks, error: artworkErr }, { data: relationships, error: relErr }] =
    await Promise.all([
      supabase.from('artists').select('id, name, image_url'),
      supabase.from('artworks').select('id, title, artist_id, image_url'),
      supabase.from('artist_relationships').select('id, source_artist_id, target_artist_id, relationship_type'),
    ]);

  const error = artistErr || artworkErr || relErr;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const nodes: MindmapNode[] = [
    ...(artists ?? []).map((a) => ({ id: `artist:${a.id}`, type: 'artist' as const, label: a.name, imageUrl: a.image_url })),
    ...(artworks ?? []).map((w) => ({ id: `artwork:${w.id}`, type: 'artwork' as const, label: w.title, imageUrl: w.image_url })),
  ];

  const edges: MindmapEdge[] = [
    ...(artworks ?? [])
      .filter((w) => w.artist_id)
      .map((w) => ({ id: `artist-artwork:${w.id}`, source: `artist:${w.artist_id}`, target: `artwork:${w.id}` })),
    ...(relationships ?? []).map((r) => ({
      id: `rel:${r.id}`,
      source: `artist:${r.source_artist_id}`,
      target: `artist:${r.target_artist_id}`,
      label: r.relationship_type,
    })),
  ];

  return NextResponse.json({ nodes, edges });
}
