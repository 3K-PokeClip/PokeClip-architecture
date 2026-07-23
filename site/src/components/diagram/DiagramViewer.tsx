import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type SyntheticEvent } from 'react'
import { useElementWidth } from '../../hooks/useElementWidth'
import type { DiagramMeta } from '../../lib/content'
import { applyHighlight, buildGraph, clearHighlight, hitTest, type DiagramGraph, type GraphMode } from '../../lib/diagramGraph'
import './diagram.css'

const FALLBACK_RATIO = 0.55
const ZOOM_MIN = 0.5
const ZOOM_MAX = 4

interface SafariGestureEvent extends UIEvent {
  scale: number
  clientX: number
  clientY: number
}
const MIN_MEASURED_PX = 200

function naturalOf(diagram: DiagramMeta) {
  return { w: diagram.width, h: diagram.height ?? Math.round(diagram.width * FALLBACK_RATIO) }
}

export function DiagramViewer({ diagram }: { diagram: DiagramMeta }) {
  const [stageRef, stageWidth] = useElementWidth<HTMLDivElement>()
  const [natural, setNatural] = useState(() => naturalOf(diagram))
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(1)
  zoomRef.current = zoom
  const pinchAnchor = useRef<{ px: number; py: number; cx: number; cy: number } | null>(null)
  const [graphMode, setGraphMode] = useState<GraphMode | null>(null)
  const graphRef = useRef<DiagramGraph | null>(null)
  const focusRef = useRef(-1)

  useEffect(() => {
    setNatural(naturalOf(diagram))
    setGraphMode(null)
    setZoom(1)
    graphRef.current = null
    focusRef.current = -1
  }, [diagram])

  // 트랙패드 핀치(ctrl+wheel / Safari gesture)를 다이어그램 줌으로 — 커서 위치 기준 확대.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const applyZoomAt = (nextZoomRaw: number, clientX: number, clientY: number) => {
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nextZoomRaw))
      if (next === zoomRef.current) return
      const rect = stage.getBoundingClientRect()
      const px = clientX - rect.left
      const py = clientY - rect.top
      pinchAnchor.current = {
        px,
        py,
        cx: (stage.scrollLeft + px) / zoomRef.current,
        cy: (stage.scrollTop + py) / zoomRef.current,
      }
      setZoom(next)
    }

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      applyZoomAt(zoomRef.current * Math.exp(-event.deltaY * 0.01), event.clientX, event.clientY)
    }

    let lastScale = 1
    const onGestureStart = (event: Event) => {
      event.preventDefault()
      lastScale = 1
    }
    const onGestureChange = (event: Event) => {
      event.preventDefault()
      const gesture = event as SafariGestureEvent
      applyZoomAt(zoomRef.current * (gesture.scale / lastScale), gesture.clientX, gesture.clientY)
      lastScale = gesture.scale
    }

    // 모바일 두 손가락 핀치 — 제스처 시작 거리 대비 배율, 두 손가락 중점 기준.
    let touchStartDist = 0
    let touchStartZoom = 1
    const touchDist = (touches: TouchList) =>
      Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return
      event.preventDefault()
      touchStartDist = touchDist(event.touches)
      touchStartZoom = zoomRef.current
    }
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || touchStartDist === 0) return
      event.preventDefault()
      const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2
      const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2
      applyZoomAt(touchStartZoom * (touchDist(event.touches) / touchStartDist), midX, midY)
    }
    const onTouchEnd = () => {
      touchStartDist = 0
    }

    stage.addEventListener('wheel', onWheel, { passive: false })
    stage.addEventListener('gesturestart', onGestureStart)
    stage.addEventListener('gesturechange', onGestureChange)
    stage.addEventListener('touchstart', onTouchStart, { passive: false })
    stage.addEventListener('touchmove', onTouchMove, { passive: false })
    stage.addEventListener('touchend', onTouchEnd)
    stage.addEventListener('touchcancel', onTouchEnd)
    return () => {
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('gesturestart', onGestureStart)
      stage.removeEventListener('gesturechange', onGestureChange)
      stage.removeEventListener('touchstart', onTouchStart)
      stage.removeEventListener('touchmove', onTouchMove)
      stage.removeEventListener('touchend', onTouchEnd)
      stage.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [stageRef])

  // 핀치 후 커서 아래 지점이 고정되도록 스크롤 보정.
  useLayoutEffect(() => {
    const stage = stageRef.current
    const anchor = pinchAnchor.current
    if (!stage || !anchor) return
    pinchAnchor.current = null
    stage.scrollLeft = anchor.cx * zoom - anchor.px
    stage.scrollTop = anchor.cy * zoom - anchor.py
  }, [zoom, stageRef])

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const selfInteractive = Boolean(diagram.selfInteractive)

  // 원본 body의 실제 크기를 로드 후 실측하고, 노드·연결선 그래프를 구성한다.
  // 원본이 자체 인터랙션을 가진 경우에는 둘이 충돌하므로 건드리지 않는다.
  const handleLoad = useCallback((event: SyntheticEvent<HTMLIFrameElement>) => {
    if (event.currentTarget.dataset.selfInteractive === '1') return
    const doc = event.currentTarget.contentDocument
    if (!doc?.documentElement) return
    const w = doc.documentElement.scrollWidth
    const h = doc.documentElement.scrollHeight
    if (w > MIN_MEASURED_PX && h > MIN_MEASURED_PX) setNatural({ w, h })
    try {
      graphRef.current = buildGraph(doc)
      setGraphMode(graphRef.current?.mode ?? null)
    } catch {
      graphRef.current = null
      setGraphMode(null)
    }
  }, [])

  const fitScale = stageWidth > 0 ? stageWidth / natural.w : 0
  const scale = fitScale * zoom

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
          {!selfInteractive && (
            <div className="zoom-controls" role="group" aria-label="확대/축소">
              <button type="button" onClick={() => setZoom((z) => Math.max(0.5, z / 1.25))} aria-label="축소" title="축소">
                −
              </button>
              <button type="button" className="zoom-reset" onClick={() => setZoom(1)} title="화면 폭에 맞춤">
                {Math.round(zoom * 100)}%
              </button>
              <button type="button" onClick={() => setZoom((z) => Math.min(4, z * 1.25))} aria-label="확대" title="확대">
                ＋
              </button>
            </div>
          )}
          <button type="button" onClick={toggleFullscreen}>
            {isFullscreen ? '전체화면 종료' : '전체화면'}
          </button>
          <a href={`/diagrams/${diagram.file}`} target="_blank" rel="noreferrer">
            원본 새 탭 ↗
          </a>
        </div>
      </div>
      {selfInteractive ? (
        <div className="diagram-stage self-interactive" ref={stageRef}>
          <iframe
            key={diagram.file}
            src={`/diagrams/${diagram.file}`}
            title={`${diagram.title} 다이어그램`}
            data-self-interactive="1"
            onLoad={handleLoad}
          />
        </div>
      ) : (
        <div className={zoom > 1 ? 'diagram-stage zoomed' : 'diagram-stage'} ref={stageRef}>
          <div
            className="diagram-canvas"
            style={{ width: Math.round(natural.w * scale), height: Math.round(natural.h * scale) }}
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
      )}
      {selfInteractive && (
        <p className="diagram-hint">
          빈 곳을 드래그하면 화면이 따라옵니다 · 휠은 스크롤, Ctrl+휠은 확대 · 액터나 유스케이스를 클릭하면 관련
          요소만 남고 나머지는 흐려집니다 — 같은 것을 다시 클릭하거나 빈 곳 클릭·Escape로 해제.
        </p>
      )}
      {!selfInteractive && graphMode && (
        <p className="diagram-hint">
          {graphMode === 'wired'
            ? '박스를 클릭하면 화살표로 연결된 요소들이 떠오르며 강조됩니다 — 빈 곳이나 같은 박스를 다시 클릭하면 해제.'
            : '카드를 클릭하면 같은 단계(열)·같은 레인(행)의 카드들이 떠오르며 강조됩니다 — 빈 곳 클릭으로 해제.'}
        </p>
      )}
    </section>
  )
}
