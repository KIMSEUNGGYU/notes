import type { Theme } from 'vitepress';
import { useRoute } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { h, nextTick, watch } from 'vue';
import HtmlEmbed from '../components/HtmlEmbed.vue';
import OneNavigation from '../components/OneNavigation.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-top': () => h(OneNavigation),
    });
  },
  enhanceApp({ app }) {
    app.component('HtmlEmbed', HtmlEmbed);
  },
  setup() {
    if (typeof window === 'undefined') return;

    const route = useRoute();

    // 사이드바에서 새탭(target=_blank)으로 표시된 링크는 footer의 prev/next에서도
    // 새탭으로 열리게 맞춘다(발표자료처럼 독립 페이지의 일관성 유지).
    watch(
      () => route.path,
      () => {
        nextTick(() => {
          const blankHrefs = new Set(
            Array.from(
              document.querySelectorAll<HTMLAnchorElement>('.VPSidebar a[target="_blank"]'),
            ).map((a) => a.getAttribute('href')),
          );

          for (const link of document.querySelectorAll<HTMLAnchorElement>(
            '.VPDocFooter a.pager-link',
          )) {
            if (blankHrefs.has(link.getAttribute('href'))) {
              link.target = '_blank';
              link.rel = 'noreferrer';
            }
          }
        });
      },
      { immediate: true },
    );
  },
} satisfies Theme;
