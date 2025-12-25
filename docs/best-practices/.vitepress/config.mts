import { mergeConfig } from './config/shared'

export default mergeConfig({
  title: '프론트엔드 베스트 프랙티스',
  description: '변경하기 쉬운 프론트엔드 코드를 위한 지침서',

  base: '/best-practices/',
  outDir: '.vitepress/dist',
  srcDir: '.',

  themeConfig: {
    siteTitle: '프론트엔드 베스트 프랙티스',

    nav: [
      { text: '홈', link: '/' }
    ],

    sidebar: [
      {
        text: '시작하기',
        items: [
          { text: '소개', link: '/' },
          { text: '핵심 철학', link: '/philosophy/' }
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
