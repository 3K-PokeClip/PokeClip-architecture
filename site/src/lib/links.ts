export const REPO_URL = 'https://github.com/xodbs1021/PokeClip-architecture'

export interface ResolvedHref {
  to?: string
  external?: string
}

/**
 * 원본 md 문서의 상대 링크를 사이트 라우트로 변환한다.
 * 매핑 불가한 저장소 파일은 GitHub blob 링크로 폴백.
 */
export function resolveDocHref(href: string): ResolvedHref {
  if (/^(https?:)?\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('#')) {
    return { external: href }
  }

  const clean = href.replace(/^(\.\/|\.\.\/)+/, '').replace(/\/$/, '')

  if (clean === 'adr') return { to: '/adr' }

  const adr = clean.match(/^(?:adr\/)?(ADR-\d+[^/]*)\.md$/)
  if (adr) return { to: `/adr/${adr[1]}` }

  const diagram = clean.match(/^([0-5])_Pokeclip[^/]*\.(html|png)$/)
  if (diagram) return { to: `/diagrams/${diagram[1]}` }

  if (clean.startsWith('6_')) return { to: '/adr' }
  if (clean.startsWith('8_')) return { to: '/research' }
  if (clean.startsWith('9_')) return { to: '/spec' }

  return { external: `${REPO_URL}/blob/main/${clean}` }
}

/** 문서 첫 h1을 제거한다 — 페이지 헤더가 제목을 대신 렌더링하므로. */
export function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^# .*\n+/, '')
}
