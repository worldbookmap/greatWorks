'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { ImageOff, MapPin } from 'lucide-react';
import type { Artwork } from '@/lib/types';
import { ArtworkModal } from '@/components/artworks/ArtworkModal';
import { ArtworkDetailModal } from '@/components/artworks/ArtworkDetailModal';
import { RemoteThumbnail } from '@/components/ui/RemoteThumbnail';

// Default Leaflet marker icons reference asset paths that break under bundlers;
// point them at the CDN copies instead of shipping/aliasing the PNGs ourselves.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface ArtworkPoint {
  key: string;
  lat: number;
  lng: number;
  locationLabel: string;
  locationSubLabel: string;
  artworks: Artwork[];
}

// 같은 위치로 묶인 작품들의 소장처 표기가 다를 수 있어(번역 누락 등),
// 그중 가장 먼저 채워진 값을 대표로 사용한다.
function firstNonEmpty(artworks: Artwork[], pick: (a: Artwork) => string) {
  for (const art of artworks) {
    const value = pick(art).trim();
    if (value) return value;
  }
  return '';
}

export function ArtMapView() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [detailArtworkId, setDetailArtworkId] = useState<string | null>(null);
  const [editArtworkId, setEditArtworkId] = useState<string | null>(null);

  const loadArtworks = async () => {
    const res = await fetch('/api/artworks');
    if (res.ok) setArtworks(await res.json());
  };

  useEffect(() => {
    loadArtworks();
  }, []);

  const located = artworks.filter((a) => a.lat != null && a.lng != null);

  // 같은 위치(소장처)의 작품을 하나의 포인트로 묶습니다.
  const points: ArtworkPoint[] = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number; artworks: Artwork[] }>();
    for (const art of located) {
      const key = `${(art.lat as number).toFixed(3)},${(art.lng as number).toFixed(3)}`;
      const existing = map.get(key);
      if (existing) existing.artworks.push(art);
      else map.set(key, { lat: art.lat as number, lng: art.lng as number, artworks: [art] });
    }
    return Array.from(map.entries()).map(([key, { lat, lng, artworks }]) => {
      const collectionName = firstNonEmpty(artworks, (a) => a.collection_name);
      const city = firstNonEmpty(artworks, (a) => a.collection_city);
      const country = firstNonEmpty(artworks, (a) => a.collection_country);
      return {
        key,
        lat,
        lng,
        locationLabel: collectionName || '소장처 미상',
        locationSubLabel: [city, country].filter(Boolean).join(', '),
        artworks,
      };
    });
  }, [located]);

  return (
    <div className="relative flex-1">
      <MapContainer center={[30, 10]} zoom={3} className="absolute inset-0">
        <TileLayer
          attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        />
        {points.map((point) => (
          <Marker key={point.key} position={[point.lat, point.lng]}>
            <Popup>
              <div className="w-56">
                <p className="mb-0.5 flex items-center gap-1 text-[13px] font-semibold text-[#2a231c]">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-accent-strong" strokeWidth={2.25} />
                  <span className="truncate">{point.locationLabel}</span>
                </p>
                <p className="mb-1.5 truncate text-[11px] text-[#8a8074]">
                  {point.locationSubLabel && `${point.locationSubLabel} · `}
                  작품 {point.artworks.length}점
                </p>
                <ul className="max-h-56 space-y-0.5 overflow-y-auto">
                  {point.artworks.map((art) => (
                    <li key={art.id}>
                      <button
                        onClick={() => setDetailArtworkId(art.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-accent/10 active:scale-[0.97]"
                      >
                        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/[0.05]">
                          {art.image_url ? (
                            <RemoteThumbnail src={art.image_url} alt="" sizes="32px" className="object-cover" />
                          ) : (
                            <ImageOff className="h-3.5 w-3.5 text-[#c9beae]" strokeWidth={1.5} />
                          )}
                        </div>
                        <span className="min-w-0 truncate text-[12.5px] text-[#2a231c]">
                          {art.artist?.name ?? '작가 미상'}, <span className="font-semibold">&lt;{art.title}&gt;</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {located.length === 0 && artworks.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[1000] flex justify-center">
          <p className="rounded-full border border-black/[0.08] bg-surface/90 px-4 py-2 text-[12.5px] text-[#6b6258] shadow-lg shadow-black/[0.06] backdrop-blur">
            좌표가 설정된 작품이 없어요. 작품 편집에서 소장처 위치를 검색해보세요.
          </p>
        </div>
      )}

      {detailArtworkId && (
        <ArtworkDetailModal
          artworkId={detailArtworkId}
          onClose={() => setDetailArtworkId(null)}
          onEdit={() => {
            setEditArtworkId(detailArtworkId);
            setDetailArtworkId(null);
          }}
          onDeleted={() => {
            loadArtworks();
            setDetailArtworkId(null);
          }}
        />
      )}

      {editArtworkId && (
        <ArtworkModal
          artworkId={editArtworkId}
          onClose={() => setEditArtworkId(null)}
          onSaved={() => loadArtworks()}
          onDeleted={() => {
            loadArtworks();
            setEditArtworkId(null);
          }}
        />
      )}
    </div>
  );
}
