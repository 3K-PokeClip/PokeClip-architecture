import { useCallback, useEffect, useRef, useState, type MouseEvent, type SyntheticEvent } from 'react'
import { useElementWidth } from '../../hooks/useElementWidth'
import type { DiagramMeta } from '../../lib/content'
import { applyHighlight, buildGraph, clearHighlight, hitTest, type DiagramGraph } from '../../lib/diagramGraph'
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
  const [interactive, setInteractive] = useState(false)
  const graphRef = useRef<DiagramGraph | null>(null)
  const focusRef = useRef(-1)

  useEffect(() => {
    setNatural(naturalOf(diagram))
    setInteractive(false)
    graphRef.current = null
    focusRef.current = -1
  }, [diagram])

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // 원본 body의 실제 크기를 로드 후 실측하고, 노드·연결선 그래프를 구성한다.
  const handleLoad = useCallback((event: SyntheticEvent<HTMLIFrameElement>) => {
    const doc = event.currentTarget.contentDocument
    if (!doc?.documentElement) return
    const w = doc.documentElement.scrollWidth
    const h = doc.documentElement.scrollHeight
    if (w > MIN_MEASURED_PX && h > MIN_MEASURED_PX) setNatural({ w, h })
    try {
      graphRef.current = buildGraph(doc)
      setInteractive(Boolean(graphRef.current))
    } catch {
      graphRef.current = null
      setInteractive(false)
    }
  }, [])

  const scale = stageWidth > 0 ? stageWidth / natural.w : 0

  const toDocPoint = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale }
  }

  const handleCanvasClick = (event: MouseEvent<HTMLDivElement>) => {
    const graph = graphRef.current
    if (!graph || scale <= 0) return
    const idx = hitTest(graph, toDocPoint(event))
    if (idx < 0 || idx === focusRef.current) {
      clearHighlight(graph)
      focusRef.current = -1
      return
    }
    applyHighlight(graph, idx)
    focusRef.current = idx
  }

  const handleCanvasMove = (event: MouseEvent<HTMLDivElement>) => {
    const graph = graphRef.current
    if (!graph || scale <= 0) return
    const overNode = hitTest(graph, toDocPoint(event)) >= 0
    event.currentTarget.style.cursor = overNode ? 'pointer' : 'default'
  }

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
        <div
          className="diagram-canvas"
          style={{ height: Math.round(natural.h * scale) }}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMove}
        >
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
      {interactive && (
        <p className="diagram-hint">
          박스를 클릭하면 화살표로 연결된 요소들이 떠오르며 강조됩니다 — 빈 곳이나 같은 박스를 다시 클릭하면
          해제.
        </p>
      )}
    </section>
  )
}
