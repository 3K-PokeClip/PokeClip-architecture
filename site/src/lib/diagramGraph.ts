// 다이어그램 iframe 내부의 노드(박스)와 SVG 연결선을 런타임에 스캔해
// 클릭 인터랙션용 그래프를 만든다. 원본 HTML은 수정하지 않는다 —
// 선 끝점이 노드 경계 위에 놓이는 원본 wire() 방식에 기대어 기하 매칭한다.

interface Point {
  x: number
  y: number
}

interface NodeRect {
  l: number
  t: number
  r: number
  b: number
  area: number
}

export interface DiagramNode {
  el: HTMLElement
  rect: NodeRect
}

export interface DiagramEdge {
  line: SVGElement
  labels: SVGElement[]
  a: number
  b: number
}

export interface DiagramGraph {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  adj: Map<number, Set<number>>
}

const STYLE_ID = 'pk-enhance-style'
const MIN_NODE_AREA = 800
const MAX_NODE_AREA_RATIO = 0.28
const ENDPOINT_SLACK = 7
const HIT_SLACK = 4

const ENHANCE_CSS = `
  .pk-node { transition: opacity .3s ease, transform .45s cubic-bezier(.34, 1.56, .64, 1), box-shadow .35s ease; }
  .pk-dim { opacity: .16 !important; }
  .pk-edge-dim { opacity: .09 !important; }
  .pk-focus { z-index: 60 !important; box-shadow: 0 14px 34px rgba(0,0,0,.22), 0 0 0 2.5px #e5484d !important; }
  .pk-linked { z-index: 50 !important; box-shadow: 0 10px 26px rgba(0,0,0,.16), 0 0 0 2px #1c1917 !important; }
  .pk-edge-hot { stroke: #e5484d !important; stroke-width: 2.6px !important; opacity: 1 !important; }
  .pk-label-hot { fill: #b3261e !important; opacity: 1 !important; }
`

function containsPoint(rect: NodeRect, p: Point, slack: number): boolean {
  return p.x >= rect.l - slack && p.x <= rect.r + slack && p.y >= rect.t - slack && p.y <= rect.b + slack
}

/** 점을 포함하는 후보 중 가장 작은 박스의 인덱스. 없으면 -1. */
function nodeAt(nodes: DiagramNode[], p: Point, slack: number): number {
  let best = -1
  for (let i = 0; i < nodes.length; i += 1) {
    if (!containsPoint(nodes[i].rect, p, slack)) continue
    if (best < 0 || nodes[i].rect.area < nodes[best].rect.area) best = i
  }
  return best
}

