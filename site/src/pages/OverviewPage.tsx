import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
import './overview.css'

const ARTIFACTS = [
  { num: '0', title: '유스케이스 다이어그램', kind: '다이어그램', to: '/diagrams/0' },
  { num: '1', title: 'IA — 정보 구조', kind: '다이어그램', to: '/diagrams/1' },
  { num: '2', title: '유저 저니', kind: '다이어그램', to: '/diagrams/2' },
  { num: '3', title: 'SA — 서비스 아키텍처', kind: '다이어그램', to: '/diagrams/3' },
  { num: '4', title: 'SysA — 시스템 아키텍처', kind: '다이어그램', to: '/diagrams/4' },
  { num: '5', title: 'CA — 클라우드 아키텍처 (AWS)', kind: '다이어그램', to: '/diagrams/5' },
  { num: '6', title: '설계 결정 인덱스 — ADR 현황판 14건', kind: '문서', to: '/adr' },
  { num: '7', title: '사업 기획서 (소마 심사용)', kind: '작성 예정', to: null },
  { num: '8', title: '하이라이트 탐지 연구 노트', kind: '문서', to: '/research' },
  { num: '9', title: '기능 명세서 (기술 멘토 리뷰용)', kind: '문서', to: '/spec' },
] as const

const STACK = [
  ['C++', 'OBS 플러그인'],
  ['Go', 'Media Origin'],
  ['Spring', '코어 API'],
  ['Node', '채팅 수집·분석'],
  ['Python', 'AI 자막'],
  ['React', '대시보드'],
] as const

export function OverviewPage() {
  usePageTitle('PokeClip — 아키텍처')

  return (
    <div className="page">
      <section className="hero" aria-labelledby="hero-heading">
        <p className="hero-eyebrow">
          <span className="rec-dot" aria-hidden="true" />
          PokeClip · Architecture Artifacts
        </p>
        <h1 id="hero-heading">
          방송이 끝나기 전에,
          <br />
          클립이 올라간다.
        </h1>
        <p className="hero-accent">— 그것도, 브금 없이.</p>
        <p className="hero-desc">
          자체 OBS 플러그인이 본방(치지직·SOOP)과 병행으로 멀티오디오 ~10트랙을 SRT로 동시 송출하고, 채팅 반응
          분석이 하이라이트를 실시간 점프카드로 발행한다. BGM 트랙을 제외한 클립을 방송 종료 전에 유튜브까지 —
          그 파이프라인의 설계 산출물이 이 저장소다.
        </p>
        <div className="hero-cta">
          <Link className="btn btn-primary" to="/diagrams/0">
            다이어그램 보기
          </Link>
          <Link className="btn" to="/spec">
            기능 명세서
          </Link>
        </div>
      </section>

      <section className="artifacts" aria-labelledby="artifacts-heading">
        <div className="section-head">
          <h2 id="artifacts-heading">산출물 인덱스</h2>
          <p>NUMBERING 0–9 · 원본은 저장소 루트</p>
        </div>
        <ol className="artifact-list">
          {ARTIFACTS.map((artifact) => (
            <li key={artifact.num}>
              {artifact.to ? (
                <Link className="artifact-row" to={artifact.to}>
                  <span className="a-num">{artifact.num}</span>
                  <span className="a-title">{artifact.title}</span>
                  <span className="a-kind">{artifact.kind}</span>
                  <span className="a-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              ) : (
                <span className="artifact-row disabled">
                  <span className="a-num">{artifact.num}</span>
                  <span className="a-title">{artifact.title}</span>
                  <span className="a-kind">{artifact.kind}</span>
                  <span className="a-arrow" aria-hidden="true" />
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="stack" aria-labelledby="stack-heading">
        <div className="section-head">
          <h2 id="stack-heading">시스템 구성</h2>
          <p>상세: 3_SA · ADR-007</p>
        </div>
        <div className="stack-flow">
          {STACK.map(([lang, role], i) => (
            <Fragment key={lang}>
              <span className="stack-chip">
                <span className="stack-lang">{lang}</span>
                <span className="stack-role">{role}</span>
              </span>
              {i < STACK.length - 1 && (
                <span className="stack-arrow" aria-hidden="true">
                  →
                </span>
              )}
            </Fragment>
          ))}
        </div>
        <p className="stack-meta">
          저장 <strong>PostgreSQL · Redis · S3</strong> — 배포 <strong>ECS Fargate + Media EC2</strong>{' '}
          (ap-northeast-2)
        </p>
      </section>
    </div>
  )
}
