import { fileURLToPath } from 'node:url';
import { mergeConfig } from '@notes/shared/config';
import { isProduction, phase } from '@notes/shared/phase';
import { withSidebar } from 'vitepress-sidebar';

// repo 루트 — packages/shared 을 dev 서버에서 serve 할 수 있게 fs.allow 에 추가
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const vitePressOptions = {
  title: 'Wiki',
  description: '여러 주제를 쌓는 개인 위키',

  base: '/wiki/',
  outDir: '.vitepress/dist',
  srcDir: 'content',

  vite: {
    define: {
      __PHASE__: JSON.stringify(phase),
    },
    server: {
      port: 5175,
      strictPort: true,
      fs: { allow: [repoRoot] },
    },
  },

  themeConfig: {
    siteTitle: 'Wiki',

    nav: [{ text: '홈', link: '/' }],

    socialLinks: [{ icon: 'github', link: 'https://github.com/kimseunggyu/notes' }],
  },
};

// 사이드바는 content/ 스캔으로 자동 생성 — 문서를 추가해도 이 파일을 고치지 않는다
const sidebarOptions = {
  scanStartPath: 'content',
  useTitleFromFileHeading: true,
  useTitleFromFrontmatter: true,
  useFolderTitleFromIndexFile: true,
  collapsed: true,
  collapseDepth: 2,
  sortMenusByName: true,
  // draft 는 frontmatter 로만 거른다 (filterDraftFromSidebar 는 자동 사이드바와 같이 못 씀)
  ...(isProduction ? { excludeFilesByFrontmatterFieldName: 'draft' } : {}),
};

export default mergeConfig(withSidebar(vitePressOptions, sidebarOptions));
