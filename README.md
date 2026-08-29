# Notes

프론트엔드 개발 지식 및 업무 경험을 정리한 개인 블로그입니다.

## 📚 문서 사이트

| 사이트 | 배포 경로 | 설명 |
|--------|-----------|------|
| **[프론트엔드 베스트 프랙티스](docs/best-practices/)** | `/frontend-docs/` | 변경하기 쉬운 코드 작성 원칙 |
| **[개발 실록](docs/dev-sillok/)** | `/dev-sillok/` | 개념 정리를 넘어 실전 활용과 삽질의 기록 |
| **[Wiki](docs/wiki/)** | `/wiki/` | 여러 주제를 쌓는 개인 위키 (사이드바 자동 생성) |

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
pnpm best:dev
# → http://localhost:5173/frontend-docs/

# 개발 실록
pnpm sillok:dev
# → http://localhost:5174/dev-sillok/

# Wiki
pnpm wiki:dev
# → http://localhost:5175/wiki/
```

포트는 각 사이트 `config.mts` 의 `vite.server.port` 에 고정돼 있어서, 여러 터미널에서 동시에 띄워도 서로 밀리지 않습니다.

## 🏗️ 빌드

### 개별 빌드

```bash
pnpm best:build
pnpm sillok:build
pnpm wiki:build
```

### 전체 통합 빌드

모든 문서를 빌드하고 `dist/` 폴더에 통합합니다.

```bash
pnpm build
```

빌드 결과:
```
dist/
├── index.html              # 루트 랜딩 페이지
├── frontend-docs/          # 프론트엔드 베스트 프랙티스
├── dev-sillok/             # 개발 실록
└── wiki/                   # Wiki
```

## 👀 프리뷰

### 개별 프리뷰

```bash
pnpm best:preview
pnpm sillok:preview
pnpm wiki:preview
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
| `pnpm best:dev` \| `:build` \| `:preview` | 베스트 프랙티스 |
| `pnpm sillok:dev` \| `:build` \| `:preview` | 개발 실록 |
| `pnpm wiki:dev` \| `:build` \| `:preview` | Wiki |
| `pnpm build` | 전체 통합 빌드 |
| `pnpm preview` | 전체 통합 프리뷰 |
| `pnpm lint` \| `lint:fix` | Biome 검사 / 자동 수정 |
| `pnpm new:vitepress` | 새 문서 사이트 스캐폴딩 |

## 🏛️ 프로젝트 구조

```
notes/
├── docs/                           # 문서 사이트 (워크스페이스)
│   ├── best-practices/
│   │   ├── .vitepress/
│   │   │   ├── config.mts          # 사이트 고유 설정 (사이드바·제목·포트)
│   │   │   └── theme/index.ts      # @notes/shared 테마 re-export
│   │   ├── content/                # 마크다운 문서
│   │   └── package.json
│   ├── dev-sillok/                 # (동일 구조)
│   └── wiki/                       # (동일 구조 + 사이드바 자동 생성)
│
├── packages/
│   └── shared/                     # 사이트 공통 배관 (@notes/shared)
│       └── src/
│           ├── nav-apps.ts         # 앱 전환 레일 SSOT
│           ├── config.ts           # VitePress 공통 설정 (mergeConfig)
│           ├── theme.ts            # 공통 테마
│           ├── OneNavigation.vue   # 좌측 레일 컴포넌트
│           ├── sidebar.ts          # 사이드바 draft 필터
│           ├── phase.ts            # PHASE 판별 (live / dev)
│           ├── ga.ts               # Google Analytics
│           └── custom.css
│
├── _templates/vitepress/new/       # hygen 스캐폴딩 템플릿
├── .scripts/build.mjs              # 통합 빌드 스크립트
├── code-examples/                  # 문서에서 참조하는 코드 예제
├── public/index.html               # 루트 랜딩 페이지
├── dist/                           # 빌드 결과물
├── pnpm-workspace.yaml             # 워크스페이스 + catalog
└── biome.json
```

## 🧩 공통 배관 (`@notes/shared`)

사이트 3개가 테마·레일·설정을 공유합니다. 사이트에 남는 파일은 `config.mts` 와 `theme/index.ts` 둘뿐입니다.

