import { MarkdownArticle } from '../components/markdown/MarkdownArticle'
import { usePageTitle } from '../hooks/usePageTitle'
import { stripLeadingH1 } from '../lib/links'

interface DocPageProps {
  eyebrow: string
  title: string
  lede?: string
  markdown: string
}

export function DocPage({ eyebrow, title, lede, markdown }: DocPageProps) {
  usePageTitle(`${title} · PokeClip 아키텍처`)

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </header>
      <MarkdownArticle markdown={stripLeadingH1(markdown)} />
    </div>
  )
}
