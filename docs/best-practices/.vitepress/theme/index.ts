import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import OneNavigation from '../../../../shared/components/components/OneNavigation.vue'
import './custom.css'

export default {
  extends: DefaultTheme, // ⭐ 기본 테마 확장
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-top': () => h(OneNavigation) // ⭐ 슬롯에 컴포넌트 삽입
    })
  }
} satisfies Theme
