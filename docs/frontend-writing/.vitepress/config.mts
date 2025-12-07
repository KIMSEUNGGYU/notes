import { mergeConfig } from 'shared-vitepress-config/shared.js'

export default mergeConfig({
  title: '프론트엔드 글쓰기',
  description: '개발자를 위한 효과적인 글쓰기 가이드',

  base: '/frontend-writing/',
  outDir: '.vitepress/dist',
  srcDir: '.',

  themeConfig: {
    siteTitle: '프론트엔드 글쓰기',

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
