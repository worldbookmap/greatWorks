'use client';

import dynamic from 'next/dynamic';

const ArtMapView = dynamic(() => import('@/components/map/ArtMapView').then((mod) => mod.ArtMapView), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-[#8a8074]">지도를 불러오는 중...</p>,
});

export default function MapPage() {
  return <ArtMapView />;
}
