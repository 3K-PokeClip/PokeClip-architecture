// 저장소 루트의 다이어그램 HTML(원본)을 public/diagrams/로 복사한다.
// 원본이 단일 소스 — site/ 쪽 복사본은 빌드 산출물로 취급하고 커밋하지 않는다.
import { cpSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')
const dest = join(here, '..', 'public', 'diagrams')

const files = readdirSync(repoRoot).filter((f) => /^[0-5]_Pokeclip_.*\.html$/.test(f))
if (files.length === 0) {
  throw new Error(`다이어그램 HTML을 찾지 못했습니다: ${repoRoot}`)
}

mkdirSync(dest, { recursive: true })
for (const f of files) {
  cpSync(join(repoRoot, f), join(dest, f))
}
console.log(`[sync-diagrams] ${files.length}개 복사 → public/diagrams/`)
