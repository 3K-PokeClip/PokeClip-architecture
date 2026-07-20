import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SiteFooter, SiteHeader } from './components/layout/SiteHeader'
import { DOCS } from './lib/content'
import { AdrDetailPage, AdrIndexPage } from './pages/AdrPage'
import { DiagramsPage } from './pages/DiagramsPage'
import { DocPage } from './pages/DocPage'
import { OverviewPage } from './pages/OverviewPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        본문 바로가기
      </a>
      <ScrollToTop />
      <SiteHeader />
      <main id="main">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/diagrams" element={<Navigate to="/diagrams/0" replace />} />
          <Route path="/diagrams/:num" element={<DiagramsPage />} />
          <Route
            path="/spec"
            element={
              <DocPage
                eyebrow="Doc 9 · Functional Spec"
                title="기능 명세서"
                lede="기능 범위·우선순위·개발 순서·리스크 — 기술 멘토 리뷰용 개발 기획서."
                markdown={DOCS.spec}
              />
            }
          />
          <Route
            path="/research"
            element={
              <DocPage
                eyebrow="Doc 8 · Research Note"
                title="하이라이트 탐지 연구 노트"
                lede="채팅 반응 기반 하이라이트 탐지 방법론 — 팀 실측 기록."
                markdown={DOCS.research}
              />
            }
          />
          <Route path="/adr" element={<AdrIndexPage />} />
          <Route path="/adr/:slug" element={<AdrDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <SiteFooter />
    </>
  )
}

export default App
