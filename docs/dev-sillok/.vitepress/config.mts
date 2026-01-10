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
