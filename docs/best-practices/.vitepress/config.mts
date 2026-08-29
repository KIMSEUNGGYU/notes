import { phase } from './config/phase';
import { mergeConfig } from './config/shared';
import { filterDraftFromSidebar } from './config/sidebar';

const sidebar = [
  {
    text: '시작하기',
    link: '/introduce/',
  },
  {
    text: '프론트엔드 코드 온보딩',
    link: '/onboarding/',
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
      {
        text: '부록 ',
        collapsed: true,
        items: [
          { text: 'FSD 아키텍처', link: '/folder-structure/fsd-architecture' },
        ],
      },

    ],
  },
  {
    text: 'API',
    collapsed: false,
    items: [
      { text: 'API', link: '/api' },
      {
        text: '부록 ',
        collapsed: true,
        items: [
          // { text: 'API Client 정의', link: '/api/api-client', draft: true },
          { text: 'API 함수 작성 패턴', link: '/api/api-function-pattern', draft: true },
          { text: 'API 에러 처리', link: '/api/api-error-handling', draft: true },
          { text: 'VO 클래스 패턴', link: '/api/vo-pattern', draft: true },
          // { text: 'SSR Hydration', link: '/api/ssr-hydration', draft: true },
        ],
      },
    ],
  },
  {
    text: '에러 핸들링',
    collapsed: false,
    items: [
      { text: '에러 핸들링', link: '/error-handling/' },
      {
        text: '부록',
        collapsed: true,
        items: [
          // { text: 'A. Remotes 에러 정규화', link: '/error-handling/remotes-mapping' },
          { text: 'B. React Query 정책', link: '/error-handling/react-query-policy' },
          // { text: 'C. errorCopy 중앙 관리', link: '/error-handling/error-copy' },
          // { text: 'D. 삼중 처리 계층 분리', link: '/error-handling/layered-architecture' },
        ],
      },
    ],
  },
  {
    text: 'Logger 패턴',
    collapsed: false,
    items: [
      { text: 'Logger 패턴', link: '/logger/' },
      {
        text: '부록',
        collapsed: true,
        items: [
          { text: '페이지별 셋업 + 실 사용 예제', link: '/logger/usage' },
        ],
      },
    ],
  },
  {
    text: 'form 관리',
    collapsed: false,
    items: [
      { text: 'form 관리', link: '/form/' },
      {
        text: '부록',
        collapsed: true,
        items: [
          { text: '조건부 폼', link: '/form/conditional-forms' },
        ],
      },
    ],
  },
  // {
  //   text: '추가 예정',
  //   collapsed: false,
  //   items: [
  //     { text: 'React Query 패턴', link: '/react-query/', draft: true },
  //     { text: '에러 핸들링', link: '/error-handling/', draft: true },
  //     { text: 'Logger 패턴', link: '/logger/', draft: true },
  //     { text: 'form 관리', draft: true },
  //   ],
  // },
];

export default mergeConfig({
  title: 'Frontend Docs',
  description: '프론트엔드 개발 경험 모음집',

  base: '/frontend-docs',
  outDir: '.vitepress/dist',
  srcDir: 'content',

  vite: {
    define: {
      __PHASE__: JSON.stringify(phase),
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
