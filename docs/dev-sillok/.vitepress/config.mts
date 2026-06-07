import { phase } from './config/phase';
import { mergeConfig } from './config/shared';
import { filterDraftFromSidebar } from './config/sidebar';

const sidebar = [
  {
    text: '시작하기',
    link: '/getting-started/',
  },
  {
    text: 'Claude Code 실전',
    collapsed: false,
    items: [
      { text: 'Claude Code 소개', link: '/claude-code/', draft: true },
      { text: '스킬 만들기 (추가예정)', draft: true },
      { text: '플러그인 개발 (추가예정)', draft: true },
      { text: '서브에이전트 & 하네스 (추가예정)', draft: true },
      { text: '컨텍스트 관리 (추가예정)', draft: true },
    ],
  },
  {
    text: '프롬프트 & 컨텍스트',
    collapsed: false,
    items: [
      { text: '프롬프트 & 컨텍스트 소개', link: '/prompting/', draft: true },
      { text: '프롬프트 설계 패턴 (추가예정)', draft: true },
      { text: '컨텍스트 엔지니어링 (추가예정)', draft: true },
    ],
  },
  {
    text: 'LLM 연동',
    collapsed: false,
    items: [
      { text: 'LLM 연동 소개', link: '/llm-integration/', draft: true },
      { text: 'AI SDK 스트리밍 (추가예정)', draft: true },
      { text: '구조화 출력 (추가예정)', draft: true },
      { text: 'MCP 연동 (추가예정)', draft: true },
    ],
  },
];

export default mergeConfig({
  title: '개발 실록',
  description: '개념 정리를 넘어 실전 활용과 삽질의 기록',

  base: '/dev-sillok/',
  outDir: '.vitepress/dist',
  srcDir: 'content',

  themeConfig: {
    siteTitle: '개발 실록',

    nav: [
      { text: '홈', link: '/' },
    ],

    sidebar: await filterDraftFromSidebar(sidebar, phase),

    socialLinks: [{ icon: 'github', link: 'https://github.com/kimseunggyu/notes' }],
  },
});
