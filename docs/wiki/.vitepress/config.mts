import { fileURLToPath } from 'node:url';
import { mergeConfig } from '@notes/shared/config';
import { isProduction, phase } from '@notes/shared/phase';
import { withSidebar } from 'vitepress-sidebar';
import type { SidebarSortItem } from 'vitepress-sidebar/types';

// repo 루트 — packages/shared 을 dev 서버에서 serve 할 수 있게 fs.allow 에 추가
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const vitePressOptions = {
  title: 'Wiki',
  description: '여러 주제를 쌓는 개인 위키',

  base: '/wiki/',
  outDir: '.vitepress/dist',
  srcDir: 'content',

  // live 에서 빠지는 것 — study 전체와 쓰는 중인 글. dev 프리뷰에서는 다 보인다.
  // VitePress 는 content/ 기준, vitepress-sidebar 는 docs/wiki 기준으로 glob 해서
  // 양쪽에 다 걸리도록 '**/' 를 붙인다 (안 붙이면 사이드바에만 링크가 남아 404)
  srcExclude: isProduction ? ['**/_study/**', '**/*.draft.md'] : [],

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

const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });

// sortMenusByCustomFunction 은 sortMenusByName 과 같이 못 쓴다 — 이름 정렬까지 여기서 한다
const sortMenus = (a: SidebarSortItem, b: SidebarSortItem) => {
  // frontmatter 의 order 가 있으면 그 순서로 (기초 → 심화처럼 읽는 차례가 있을 때).
  // 안 적은 문서는 뒤로 밀리고 이름순을 따른다.
  const orderOf = (x: SidebarSortItem) => (typeof x.frontmatter?.order === 'number' ? x.frontmatter.order : Number.POSITIVE_INFINITY);
  // 뺄셈으로 비교하면 order 가 둘 다 없을 때 Infinity - Infinity = NaN 이 되어 정렬이 깨진다
  const [ao, bo] = [orderOf(a), orderOf(b)];
  if (ao !== bo) return ao < bo ? -1 : 1;

  // _ 로 시작하는 폴더(_study 등)는 성격이 달라 맨 아래로
  const underscoreGap = Number(a.fileName.startsWith('_')) - Number(b.fileName.startsWith('_'));
  if (underscoreGap !== 0) return underscoreGap;

  const draftGap = Number(a.fileName.endsWith('.draft.md')) - Number(b.fileName.endsWith('.draft.md'));
  if (draftGap !== 0) return draftGap;

  return collator.compare(a.text ?? a.fileName, b.text ?? b.fileName);
};

// 사이드바는 content/ 스캔으로 자동 생성 — 문서를 추가해도 이 파일을 고치지 않는다
const sidebarOptions = {
  scanStartPath: 'content',
  useTitleFromFileHeading: true,
  useTitleFromFrontmatter: true,
  useFolderTitleFromIndexFile: true,
  collapsed: true,
  collapseDepth: 2,
  sortMenusByCustomFunction: sortMenus,
  sortFolderTo: 'bottom' as const,
};

export default mergeConfig(withSidebar(vitePressOptions, sidebarOptions));
