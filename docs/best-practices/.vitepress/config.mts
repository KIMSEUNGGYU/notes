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
        link: '/introduce',
      },
      { 
        text: '좋은 코드란?', 
        collapsed: false,
        items: [
          { text: '좋은 코드란?', link: '/best-code' },
          {
            text: '부록 (추가예정)',
            collapsed: true,
            items: [
              { text: '프론트엔드에서 SOLID 원칙 (추가예정)' },
              { text: '선언적 프로그래밍 (추가예정)' },
              { text: '추상화 (추가예정)' },
              { text: '관심사의 분리 (추가예정)' },
              { text: '소프으퉤어 공학 원칙 및 용어 (추가예정)' },
              { text: '인지과학기반 코드 잘 작성하기 (Toss) (추가예정)' },
            ]
          }
        ]
      }, 
      {
        text: '아키텍처 (초안-개선하기)',
        collapsed: false,
        items: [
          { text: '개요', link: '/folder-structure/principles' },
          { text: 'Feature 기반 폴더 구조', link: '/folder-structure/feature-based' },
          { text: 'FSD 아키텍처', link: '/folder-structure/fsd-architecture' }
        ]
      },
      {
        text: 'API 관리 (초안-개선하기)',
        collapsed: false,
        items: [
          { text: '기본편', link: '/api/basic' },
          { text: '심화편', link: '/api/advanced' }
        ]
      },
      {
        text: '추가 예정',
        collapsed: true,
        items: [
          { text: 'react-query 패턴',  },
          { text: '에러 핸들링',  },
          { text: 'form 관리',  },
          { text: 'logger',  },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/kimseunggyu/notes' }
    ]
  }
})
