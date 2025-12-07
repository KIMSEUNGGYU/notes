import { mergeConfig } from 'shared-vitepress-config/shared.js'

export default mergeConfig({
  title: '업무 노트',
  description: '실무 경험과 문제 해결 기록',

  base: '/work-notes/',
  outDir: '.vitepress/dist',
  srcDir: '.',

  themeConfig: {
    siteTitle: '업무 노트',

    nav: [
      { text: '홈', link: '/' },
      { text: '이슈 모음', link: '/issues/' },
      { text: '폼 관리', link: '/form-management/' },
      { text: '인프라', link: '/infrastructure/' },
      {
        text: '다른 문서',
        items: [
          { text: '프론트엔드 글쓰기', link: '/frontend-writing/' }
        ]
      }
    ],

    sidebar: [
      {
        text: '시작하기',
        items: [
          { text: '소개', link: '/' }
        ]
      },
      {
        text: '이슈 모음',
        items: [
          { text: '개요', link: '/issues/' }
        ]
      },
      {
        text: '폼 관리',
        items: [
          { text: '개요', link: '/form-management/' }
        ]
      },
      {
        text: '인프라',
        items: [
          { text: '개요', link: '/infrastructure/' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/kimseunggyu/notes' }
    ]
  }
})
