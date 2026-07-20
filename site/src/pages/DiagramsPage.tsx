import { Link, Navigate, useParams } from 'react-router-dom'
import { DiagramViewer } from '../components/diagram/DiagramViewer'
import { usePageTitle } from '../hooks/usePageTitle'
import { DIAGRAMS } from '../lib/content'

export function DiagramsPage() {
  const { num } = useParams()
  const diagram = DIAGRAMS.find((d) => String(d.num) === num)
  usePageTitle(diagram ? `${diagram.num} ${diagram.title} · PokeClip 아키텍처` : 'PokeClip — 아키텍처')
  if (!diagram) return <Navigate to="/diagrams/0" replace />

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Diagrams 0–5</p>
        <h1>아키텍처 다이어그램</h1>
        <p className="lede">
          self-contained HTML이 원본이다 — 뷰어가 화면 폭에 맞춰 자동 축소한다. 세부는 전체화면이나 원본 새 탭으로.
        </p>
      </header>
      <nav className="diagram-tabs" aria-label="다이어그램 선택">
        {DIAGRAMS.map((d) => {
          const active = d.num === diagram.num
          return (
            <Link
              key={d.num}
              to={`/diagrams/${d.num}`}
              className={active ? 'tab active' : 'tab'}
              aria-current={active ? 'page' : undefined}
            >
              <span className="tab-num">{d.num}</span>
              {d.title}
            </Link>
          )
        })}
      </nav>
      <DiagramViewer diagram={diagram} />
    </div>
  )
}
