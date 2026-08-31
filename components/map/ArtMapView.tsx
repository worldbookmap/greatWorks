'use client';

import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { ImageOff } from 'lucide-react';
import type { Artwork } from '@/lib/types';
import { ArtworkModal } from '@/components/artworks/ArtworkModal';

// Default Leaflet marker icons reference asset paths that break under bundlers;
// point them at the CDN copies instead of shipping/aliasing the PNGs ourselves.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export function ArtMapView() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [openArtworkId, setOpenArtworkId] = useState<string | null>(null);

  const loadArtworks = async () => {
    const res = await fetch('/api/artworks');
    if (res.ok) setArtworks(await res.json());
  };

  useEffect(() => {
    loadArtworks();
  }, []);

  const located = artworks.filter((a) => a.lat != null && a.lng != null);

  return (
    <div className="relative flex-1">
      <MapContainer center={[30, 10]} zoom={3} className="absolute inset-0">
        <TileLayer
          attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        />
        {located.map((art) => (
          <Marker key={art.id} position={[art.lat as number, art.lng as number]}>
            <Popup>
              <div className="w-44">
                <div className="mb-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-black/[0.04]">
                  {art.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={art.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff className="h-5 w-5 text-[#c9beae]" strokeWidth={1.5} />
                  )}
                </div>
                <p className="truncate text-[13px] font-semibold text-[#2a231c]">{art.title}</p>
                <p className="truncate text-[11.5px] text-[#8a8074]">
                  {art.artist?.name ?? '작가 미상'}
                  {art.year != null && ` · ${art.year}`}
                </p>
                {art.collection_name && <p className="mt-0.5 truncate text-[11px] text-[#a39a8d]">{art.collection_name}</p>}
                <button
                  onClick={() => setOpenArtworkId(art.id)}
                  className="mt-2 w-full rounded-lg bg-gradient-to-b from-accent to-accent-strong py-1.5 text-[12px] font-medium text-white"
                >
                  자세히 보기
                </button>
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

      {openArtworkId && (
        <ArtworkModal
          artworkId={openArtworkId}
          onClose={() => setOpenArtworkId(null)}
          onSaved={() => loadArtworks()}
          onDeleted={() => {
            loadArtworks();
            setOpenArtworkId(null);
          }}
        />
      )}
    </div>
  );
}
