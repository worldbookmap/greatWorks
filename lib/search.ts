// PostgREST's `.or()` filter syntax uses commas and parentheses as separators,
// so strip them from user input before interpolating into a filter string.
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[(),]/g, ' ').trim();
}

// DB 검색어의 띄어쓰기 차이를 무시하도록, 단어 사이를 ILIKE 와일드카드(%)로 잇는다.
// 예: "반 고흐" -> "%반%고흐%" — "반고흐", "반  고흐" 모두 매칭된다.
// (대소문자는 ILIKE 자체가 이미 구분하지 않는다.)
export function toFuzzyIlikePattern(term: string): string {
  const words = sanitizeSearchTerm(term).split(/\s+/).filter(Boolean);
  return `%${words.join('%')}%`;
}

// 클라이언트 쪽 문자열 비교에서 대소문자와 공백 차이를 무시하기 위한 정규화.
export function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}