- **앱 전환 레일에 항목을 추가하려면** `packages/shared/src/nav-apps.ts` 한 곳만 고칩니다.
- `draft: true` 인 항목은 `PHASE=live` 에서 레일에 노출되지 않습니다.

### PHASE

문서·레일의 공개 여부를 가르는 값입니다.

```
PHASE=live    프로덕션 (GA 활성화, draft 숨김)
그 외         dev (GA 비활성화, draft 노출)
```

`PHASE` 환경변수가 없으면 `VERCEL_ENV === 'production'` 일 때만 `live` 가 됩니다. 로컬에서 확인하려면 `PHASE=live pnpm build`.

### draft 숨기기

두 가지 방식이 있고 동작이 다릅니다.

- **사이드바 배열의 `draft: true`** (`config.mts`) — 사이드바 링크만 숨기고 페이지는 열립니다.
- **frontmatter `draft: true`** — 페이지 자체를 렌더하지 않습니다. wiki는 사이드바가 자동 생성이라 이 방식만 씁니다.

## ➕ 새 문서 사이트 추가

```bash
pnpm new:vitepress
# 또는 비대화형
pnpm new:vitepress --name my-docs --title "My Docs" --description "설명" --navTooltip "내 문서" --devPort 5176
```

`docs/{name}/` 생성과 함께 `packages/shared/src/nav-apps.ts`(레일)·`.scripts/build.mjs`(통합 빌드)에 자동으로 주입됩니다.

생성 후 남는 수동 작업은 둘입니다.

1. 루트 `package.json` 에 `{name}:dev` / `:build` / `:preview` 스크립트 추가
2. `nav-apps.ts` 의 아이콘 `TODO` 를 [heroicons](https://heroicons.com/) (Solid) 에서 골라 교체

## 🛠️ 기술 스택

- **[VitePress](https://vitepress.dev/)** - 정적 사이트 생성기
- **[pnpm](https://pnpm.io/)** - 패키지 매니저 (Workspace + Catalog)
- **[Vue 3](https://vuejs.org/)** - 컴포넌트 프레임워크
- **[vitepress-sidebar](https://vitepress-sidebar.cdget.com/)** - wiki 사이드바 자동 생성
- **[hygen](https://www.hygen.io/)** - 사이트 스캐폴딩
- **[Biome](https://biomejs.dev/)** - 린트 & 포맷
- **TypeScript** - 타입 안정성

## ⚡ 일반적인 개발 워크플로우

### 새 문서 작성

```bash
# 1. 개발 서버 실행
pnpm best:dev

# 2. 마크다운 파일 작성
# docs/best-practices/content/my-article/index.md

# 3. 사이드바에 등록
# docs/best-practices/.vitepress/config.mts 의 sidebar 배열
#   (wiki 는 이 단계가 없습니다 — 파일을 넣으면 자동으로 올라옵니다)

# 4. 브라우저에서 확인
# http://localhost:5173/frontend-docs/my-article
```

### 배포 전 확인

```bash
# 1. 린트
pnpm lint

# 2. 전체 빌드
pnpm build

# 3. 프리뷰로 최종 확인
pnpm preview
# → http://localhost:3000/

# 4. 공개 상태로도 확인 (draft 숨김 · GA 활성)
PHASE=live pnpm build
```

## 📝 라이선스

MIT


## TODO
- frontend ops 프로젝트 만들기
  - webpack, babel 내용 정리 및 실습 했던 내용들 
  - code scaffolding 도 괜찮을듯! 
  - A/B 테스트?
- api 실전 코드를 `code-examples` 에 추가하기 
- draft 메커니즘 통일 — 사이드바 배열 `draft`(링크만 숨김)와 frontmatter `draft`(페이지째 숨김)가 따로 논다
- 사이트 간 통합 검색 검토 (Algolia DocSearch) — VitePress 로컬 검색은 사이트 단위

### 베스트 템플릿 컨텐츠 내용 
- [x] 좋은 코드란?
- [x] folder-structure - 완료 - 배포전
- [x] api - 완료 - 배포전
- [x] 프론트엔드 코드 온보딩
- [x] error-handling
- [x] form
- [x] logger
- [ ] react-query
