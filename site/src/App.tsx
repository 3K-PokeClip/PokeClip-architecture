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
          <Route
            path="/dataflow"
            element={
              <DocPage
                eyebrow="Doc 10 · Data Flow"
                title="데이터 플로우"
                lede="Media Origin → SQS → ECS → PostgreSQL — 이벤트·잡 큐 흐름과 대시보드 역산 스키마 초안."
                markdown={DOCS.dataflow}
              />
            }
          />
          <Route
            path="/roles"
            element={
              <DocPage
                eyebrow="Doc 11 · Team Roles"
                title="역할 분담"
                lede="3인 분담 — 서비스 단위 오너십, 인터페이스 계약 8종, 조정 카드·폴백 기준."
                markdown={DOCS.roles}
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