export function buildGraph(doc: Document): DiagramGraph | null {
  const view = doc.defaultView
  if (!view || !doc.body) return null

  if (!doc.getElementById(STYLE_ID)) {
    const style = doc.createElement('style')
    style.id = STYLE_ID
    style.textContent = ENHANCE_CSS
    doc.head.appendChild(style)
  }

  const bodyBg = view.getComputedStyle(doc.body).backgroundColor
  const canvasArea = doc.body.scrollWidth * doc.body.scrollHeight

  const nodes: DiagramNode[] = []
  doc.body.querySelectorAll<HTMLElement>('div, section, article, ul').forEach((el) => {
    const cs = view.getComputedStyle(el)
    const hasBox =
      parseFloat(cs.borderTopWidth) > 0 ||
      cs.boxShadow !== 'none' ||
      (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent' && cs.backgroundColor !== bodyBg)
    if (!hasBox) return
    const b = el.getBoundingClientRect()
    const area = b.width * b.height
    if (area < MIN_NODE_AREA || area > canvasArea * MAX_NODE_AREA_RATIO) return
    nodes.push({ el, rect: { l: b.left, t: b.top, r: b.right, b: b.bottom, area } })
  })

  const edges: DiagramEdge[] = []
  const adj = new Map<number, Set<number>>()
  const link = (a: number, b: number) => {
    if (!adj.has(a)) adj.set(a, new Set())
    adj.get(a)!.add(b)
  }

  doc.querySelectorAll<SVGElement>('svg').forEach((svg) => {
    let current: DiagramEdge | null = null
    Array.from(svg.children).forEach((child) => {
      const tag = child.tagName.toLowerCase()
      if (tag === 'defs') return
      if (tag === 'line' || tag === 'path' || tag === 'polyline') {
        let p1: Point | null = null
        let p2: Point | null = null
        if (tag === 'line') {
          p1 = { x: Number(child.getAttribute('x1')), y: Number(child.getAttribute('y1')) }
          p2 = { x: Number(child.getAttribute('x2')), y: Number(child.getAttribute('y2')) }
        } else {
          const geo = child as SVGGeometryElement
          if (typeof geo.getTotalLength === 'function') {
            try {
              const len = geo.getTotalLength()
              if (len > 0) {
                p1 = geo.getPointAtLength(0)
                p2 = geo.getPointAtLength(len)
              }
            } catch {
              p1 = null
            }
          }
        }
        current = null
        if (!p1 || !p2 || Number.isNaN(p1.x) || Number.isNaN(p2.x)) return
        const a = nodeAt(nodes, p1, ENDPOINT_SLACK)
        const b = nodeAt(nodes, p2, ENDPOINT_SLACK)
        if (a < 0 || b < 0 || a === b) return
        current = { line: child as SVGElement, labels: [], a, b }
        edges.push(current)
        link(a, b)
        link(b, a)
      } else if (tag === 'text' && current) {
        current.labels.push(child as SVGElement)
      }
    })
  })

  if (edges.length === 0) return null
  return { nodes, edges, adj }
}

/** 클릭 좌표(문서 기준)에 걸리는, 연결선이 있는 노드의 인덱스. 없으면 -1. */
export function hitTest(graph: DiagramGraph, p: Point): number {
  const idx = nodeAt(graph.nodes, p, HIT_SLACK)
  if (idx < 0) return -1
  return graph.adj.has(idx) ? idx : -1
}

export function applyHighlight(graph: DiagramGraph, focus: number): void {
  const linked = graph.adj.get(focus) ?? new Set<number>()
  const raised = new Set<number>([focus, ...linked])

  graph.nodes.forEach((node, i) => {
    node.el.classList.add('pk-node')
    const isFocus = i === focus
    const isLinked = linked.has(i)
    // 강조 대상의 조상/자손 박스는 흐리게 하지 않는다 — opacity가 중첩되므로.
    const touchesRaised =
      isFocus ||
      isLinked ||
      [...raised].some((r) => graph.nodes[r].el.contains(node.el) || node.el.contains(graph.nodes[r].el))
    node.el.classList.toggle('pk-focus', isFocus)
    node.el.classList.toggle('pk-linked', isLinked)
    node.el.classList.toggle('pk-dim', !touchesRaised)
    if (isFocus || isLinked) {
      const hasOwnTransform = node.el.style.transform !== '' && !node.el.style.transform.startsWith('scale')
      if (!hasOwnTransform) node.el.style.transform = isFocus ? 'scale(1.05)' : 'scale(1.025)'
    } else {
      node.el.style.removeProperty('transform')
    }
  })

  graph.edges.forEach((edge) => {
    const hot = edge.a === focus || edge.b === focus
    edge.line.classList.toggle('pk-edge-hot', hot)
    edge.line.classList.toggle('pk-edge-dim', !hot)
    edge.labels.forEach((label) => {
      label.classList.toggle('pk-label-hot', hot)
      label.classList.toggle('pk-edge-dim', !hot)
    })
  })
}

export function clearHighlight(graph: DiagramGraph): void {
  graph.nodes.forEach((node) => {
    node.el.classList.remove('pk-focus', 'pk-linked', 'pk-dim')
    node.el.style.removeProperty('transform')
  })
  graph.edges.forEach((edge) => {
    edge.line.classList.remove('pk-edge-hot', 'pk-edge-dim')
    edge.labels.forEach((label) => label.classList.remove('pk-label-hot', 'pk-edge-dim'))
  })
}
