import { defineConfig } from 'vitepress'

export const sharedConfig = defineConfig({
  lang: 'ko-KR',

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
                buttonAriaLabel: '검색'
              },
              modal: {
                noResultsText: '결과를 찾을 수 없습니다',
                resetButtonTitle: '검색 초기화',
                footer: {
                  selectText: '선택',
                  navigateText: '이동',
                  closeText: '닫기'
                }
              }
            }
          }
        }
      }
    },
    // 목차 (Table of Contents)
    outline: {
      level: [2, 3],
      label: '목차'
    },
    // 문서 하단
    docFooter: {
      prev: '이전',
      next: '다음'
    },

    darkModeSwitchLabel: '다크 모드',
    sidebarMenuLabel: '메뉴',
    returnToTopLabel: '맨 위로',

    lastUpdated: {
      text: '최종 수정',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    }
  },

  markdown: {
    lineNumbers: true
  },

  cleanUrls: true,
  lastUpdated: true
})

export function mergeConfig(override) {
  return defineConfig({
    ...sharedConfig,
    ...override,
    themeConfig: {
      ...sharedConfig.themeConfig,
      ...override.themeConfig
    }
  })
}
