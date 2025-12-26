import { mergeConfig } from './config/shared'

export default mergeConfig({
  title: 'Frontend Docs',
  description: '프론트엔드 개발 경험 모음집',

  base: '/frontend-docs/',
  outDir: '.vitepress/dist',
  srcDir: '.',

  themeConfig: {
    siteTitle: 'Frontend.zip',

    nav: [
      { text: '홈', link: '/' }
    ],

    sidebar: [
      {
        text: '시작하기',
        items: [
          { text: '소개', link: '/introduce/' },
          { text: '좋은 코드란?', link: '/best-code/' }
        ]
      },
      // {
      //   text: '아키텍처',
      //   collapsed: false,
      //   items: [
      //     { text: '개요', link: '/architecture/' },
      //     { text: '역할별 + Page First', link: '/architecture/folder-structure-role-based' },
      //     { text: 'FSD 아키텍처', link: '/architecture/folder-structure-fsd' }
      //   ]
      // },
      {
        text: 'API 관리',
        collapsed: false,
        items: [
          { text: '기본편', link: '/api/basic' },
          { text: '심화편', link: '/api/advanced' }
        ]
      }
      // {
      //   text: 'API',
      //   collapsed: false,
      //   items: [
      //     { text: '개요', link: '/api/' },
      //     { text: 'API 정의', link: '/api/definition' },
      //     { text: '인터셉터 패턴', link: '/api/interceptors' },
      //     { text: '에러 핸들링', link: '/api/error-handling' }
      //   ]
      // },
      // {
      //   text: 'React Query',
      //   collapsed: false,
      //   items: [
      //     { text: '개요', link: '/react-query/' },
      //     { text: '패턴', link: '/react-query/patterns' },
      //     { text: 'QueryKey 관리', link: '/react-query/query-key-management' }
      //   ]
      // },
      // {
      //   text: '에러 핸들링',
      //   collapsed: true,
      //   items: [
      //     { text: '개요', link: '/error-handling/' },
      //     { text: 'Error 정의', link: '/error-handling/error-definition' },
      //     { text: '리다이렉트 에러', link: '/error-handling/redirect-errors' }
      //   ]
      // },
      // {
      //   text: '기능 패턴',
      //   collapsed: true,
      //   items: [
      //     { text: '개요', link: '/features/' },
      //     { text: '인증 관리', link: '/features/auth' },
      //     { text: '폼 관리', link: '/features/form-management' },
      //     { text: '무한 스크롤', link: '/features/infinite-scroll' }
      //   ]
      // }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/kimseunggyu/notes' }
    ]
  }
})
