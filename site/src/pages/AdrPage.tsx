import { Link, Navigate, useParams } from 'react-router-dom'
import { MarkdownArticle } from '../components/markdown/MarkdownArticle'
import { usePageTitle } from '../hooks/usePageTitle'
import { ADRS, DOCS } from '../lib/content'
import { stripLeadingH1 } from '../lib/links'
import { DocPage } from './DocPage'
import './adr.css'

export function AdrIndexPage() {
  return (
    <DocPage
      eyebrow="Doc 6 · Decision Index"
      title="설계 결정 — ADR 현황판"
      lede="결정이 뒤집히면 삭제하지 않고 '대체됨'으로 이력을 보존한다. 개별 결정은 ADR 15건으로."
      markdown={DOCS.decisions}
    />
  )
}

export function AdrDetailPage() {
  const { slug } = useParams()
  const index = ADRS.findIndex((item) => item.slug === slug)
  const adr = index >= 0 ? ADRS[index] : undefined
  usePageTitle(adr ? `${adr.id} ${adr.title} · PokeClip 아키텍처` : 'PokeClip — 아키텍처')
  if (!adr) return <Navigate to="/adr" replace />

  const prev = ADRS[index - 1]
  const next = ADRS[index + 1]

  return (
    <div className="page">
      <div className="adr-layout">
        <aside className="adr-rail" aria-label="ADR 목록">
          <Link to="/adr" className="rail-back">
            ← 결정 인덱스
          </Link>
          <ul>
            {ADRS.map((item) => {
              const active = item.slug === adr.slug
              return (
                <li key={item.slug}>
                  <Link
                    to={`/adr/${item.slug}`}
                    className={active ? 'active' : undefined}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="rail-id">{item.id.replace(/^ADR-0?/, '')}</span>
                    {item.title}
                  </Link>
                </li>
              )
            })}
          </ul>
        </aside>
        <article>
          <header className="page-head">
            <p className="eyebrow">{adr.id}</p>
            <h1>{adr.title}</h1>
          </header>
          <MarkdownArticle markdown={stripLeadingH1(adr.body)} />
          <nav className="adr-pager" aria-label="ADR 이동">
            {prev ? <Link to={`/adr/${prev.slug}`}>← {prev.id}</Link> : <span />}
            {next ? <Link to={`/adr/${next.slug}`}>{next.id} →</Link> : <span />}
          </nav>
        </article>
      </div>
    </div>
  )
}
