import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // 저장소 루트의 원본 md를 ?raw로 임포트하기 위해 상위 디렉토리 접근 허용
      allow: [fileURLToPath(new URL('..', import.meta.url))],
    },
  },
})
