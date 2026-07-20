import type { ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import { Link } from 'react-router-dom'
import remarkCjkFriendly from 'remark-cjk-friendly'
import remarkGfm from 'remark-gfm'
import { resolveDocHref } from '../../lib/links'
import './markdown.css'

/** 우선순위 표기(P0/P1/P2)로 시작하는 셀을 배지로 장식한다. */
function decorateCell(children: ReactNode): ReactNode {
  const parts = Array.isArray(children) ? children : [children]
  const [first, ...rest] = parts
  if (typeof first !== 'string') return children

  const match = first.match(/^(P[0-2])([\s\S]*)$/)
  if (!match) return children

  return (
    <>
      <span className={`badge badge-${match[1].toLowerCase()}`}>{match[1]}</span>
      {match[2]}
      {rest}
    </>
  )
}

const components: Components = {
  a: ({ href, children }) => {
    if (!href) return <span>{children}</span>
    const resolved = resolveDocHref(href)
    if (resolved.to) return <Link to={resolved.to}>{children}</Link>
    const isAnchor = resolved.external!.startsWith('#')
    return (
      <a href={resolved.external} target={isAnchor ? undefined : '_blank'} rel={isAnchor ? undefined : 'noreferrer'}>
        {children}
      </a>
    )
  },
  table: ({ children }) => (
    <div className="table-scroll">
      <table>{children}</table>
    </div>
  ),
  td: ({ children }) => <td>{decorateCell(children)}</td>,
}

export function MarkdownArticle({ markdown }: { markdown: string }) {
  return (
    <div className="md-article">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkCjkFriendly]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
