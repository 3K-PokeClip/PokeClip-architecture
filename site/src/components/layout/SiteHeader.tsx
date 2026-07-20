import { Link, useLocation } from 'react-router-dom'
import { REPO_URL } from '../../lib/links'
import './layout.css'

const NAV_ITEMS = [
  { to: '/', label: '개요', isActive: (path: string) => path === '/' },
  { to: '/diagrams/0', label: '다이어그램', isActive: (path: string) => path.startsWith('/diagrams') },
  { to: '/spec', label: '기능명세서', isActive: (path: string) => path === '/spec' },
  { to: '/adr', label: '설계 · ADR', isActive: (path: string) => path.startsWith('/adr') },
  { to: '/research', label: '연구노트', isActive: (path: string) => path === '/research' },
]

export function SiteHeader() {
  const { pathname } = useLocation()

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="wordmark">
          <span className="rec-dot" aria-hidden="true" />
          PokeClip
          <span className="wordmark-sub">Architecture</span>
        </Link>
        <nav aria-label="주요 메뉴">
          <ul className="site-nav">
            {NAV_ITEMS.map((item) => {
              const active = item.isActive(pathname)
              return (
                <li key={item.to}>
                  <Link to={item.to} className={active ? 'nav-link active' : 'nav-link'} aria-current={active ? 'page' : undefined}>
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <a className="github-link" href={REPO_URL} target="_blank" rel="noreferrer">
          GitHub ↗
        </a>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p>
          <strong>PokeClip</strong> — 스트리밍 하이라이트·클립 자동화 서비스의 아키텍처 산출물.
        </p>
        <p className="footer-meta">
          다이어그램·문서 원본:{' '}
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            xodbs1021/PokeClip-architecture
          </a>
        </p>
      </div>
    </footer>
  )
}
