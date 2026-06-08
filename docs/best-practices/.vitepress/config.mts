import { fileURLToPath } from 'node:url';
import { phase } from './config/phase';
import { mergeConfig } from './config/shared';
import { filterDraftFromSidebar } from './config/sidebar';

// repo 루트 — shared/nav-apps.ts 를 dev 서버에서 serve 할 수 있게 fs.allow 에 추가
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const sidebar = [
  {
    text: '시작하기',
    link: '/introduce/',
  },
  {
    text: '좋은 코드란?',
    collapsed: false,
    items: [
      { text: '좋은 코드란?', link: '/best-code/' },
      {
        text: '부록 (추가예정)',
        collapsed: true,
        items: [
          { text: '프론트엔드에서 SOLID 원칙 (추가예정)', draft: true },
          { text: '선언적 프로그래밍 (추가예정)', draft: true },
          { text: '추상화 (추가예정)', draft: true },
          { text: '관심사의 분리 (추가예정)', draft: true },
          { text: '소프트웨어 공학 원칙 및 용어 (추가예정)', draft: true },
          { text: '인지과학기반 코드 잘 작성하기 (Toss) (추가예정)', draft: true },
        ],
      },
    ],
  },
  {
    text: '아키텍처',
    collapsed: false,
    items: [
      { text: '지역성 기반 폴더 구조', link: '/folder-structure/locality-based' },
      { text: 'FSD 아키텍처', link: '/folder-structure/fsd-architecture' },
    ],
  },
  {
    text: 'API',
    collapsed: false,
    items: [
      { text: 'API 함수 작성 패턴', link: '/api/api-function-pattern', draft: true },
      { text: 'API Client 정의', link: '/api/api-client', draft: true },
      { text: 'API 에러 처리', link: '/api/api-error-handling', draft: true },
      { text: 'VO 클래스 패턴', link: '/api/vo-pattern', draft: true },
    ],
  },
  {
    text: '추가 예정',
    collapsed: false,
    items: [
      { text: 'React Query 패턴', link: '/react-query/', draft: true },
      { text: '에러 핸들링', link: '/error-handling/', draft: true },
      { text: 'Logger 패턴', link: '/logger/', draft: true },
      { text: 'form 관리', draft: true },
    ],
  },
];

export default mergeConfig({
  title: 'Frontend Docs',
  description: '프론트엔드 개발 경험 모음집',

  base: '/frontend-docs',
  outDir: '.vitepress/dist',
  srcDir: 'content',

  // dev 포트 고정 — shared/nav-apps.ts 의 devPort(5173)와 일치해야 전환이 동작
  vite: {
    server: {
      port: 5173,
      strictPort: true,
      fs: { allow: [repoRoot] },
    },
  },

  themeConfig: {
    siteTitle: 'Frontend.zip',

    nav: [
      { text: '홈', link: '/' },
      { text: '블로그', link: 'https://kimseunggyu.vercel.app/' },
    ],

    sidebar: await filterDraftFromSidebar(sidebar, phase),

    socialLinks: [{ icon: 'github', link: 'https://github.com/kimseunggyu/notes' }],
  },
});
