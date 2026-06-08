import { fileURLToPath } from 'node:url';
import { phase } from './config/phase';
import { mergeConfig } from './config/shared';
import { filterDraftFromSidebar } from './config/sidebar';

// repo 루트 — shared/nav-apps.ts 를 dev 서버에서 serve 할 수 있게 fs.allow 에 추가
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const sidebar = [
  {
    text: '시작하기',
    link: '/getting-started/',
  },
  {
    text: 'AI',
    items: [
      {
        text: 'Claude Code',
        collapsed: false,
        items: [
          { text: '플러그인 4가지 컴포넌트', link: '/claude-code/plugin-components', draft: true },
          { text: '사내 세션', link: '/claude-code/cc-session',draft: true },
          { text: '사내 세션 A/S', link: '/claude-code/cc-session-as',draft: true },
          {
            text: '플러그인 발표자료',
            link: '/claude-code/cc-plugin',
            target: '_blank',
            rel: 'noreferrer',
          },
        ],
      },
    ],
  },
];

export default mergeConfig({
  title: '개발 실록',
  description: '개념 정리를 넘어 실전 활용과 삽질의 기록',

  base: '/dev-sillok/',
  outDir: '.vitepress/dist',
  srcDir: 'content',

  // dev 포트 고정 — shared/nav-apps.ts 의 devPort(5174)와 일치해야 전환이 동작
  vite: {
    server: {
      port: 5174,
      strictPort: true,
      fs: { allow: [repoRoot] },
    },
  },

  themeConfig: {
    siteTitle: '개발 실록',

    nav: [{ text: '홈', link: '/' }],

    sidebar: await filterDraftFromSidebar(sidebar, phase),

    socialLinks: [{ icon: 'github', link: 'https://github.com/kimseunggyu/notes' }],
  },
});
