export interface ResolvedHref {
  to?: string
  external?: string
}

/**
 * 원본 md 문서의 상대 링크를 사이트 라우트로 변환한다.
 * 매핑 불가한 상대 경로는 링크를 걸지 않는다 (저장소는 비공개).
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

  if (clean.startsWith('10_')) return { to: '/dataflow' }
  if (clean.startsWith('11_')) return { to: '/roles' }
  if (clean.startsWith('12_')) return { to: '/m1' }
  if (clean.startsWith('6_')) return { to: '/adr' }
  if (clean.startsWith('8_')) return { to: '/research' }
  if (clean.startsWith('9_')) return { to: '/spec' }

  return {}
}

/** 문서 첫 h1을 제거한다 — 페이지 헤더가 제목을 대신 렌더링하므로. */
export function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^# .*\n+/, '')
}
