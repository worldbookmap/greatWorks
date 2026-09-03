'use client';

import Image from 'next/image';

// next.config.ts의 images.remotePatterns와 같은 호스트 목록을 유지해야 합니다.
// 목록에 없는 호스트로 next/image를 렌더링하면 런타임 에러가 발생하므로,
// (사용자가 직접 붙여넣은 임의의 이미지 URL 등) 목록 밖 호스트는 일반 <img>로 폴백합니다.
const OPTIMIZABLE_HOST_PATTERNS: RegExp[] = [
  /^commons\.wikimedia\.org$/,
  /^upload\.wikimedia\.org$/,
  /(^|\.)supabase\.co$/,
  /^www\.artic\.edu$/,
  /^umss\.mmca\.go\.kr$/,
  /^www\.nationalgallery\.org\.uk$/,
  /(^|\.)navigart\.fr$/,
  /(^|\.)tate\.org\.uk$/,
  /^images\.metmuseum\.org$/,
];

function isOptimizableHost(src: string): boolean {
  try {
    return OPTIMIZABLE_HOST_PATTERNS.some((re) => re.test(new URL(src).hostname));
  } catch {
    return false;
  }
}

interface RemoteThumbnailProps {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
}

// 썸네일 전용: 부모 요소가 relative + 고정 크기(overflow-hidden)를 갖는다고 가정하고 fill로 채웁니다.
export function RemoteThumbnail({ src, alt, sizes, className }: RemoteThumbnailProps) {
  if (!isOptimizableHost(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} loading="lazy" className={`absolute inset-0 h-full w-full ${className ?? ''}`} />
    );
  }
  return <Image src={src} alt={alt} fill sizes={sizes} className={className} />;
}
