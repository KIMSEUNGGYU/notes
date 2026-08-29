---
to: docs/<%= name %>/.vitepress/config.mts
---
import { fileURLToPath } from 'node:url';
import { mergeConfig } from '@notes/shared/config';
import { phase } from '@notes/shared/phase';
import { filterDraftFromSidebar } from '@notes/shared/sidebar';

// repo 루트 — packages/shared 를 dev 서버에서 serve 할 수 있게 fs.allow 에 추가
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const sidebar = [
  {
    text: '시작하기',
    link: '/getting-started/',
  },
];

export default mergeConfig({
  title: '<%= title %>',
  description: '<%= description %>',

  base: '<%= base %>',
  outDir: '.vitepress/dist',
  srcDir: 'content',

  vite: {
    define: {
      __PHASE__: JSON.stringify(phase),
    },
    server: {
      port: <%= devPort %>,
      strictPort: true,
      fs: { allow: [repoRoot] },
    },
  },

  themeConfig: {
    siteTitle: '<%= title %>',

    nav: [{ text: '홈', link: '/' }],

    sidebar: await filterDraftFromSidebar(sidebar, phase),

    socialLinks: [{ icon: 'github', link: 'https://github.com/kimseunggyu/notes' }],
  },
});
