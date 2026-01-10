---
to: docs/<%= name %>/.vitepress/config.mts
---
import { phase } from './config/phase';
import { mergeConfig } from './config/shared';
import { filterDraftFromSidebar } from './config/sidebar';

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

  themeConfig: {
    siteTitle: '<%= title %>',

    nav: [
      { text: '홈', link: '/' },
    ],

    sidebar: await filterDraftFromSidebar(sidebar, phase),

    socialLinks: [{ icon: 'github', link: 'https://github.com/kimseunggyu/notes' }],
  },
});
