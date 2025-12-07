import { execSync } from 'child_process'
import { existsSync, mkdirSync, cpSync, writeFileSync } from 'fs'
import { join } from 'path'

const workspaces = ['frontend-writing', 'work-notes']

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

// 루트 index.html 생성
console.log('\n📝 루트 index.html 생성 중...')
const rootIndexHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>개발 문서 모음</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      max-width: 800px;
      width: 100%;
      background: white;
      border-radius: 16px;
      padding: 48px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    h1 {
      font-size: 2.5rem;
      margin-bottom: 16px;
      color: #2c3e50;
      text-align: center;
    }

    .subtitle {
      text-align: center;
      color: #7f8c8d;
      margin-bottom: 48px;
      font-size: 1.1rem;
    }

    .links {
      display: grid;
      gap: 20px;
    }

    .link-card {
      display: block;
      padding: 32px;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      border-radius: 12px;
      text-decoration: none;
      color: #2c3e50;
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }

    .link-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
      border-color: #667eea;
    }

    .link-card h2 {
      font-size: 1.5rem;
      margin-bottom: 8px;
      color: #667eea;
    }

    .link-card p {
      color: #5a6c7d;
      line-height: 1.6;
    }

    @media (max-width: 640px) {
      .container {
        padding: 32px 24px;
      }

      h1 {
        font-size: 2rem;
      }

      .link-card {
        padding: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📚 개발 문서 모음</h1>
    <p class="subtitle">프론트엔드 개발 지식과 업무 경험을 한 곳에서</p>

    <div class="links">
      <a href="/frontend-writing/" class="link-card">
        <h2>✍️ 프론트엔드 글쓰기</h2>
        <p>개발자를 위한 효과적인 기술 문서 작성 가이드</p>
      </a>

      <a href="/work-notes/" class="link-card">
        <h2>💼 업무 노트</h2>
        <p>실무에서 배운 경험과 문제 해결 과정 기록</p>
      </a>
    </div>
  </div>
</body>
</html>
`

writeFileSync(join(distDir, 'index.html'), rootIndexHtml, 'utf-8')

console.log('\n✨ 빌드 완료!')
console.log(`\n📂 빌드 결과: ${distDir}/`)
console.log('   ├── index.html (루트 랜딩 페이지)')
console.log('   ├── frontend-writing/')
console.log('   └── work-notes/')
console.log('\n💡 로컬 프리뷰: npx serve dist')
