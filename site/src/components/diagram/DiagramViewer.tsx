import { useCallback, useEffect, useState, type SyntheticEvent } from 'react'
import { useElementWidth } from '../../hooks/useElementWidth'
import type { DiagramMeta } from '../../lib/content'
import './diagram.css'

const FALLBACK_RATIO = 0.55
const MIN_MEASURED_PX = 200

function naturalOf(diagram: DiagramMeta) {
  return { w: diagram.width, h: diagram.height ?? Math.round(diagram.width * FALLBACK_RATIO) }
}

export function DiagramViewer({ diagram }: { diagram: DiagramMeta }) {
  const [stageRef, stageWidth] = useElementWidth<HTMLDivElement>()
  const [natural, setNatural] = useState(() => naturalOf(diagram))
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    setNatural(naturalOf(diagram))
  }, [diagram])

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // 원본 body의 실제 크기를 로드 후 실측한다 — height가 명시되지 않은 문서 대응.
  const handleLoad = useCallback((event: SyntheticEvent<HTMLIFrameElement>) => {
    const doc = event.currentTarget.contentDocument
    if (!doc?.documentElement) return
    const w = doc.documentElement.scrollWidth
    const h = doc.documentElement.scrollHeight
    if (w > MIN_MEASURED_PX && h > MIN_MEASURED_PX) setNatural({ w, h })
  }, [])

  const scale = stageWidth > 0 ? stageWidth / natural.w : 0

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void stageRef.current?.requestFullscreen()
  }

  return (
    <section className="diagram-viewer" aria-label={`${diagram.title} 다이어그램 뷰어`}>
      <div className="diagram-toolbar">
        <p className="diagram-caption">
          <span className="diagram-num" aria-hidden="true">
            {diagram.num}
          </span>
          {diagram.title}
          <span className="diagram-en">{diagram.en}</span>
        </p>
        <div className="diagram-actions">
          <button type="button" onClick={toggleFullscreen}>
            {isFullscreen ? '전체화면 종료' : '전체화면'}
          </button>
          <a href={`/diagrams/${diagram.file}`} target="_blank" rel="noreferrer">
            원본 새 탭 ↗
          </a>
        </div>
      </div>
      <div className="diagram-stage" ref={stageRef}>
        <div className="diagram-canvas" style={{ height: Math.round(natural.h * scale) }}>
          {scale > 0 && (
            <iframe
              key={diagram.file}
              src={`/diagrams/${diagram.file}`}
              title={`${diagram.title} 다이어그램`}
              width={natural.w}
              height={natural.h}
              style={{ transform: `scale(${scale})` }}
              onLoad={handleLoad}
            />
          )}
        </div>
      </div>
    </section>
  )
}
