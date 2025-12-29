import { mergeConfig } from './config/shared';
import { phase } from './config/phase';
import { filterDraftFromSidebar } from './config/sidebar';

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
          { text: '프론트엔드에서 SOLID 원칙 (추가예정)', draft: true, },
          { text: '선언적 프로그래밍 (추가예정)', draft: true, },
          { text: '추상화 (추가예정)', draft: true, },
          { text: '관심사의 분리 (추가예정)', draft: true, },
          { text: '소프트웨어 공학 원칙 및 용어 (추가예정)', draft: true, },
          { text: '인지과학기반 코드 잘 작성하기 (Toss) (추가예정)', draft: true, },
        ],
      },
    ],
  },
  {
    text: '아키텍처',
    collapsed: false,
    items: [
      { text: 'Feature 기반 폴더 구조', link: '/folder-structure/feature-based' },
      { text: 'FSD 아키텍처', link: '/folder-structure/fsd-architecture' },
    ],
  },
  {
    text: 'API',
    link: '/api/',
    // draft: true,
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
  srcDir: '.',

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
