# Notes

프론트엔드 개발 지식 및 업무 경험을 정리한 개인 블로그입니다.

## 📚 문서 사이트

| 사이트 | 배포 경로 | 설명 |
|--------|-----------|------|
| **[프론트엔드 베스트 프랙티스](docs/best-practices/)** | `/frontend-docs/` | 변경하기 쉬운 코드 작성 원칙 |
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

# Wiki
pnpm wiki:dev
# → http://localhost:5175/wiki/
```

포트는 각 사이트 `config.mts` 의 `vite.server.port` 에 고정돼 있어서, 여러 터미널에서 동시에 띄워도 서로 밀리지 않습니다.

## 🏗️ 빌드

### 개별 빌드

```bash
pnpm best:build
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
└── wiki/                   # Wiki
```

## 👀 프리뷰

### 개별 프리뷰

```bash
pnpm best:preview
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
│   └── wiki/                       # (동일 구조 + 사이드바 자동 생성)
│       └── content/
│           ├── _study/{주제}/     # 다듬는 중 — live 에서 통째로 제외
│           │   ├── 개념/           # 활용하기 위해 알아야 하는 것
│           │   └── *.md            # 그 개념을 실전에 어떻게 활용했나
│           └── {주제}/             # 발행 글 (*.draft.md 는 live 에서 제외)
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

사이트 2개가 테마·레일·설정을 공유합니다. 사이트에 남는 파일은 `config.mts` 와 `theme/index.ts` 둘뿐입니다.

- **앱 전환 레일에 항목을 추가하려면** `packages/shared/src/nav-apps.ts` 한 곳만 고칩니다.
- `draft: true` 인 항목은 `PHASE=live` 에서 레일에 노출되지 않습니다.

### PHASE

문서·레일의 공개 여부를 가르는 값입니다.

```
PHASE=live    프로덕션 (GA 활성화, draft 숨김)
그 외         dev (GA 비활성화, draft 노출)
```

`PHASE` 환경변수가 없으면 `VERCEL_ENV === 'production'` 일 때만 `live` 가 됩니다. 로컬에서 확인하려면 `PHASE=live pnpm build`.

### 공개 안 할 문서 숨기기

사이트마다 방식이 다릅니다.

- **best-practices** — `config.mts` 사이드바 배열의 `draft: true`. 사이드바 링크만 숨기고 페이지는 열립니다.
- **wiki** — 경로·파일명 규칙. `content/_study/` 전체와 `*.draft.md` 가 `srcExclude` 로 빠져서 페이지 자체가 안 만들어집니다. 발행 글은 `content/{주제}/` 에 둡니다 (posts 같은 껍데기 폴더 없음).

wiki는 사이드바가 자동 생성이라 배열에 플래그를 달 자리가 없어서 규칙으로 가릅니다.

### wiki 문서 배치

최상위는 **주제 폴더**입니다. 사이드바가 이름순이라 폴더 이름만 맞추면 읽는 차례가 되고,
`_` 로 시작하는 것만 맨 아래로 밀립니다(`config.mts` 의 `sortMenus`).

**어디에 두나 — 완성도로 가릅니다.**

```
_study/{주제}/   아직 다듬는 중. 정리가 안 끝났다 (앞의 _ 는 "주제가 아니라 상태"라는 표시)
{주제}/          완성된 것. 발행 전까지 파일명에 .draft 를 붙인다
```

둘 다 live 에서 빠지므로 회사 맥락을 편하게 씁니다. 다 다듬으면 `.draft` 만 떼면 발행됩니다.

**주제 안에서 어떻게 나누나 — 우리 코드·이슈번호·실측 없이도 읽히나** 하나로 가릅니다.

```
{주제}/
├── 개념/                활용하기 위해 알아야 하는 것 (읽힌다)
└── {활용문서}.md         그 개념을 실전에 어떻게 활용했나 (우리 것이 있어야 말이 된다)
```

**활용 문서는 폴더로 감싸지 않고 주제 폴더 바로 아래 둡니다.** 그게 그 주제의 본문이라 사이드바에서 바로 보여야 하고, `개념/` 은 참고하려고 들어가는 곳이라 접혀 있어도 됩니다.

사이드바가 폴더 스캔으로 자동 생성되므로 목차용 `index.md` 는 두지 않습니다 — 같은 목록이 두 곳이 됩니다.

둘 다 계속 갱신되므로 **날짜 접두사를 붙이지 않습니다.** 언제 썼는지는 git 이력이 답합니다.
활용 문서는 주어가 날짜가 아니라 개념이라, 맨 위에 「읽기 전에 — 관련 개념」 표로 `개념/` 문서의 절을 가리킵니다.

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
- 공개 제어 방식 통일 — best-practices는 사이드바 배열 `draft`, wiki는 경로·파일명 규칙
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
