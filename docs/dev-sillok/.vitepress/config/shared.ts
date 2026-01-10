import { defineConfig, type UserConfig } from 'vitepress';
import { isProduction } from './phase';

export const sharedConfig = defineConfig({
  lang: 'ko-KR',

  head: [],

  // 프로덕션에서 draft 페이지 제외
  transformPageData(pageData) {
    if (isProduction && pageData.frontmatter.draft) {
      return { ...pageData, frontmatter: { ...pageData.frontmatter, layout: false } };
    }
  },

  transformHead({ pageData, siteConfig }) {
    const head: Array<[string, Record<string, string>]> = [];
    const base = siteConfig.site.base.replace(/\/$/, '');

    // favicon
    head.push(['link', { rel: 'icon', href: `${base}/favicon.ico` }]);

    const title = pageData.frontmatter.title || pageData.title || siteConfig.site.title;
    const description =
      pageData.frontmatter.description || pageData.description || siteConfig.site.description;
    const pagePath = pageData.relativePath.replace(/index\.md$/, '').replace(/\.md$/, '');
    const url = `https://seunggyu.vercel.app${base}/${pagePath}`.replace(/\/+$/, '');
    const image = pageData.frontmatter.image || `https://seunggyu.vercel.app${base}/og-image.png`;

    head.push(['meta', { property: 'og:title', content: title }]);
    head.push(['meta', { property: 'og:description', content: description }]);
    head.push(['meta', { property: 'og:url', content: url }]);
    head.push(['meta', { property: 'og:image', content: image }]);
    head.push(['meta', { property: 'og:type', content: 'article' }]);
    head.push(['meta', { property: 'og:site_name', content: siteConfig.site.title }]);

    head.push(['meta', { name: 'twitter:card', content: 'summary_large_image' }]);
    head.push(['meta', { name: 'twitter:title', content: title }]);
    head.push(['meta', { name: 'twitter:description', content: description }]);
    head.push(['meta', { name: 'twitter:image', content: image }]);

    return head;
  },

  themeConfig: {
    // 검색 기능
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '검색',
                buttonAriaLabel: '검색',
              },
              modal: {
                noResultsText: '결과를 찾을 수 없습니다',
                resetButtonTitle: '검색 초기화',
                footer: {
                  selectText: '선택',
                  navigateText: '이동',
                  closeText: '닫기',
                },
              },
            },
          },
        },
      },
    },
    // 목차 (Table of Contents)
    outline: {
      level: [2, 3],
      label: '목차',
    },
    // 문서 하단
    docFooter: {
      prev: '이전',
      next: '다음',
    },

    darkModeSwitchLabel: '다크 모드',
    sidebarMenuLabel: '메뉴',
    returnToTopLabel: '맨 위로',

    lastUpdated: {
      text: '최종 수정',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    },
  },

  markdown: {
    lineNumbers: true,
  },

  cleanUrls: true,
  lastUpdated: true,
});

export function mergeConfig(override: UserConfig) {
  return defineConfig({
    ...sharedConfig,
    ...override,
    themeConfig: {
      ...sharedConfig.themeConfig,
      ...override.themeConfig,
    },
  });
}
