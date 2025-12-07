import { mergeConfig } from 'shared-vitepress-config/shared.js'

export default mergeConfig({
  title: '프론트엔드 베스트 프랙티스',
  description: '변경하기 쉬운 프론트엔드 코드를 위한 지침서',

  base: '/best-practices/',
  outDir: '.vitepress/dist',
  srcDir: '.',

  themeConfig: {
    siteTitle: '프론트엔드 베스트 프랙티스',

    nav: [
      { text: '홈', link: '/' },
      { text: '기본 개념', link: '/basic-concepts/' },
      { text: '실전 사례', link: '/practical-cases/' }
    ],

    sidebar: [
      {
        text: '시작하기',
        items: [
          { text: '소개', link: '/' }
        ]
      },
      {
        text: '기본 개념',
        items: [
          { text: '개요', link: '/basic-concepts/' }
        ]
      },
      {
        text: '실전 사례',
        items: [
          { text: '개요', link: '/practical-cases/' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/yourusername/notes' }
    ]
  }
})
