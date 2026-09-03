import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local dev access via 127.0.0.1 as well as localhost.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "commons.wikimedia.org" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }, // 업로드된 작품/화가 이미지
      { protocol: "https", hostname: "www.artic.edu" }, // 시카고 미술관 (IIIF)
      { protocol: "https", hostname: "umss.mmca.go.kr" }, // 국립현대미술관
      { protocol: "https", hostname: "www.nationalgallery.org.uk" }, // 내셔널 갤러리(런던)
      { protocol: "https", hostname: "**.navigart.fr" }, // 퐁피두 센터
      { protocol: "https", hostname: "**.tate.org.uk" }, // 테이트모던
      { protocol: "https", hostname: "images.metmuseum.org" }, // 메트로폴리탄 미술관
    ],
  },
};

export default nextConfig;
