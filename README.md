# 명화 도감 (greatWorks)

화가와 작품, 작품 설명을 쉽게 찾아보는 개인용 명화 도감 웹앱.

- **작품**: Wikidata에서 검색해 이름·작가·연도·소장처·이미지를 자동으로 채워 등록. Wikidata에 이미지가 없으면 직접 업로드할 수 있습니다(Supabase Storage). 이미지를 클릭하면 그 위치에 설명 핫스팟을 추가할 수 있습니다.
- **화가**: Wikidata 검색으로 약력·생몰년·국적·화파를 자동 입력. 다른 화가와의 관계(사제관계, 라이벌 등)를 직접 연결할 수 있습니다.
- **지도**: Leaflet + OpenStreetMap. 소장처 좌표가 있는 작품을 세계지도에 표시합니다.
- **마인드맵**: `@xyflow/react` + `dagre`로 화가·작품·화가 간 관계를 시각화. 노드를 드래그해서 배치를 바꿀 수 있습니다.
- **데이터**: Supabase(Postgres). 작품/화가 검색은 [Wikidata](https://www.wikidata.org)(무료, 키 불필요) 사용.

## 로컬 실행

1. 의존성 설치: `npm install`
2. `.env.local.example`을 `.env.local`로 복사하고 값을 채웁니다.
3. Supabase 프로젝트를 만들고 SQL Editor에서 `supabase/schema.sql`을 실행합니다.
4. Supabase Storage에 `artwork-images` 버킷을 공개(public)로 만듭니다 (Storage → New bucket, Public bucket 체크). 이미지 직접 업로드에 사용됩니다.
5. `npm run dev` 후 `http://localhost:3000` 접속 → 설정한 `APP_PASSWORD`로 로그인.

## 환경 변수

| 이름 | 설명 |
|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 키 (절대 클라이언트에 노출 금지) |
| `APP_PASSWORD` | 앱 접근 비밀번호 |

## Vercel 배포

1. GitHub 저장소를 만들어 이 프로젝트를 push합니다.
2. [Vercel](https://vercel.com/new)에서 해당 저장소를 import합니다.
3. Vercel 프로젝트 Settings → Environment Variables에 위 3개 값을 등록합니다.
4. Deploy 하면 push할 때마다 자동 배포됩니다.
