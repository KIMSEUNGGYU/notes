import { execSync } from 'child_process'
import { existsSync, mkdirSync, cpSync, copyFileSync } from 'fs'
import { join } from 'path'

const workspaces = ['best-practices', 'work-notes']

console.log('🚀 통합 빌드를 시작합니다...\n')

// dist 폴더 생성
const distDir = 'dist'
if (existsSync(distDir)) {
  console.log('📁 기존 dist 폴더를 정리합니다...')
  execSync(`rm -rf ${distDir}`, { stdio: 'inherit' })
}
mkdirSync(distDir)

// 각 워크스페이스 빌드
for (const workspace of workspaces) {
  console.log(`\n📦 ${workspace} 빌드 중...`)
  try {
    execSync(`pnpm --filter ${workspace} build`, { stdio: 'inherit' })

    const sourcePath = join('docs', workspace, '.vitepress', 'dist')
    const targetPath = join(distDir, workspace)

    if (existsSync(sourcePath)) {
      console.log(`✅ ${workspace} → dist/${workspace}로 복사 중...`)
      cpSync(sourcePath, targetPath, { recursive: true })
    } else {
      console.error(`❌ ${workspace} 빌드 결과를 찾을 수 없습니다: ${sourcePath}`)
      process.exit(1)
    }
  } catch (error) {
    console.error(`❌ ${workspace} 빌드 실패:`, error.message)
    process.exit(1)
  }
}

// 루트 index.html 복사
console.log('\n📝 루트 index.html 복사 중...')
const publicIndexPath = 'public/index.html'
if (existsSync(publicIndexPath)) {
  copyFileSync(publicIndexPath, join(distDir, 'index.html'))
} else {
  console.error(`❌ ${publicIndexPath} 파일을 찾을 수 없습니다.`)
  process.exit(1)
}

console.log('\n✨ 빌드 완료!')
console.log(`\n📂 빌드 결과: ${distDir}/`)
console.log('   ├── index.html (루트 랜딩 페이지)')
console.log('   ├── best-practices/')
console.log('   └── work-notes/')
console.log('\n💡 로컬 프리뷰: npx serve dist')
