import { useEffect, useRef, useState } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import '../components/diagram/diagram.css'

const FILE = 'WebIA.html'

export function WebIaPage() {
  usePageTitle('웹 IA · PokeClip 아키텍처')
  const stageRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void stageRef.current?.requestFullscreen()
  }

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Web IA · v5.7 · 2026-08-10</p>
        <h1>웹 IA</h1>
        <p className="lede">
          표면 3개(공개 웹 · 웹 앱 · 운영자 콘솔) · 웹 앱 독 4개(홈 · 라이브 · 클립 · 설정) — 대시보드 정보 구조
          정본. self-contained HTML이 원본이다.
        </p>
      </header>
      <section className="diagram-viewer" aria-label="웹 IA 다이어그램 뷰어">
        <div className="diagram-toolbar">
          <p className="diagram-caption">
            웹 IA · 대시보드 정보 구조
            <span className="diagram-en">Web IA</span>
          </p>
          <div className="diagram-actions">
            <button type="button" onClick={toggleFullscreen}>
              {isFullscreen ? '전체화면 종료' : '전체화면'}
            </button>
            <a href={`/diagrams/${FILE}`} target="_blank" rel="noreferrer">
              원본 새 탭 ↗
            </a>
          </div>
        </div>
        <div className="diagram-stage self-interactive" ref={stageRef}>
          <iframe src={`/diagrams/${FILE}`} title="웹 IA 다이어그램" />
        </div>
        <p className="diagram-hint">
          빈 곳을 드래그하면 화면이 따라옵니다 · 휠은 다이어그램 스크롤, Ctrl+휠은 확대 — 우상단 맞춤·1:1 버튼으로
          되돌립니다.
        </p>
      </section>
    </div>
  )
}
