# Notes

프론트엔드 개발 지식 및 업무 경험을 정리한 개인 블로그입니다.

## 📚 문서 사이트

- **[프론트엔드 베스트 프랙티스](docs/best-practices/)** - 변경하기 쉬운 코드 작성 원칙
- **[업무 노트](docs/work-notes/)** - 실무 경험과 문제 해결 기록

## 🚀 시작하기

### 필수 요구사항

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 설치

```bash
pnpm install
```

## 💻 개발

### 개별 문서 개발

특정 문서만 개발 서버를 실행합니다. (권장)

```bash
# 프론트엔드 베스트 프랙티스
pnpm docs:best-practices:dev
# → http://localhost:5173/best-practices/

# 업무 노트
pnpm docs:work:dev
# → http://localhost:5173/work-notes/
```

### 동시 개발

여러 문서를 동시에 개발하려면 터미널을 여러 개 사용하세요.

```bash
# 터미널 1
pnpm docs:best-practices:dev  # localhost:5173

# 터미널 2
pnpm docs:work:dev             # localhost:5174 (자동으로 다른 포트)
```

## 🏗️ 빌드

### 개별 빌드

```bash
# 프론트엔드 베스트 프랙티스만 빌드
pnpm docs:best-practices:build

# 업무 노트만 빌드
pnpm docs:work:build
```

### 전체 통합 빌드

모든 문서를 빌드하고 `dist/` 폴더에 통합합니다.

```bash
pnpm build
```

빌드 결과:
```
dist/
├── index.html              # 루트 리다이렉트 페이지
├── best-practices/         # 프론트엔드 베스트 프랙티스
└── work-notes/             # 업무 노트
```

## 👀 프리뷰

### 개별 프리뷰

빌드 없이 개별 문서를 미리봅니다.

```bash
# 프론트엔드 베스트 프랙티스
pnpm docs:best-practices:preview

# 업무 노트
pnpm docs:work:preview
```

### 전체 프리뷰

통합 빌드 결과를 미리봅니다. (배포 전 최종 확인)

```bash
# 1. 전체 빌드
pnpm build

# 2. 프리뷰 서버 실행
pnpm preview
# → http://localhost:3000/
```

## 📋 명령어 요약

| 명령어 | 설명 |
|--------|------|
| `pnpm docs:best-practices:dev` | 베스트 프랙티스 개발 서버 |
| `pnpm docs:best-practices:build` | 베스트 프랙티스 빌드 |
| `pnpm docs:best-practices:preview` | 베스트 프랙티스 프리뷰 |
| `pnpm docs:work:dev` | 업무 노트 개발 서버 |
| `pnpm docs:work:build` | 업무 노트 빌드 |
| `pnpm docs:work:preview` | 업무 노트 프리뷰 |
| `pnpm build` | 전체 통합 빌드 |
| `pnpm preview` | 전체 통합 프리뷰 |

## 🏛️ 프로젝트 구조

```
notes/
├── docs/                           # 문서 워크스페이스
│   ├── best-practices/            # 프론트엔드 베스트 프랙티스
│   │   ├── .vitepress/
│   │   │   ├── config.mts         # VitePress 설정
│   │   │   ├── config/            # 공통 설정
│   │   │   ├── components/        # Vue 컴포넌트
│   │   │   └── theme/             # 커스텀 테마
│   │   ├── index.md
│   │   └── package.json
│   │
│   └── work-notes/                # 업무 노트
│       └── (동일 구조)
│
├── scripts/
│   └── build.mjs                  # 통합 빌드 스크립트
│
├── dist/                          # 빌드 결과물
├── package.json                   # 루트 패키지 설정
├── pnpm-workspace.yaml            # pnpm 워크스페이스 + catalog
└── README.md
```

## 🛠️ 기술 스택

- **[VitePress](https://vitepress.dev/)** - 정적 사이트 생성기
- **[pnpm](https://pnpm.io/)** - 패키지 매니저 (Workspace + Catalog)
- **[Vue 3](https://vuejs.org/)** - 컴포넌트 프레임워크
- **TypeScript** - 타입 안정성

## 📖 참고 문서

- [프로젝트 구조 가이드](PROJECT_GUIDE.md) - 상세한 프로젝트 구조 설명
- [AI 컨텍스트](AI_CONTEXT/) - Claude와의 개발 기록

## ⚡ 일반적인 개발 워크플로우

### 새 문서 작성

```bash
# 1. 개발 서버 실행
pnpm docs:best-practices:dev

# 2. 마크다운 파일 작성
# docs/best-practices/my-article.md

# 3. 브라우저에서 확인
# http://localhost:5173/best-practices/my-article
```

### 배포 전 확인

```bash
# 1. 전체 빌드
pnpm build

# 2. 프리뷰로 최종 확인
pnpm preview

# 3. 모든 사이트 네비게이션 테스트
# http://localhost:3000/
```

## 📝 라이선스

MIT


## TODO
- wiki 프로젝트 만들기 
  - 토스 실록 + typescript, git, 등등 만들기
- frontend ops 프로젝트 만들기
  - webpack, babel 내용 정리 및 실습 했던 내용들 
  - code scaffolding 도 괜찮을듯! 
  - A/B 테스트?
  - 
