import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { h, onMounted, onUnmounted } from 'vue';
import OneNavigation from '../components/OneNavigation.vue';
import { initGATracking } from '../config/ga';
import './custom.css';

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-top': () => h(OneNavigation),
    });
  },
  setup() {
    if (typeof window === 'undefined') return;

    let cleanup: (() => void) | undefined;

    onMounted(() => {
      cleanup = initGATracking();
    });

    onUnmounted(() => {
      cleanup?.();
    });
  },
} satisfies Theme;
