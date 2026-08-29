# wiki 워크스페이스 추가 — 작업 인계

> 다른 환경에서 이어서 작업하기 위한 인계 문서.
> 작업 완료 후 이 파일은 삭제해도 됨.

---

## 1. 배경: 왜 이 작업을 하는가

### 검토했던 것

로컬 문서를 블로그로 관리하고 싶고, GitBook(`taewoongs-organization.gitbook.io/jtwjs-dev-wiki` 같은 형태)으로
갈아탈지 검토했음.

### 결론

**GitBook 안 씀. 기존 VitePress 모노레포 유지 + `wiki` 워크스페이스 추가.**

### 근거 (측정된 값 — 다시 조사하지 말 것)

| 항목 | 측정값 |
|---|---|
| GitBook 참고 위키 규모 | 465 페이지, 페이지당 중앙값 365단어, 200단어 미만 스텁 23% |
| GitBook URL 품질 | **465개 중 161개(35%)가 `undefined-N.md`** — 한글 제목이 슬러그 변환 실패 |
| GitBook 비용 | 유료 사이트 월 $65/site + 사용자당 $12. 무료는 `*.gitbook.io` 도메인 |
| 이 repo 문서 | 25개 md, 약 21,000단어, 문서당 중앙값 1,056단어 |
| 워크스페이스당 중복 배관 | **약 410줄** (OneNavigation.vue 157, shared.ts 113, sidebar.ts 56, theme/index.ts 28, NavigationItems.ts 31, custom.css 18, phase.ts 7) |
| 문서 간 내부 링크 | **25개 문서 통틀어 28개** (문서당 1.1개, 결합도 매우 낮음) |

### 검토 중 뒤집힌 가설 (재론 금지)

- ~~"GitBook은 락인이 심해 마이그레이션이 비싸다"~~
  → **틀림.** GitBook은 모든 페이지를 `URL + .md`로 노출하고 `llms.txt`에 전체 인덱스가 있음.
  Git Sync(양방향)도 있어서 락인 거의 없음.
- ~~"파일 재배치 비용이 비싸서 여러 주제 관리에 불리하다"~~
  → **틀림.** 내부 링크가 28개뿐이고 `ignoreDeadLinks` 미설정(기본값 false)이라
  링크 깨지면 빌드가 실패해서 자동 검출됨. `git mv` + 사이드바 1줄이면 끝.
  오히려 GitBook은 빌드 타임 링크 검사가 없어서 이 축은 **이 repo가 유리**.

### GitBook이 실제로 우위인 것 (인정하되 채택 안 함)

1. 브라우저/모바일에서 바로 작성 → `github.dev`로 대체 가능
2. 사이트 간 통합 검색 → 사이트 2~3개 규모에서는 체감 낮음
3. 배관 0줄 → 아래 "나중에 할 일"의 preset 추출로 해소

### 남은 진짜 문제

`frontend-docs`의 사이드바가 `config.mts`의 **수동 TS 배열**이라
문서 하나 추가할 때마다 config 편집이 필요함. 이 마찰 때문에
"정형화된 글만 올리게" 되고 잡다한 주제를 못 쌓음.

→ **해결: 새 `wiki` 워크스페이스에 `vitepress-sidebar`로 자동 사이드바.**
md 파일을 폴더에 던지면 사이드바에 자동으로 뜨는 공간을 만든다.
`frontend-docs`는 지금처럼 수동 큐레이션 유지(정형화된 가이드라인용).

---

## 2. 시작 전 repo 상태 (2026-08-29 기준)

```
현재 브랜치: dev
dev == origin/dev  (푸시됨)
dev vs origin/main → 14 ahead / 6 behind
```

### 중요: 브랜치 전략은 건드리지 말 것

`dev`는 **의도적인 비공개 프리뷰 환경**이다. 아직 공개하고 싶지 않은 내용을
여기에 두고 본인만 확인하는 용도. `dev → main` 머지는 본인이 원할 때만 한다.
**이 작업에서 머지를 시도하지 말 것.**

### 미커밋 변경 (staged)

```
M  docs/best-practices/.vitepress/config.mts
D  docs/best-practices/content/form/basic-patterns.md
A  docs/best-practices/content/form/index.md
D  docs/best-practices/content/form/practical-tips.md
```

form 리팩터링 진행 중(`basic-patterns` + `practical-tips` → `index.md` 통합).
**wiki 작업 시작 전에 이것부터 커밋해서 작업을 분리할 것.**

### 브랜치 간 차이 (참고용, 건드리지 말 것)

- `dev`에만: `api/index.md`, `api/ssr-hydration.md`, `error-handling/*` 부록,
  `logger/usage.md`, `dev-sillok/content/ai/*`
- `main`에만: `dev-sillok/content/claude-code/*` (cc-session, cc-session-as, plugin-components),
  `shared/nav-apps.ts`
- **`dev` 브랜치에는 `shared/` 폴더가 없다.** `main`에는 있음. 아래 함정 3번 참조.

---

## 3. 할 일: `wiki` 워크스페이스 추가

### 3-1. 새 브랜치에서 시작

```bash
cd /Users/gyu/dev/git/notes
git status                    # staged 변경 먼저 커밋
git checkout -b feat/wiki     # dev 기준으로 분기
```

### 3-2. 스캐폴딩

```bash
pnpm new:vitepress
```

hygen이 4가지를 물어봄:

| 질문 | 입력할 값 |
|---|---|
| 프로젝트 이름 (kebab-case) | `wiki` |
| 사이트 제목 | `Wiki` (또는 원하는 이름) |
| 사이트 설명 | 여러 주제를 쌓는 개인 위키 |
| 좌측 네비게이션 툴팁 | `위키` |

base path는 이름에서 자동 생성됨 (`/wiki/`).

### 3-3. vitepress-sidebar 설치

```bash
pnpm add -D vitepress-sidebar --filter wiki
```

`docs/wiki/.vitepress/config.mts`를 `withSidebar`로 감싼다:

```ts
import { withSidebar } from 'vitepress-sidebar';
import { phase, isProduction } from './config/phase';
import { mergeConfig } from './config/shared';

const vitePressOptions = {
  title: 'Wiki',
  description: '여러 주제를 쌓는 개인 위키',
  base: '/wiki/',
  outDir: '.vitepress/dist',
  srcDir: 'content',
  vite: {
    define: { __PHASE__: JSON.stringify(phase) },
    server: { port: 5175, strictPort: true },   // 함정 4번 참조
  },
  themeConfig: {
    siteTitle: 'Wiki',
    nav: [{ text: '홈', link: '/' }],
    socialLinks: [{ icon: 'github', link: 'https://github.com/kimseunggyu/notes' }],
  },
};

const sidebarOptions = {
  documentRootPath: 'docs/wiki',
  scanStartPath: 'content',
  useTitleFromFileHeading: true,      // md 의 H1 을 사이드바 제목으로
  useTitleFromFrontmatter: true,      // frontmatter title 우선
  useFolderTitleFromIndexFile: true,
  collapsed: true,
  collapseDepth: 2,
  sortMenusByName: true,
  // 함정 5번 참조: PHASE=live 일 때만 draft 제외
  ...(isProduction ? { excludeFilesByFrontmatterFieldName: 'draft' } : {}),
};

export default mergeConfig(withSidebar(vitePressOptions, sidebarOptions));
```

> `mergeConfig`가 내부에서 `defineConfig`를 호출하는지 확인 필요.
> 기존 두 워크스페이스는 `mergeConfig({...})` 형태로 쓰고 있으니 그대로 맞추면 됨.
> 안 맞으면 `defineConfig(withSidebar(...))` 결과를 `mergeConfig`에 넘기는 형태로 조정.

### 3-4. 함정 5개 — 이거 빼먹으면 조용히 깨진다

**함정 1. `.scripts/build.mjs` 워크스페이스 배열이 하드코딩**

```js
const workspaces = [
  { name: 'best-practices', outputDir: 'frontend-docs' },
  { name: 'dev-sillok', outputDir: 'dev-sillok' },
  { name: 'wiki', outputDir: 'wiki' },          // ← 추가 필수
];
```

여기 추가 안 하면 `pnpm build`에서 **에러도 없이 그냥 누락**된다.
(여유 되면 `docs/*` glob 스캔으로 바꾸면 앞으로 이 함정이 사라짐)

빌드 완료 로그의 트리 출력도 같이 수정:
```js
console.log('   ├── frontend-docs/');
console.log('   ├── dev-sillok/');
console.log('   └── wiki/');
```

**함정 2. 루트 `package.json` 스크립트 3줄**

```json
"docs:wiki:dev": "pnpm --filter wiki dev",
"docs:wiki:build": "pnpm --filter wiki build",
"docs:wiki:preview": "pnpm --filter wiki preview"
```

**함정 3. 좌측 레일(`NavigationItems.ts`)을 3곳 수정해야 함**

`dev` 브랜치에는 `shared/nav-apps.ts` SSOT가 **없다.**
각 워크스페이스가 `NAVIGATION_ITEMS` 배열을 통째로 복붙해서 갖고 있음.

따라서 wiki를 추가하면 아래 **3개 파일 모두**에 동일한 항목을 넣어야 한다:

```
docs/best-practices/.vitepress/components/NavigationItems.ts
docs/dev-sillok/.vitepress/components/NavigationItems.ts
docs/wiki/.vitepress/components/NavigationItems.ts        (신규)
```

추가할 항목:
```ts
{
  path: '/wiki/',
  href: '/wiki/',
  tooltip: '위키',
  icon: `<path d="..."/>`,   // https://heroicons.com/ Solid 스타일
},
```

> 하나라도 빠뜨리면 그 사이트에서만 레일이 다르게 보인다.
> 이미 같은 이유로 `dev-sillok`에 GA가 누락된 전례가 있음 (아래 "알려진 이슈" 참조).
>
> **선택:** `main`의 `shared/nav-apps.ts`를 `dev`로 가져와 SSOT를 복원하면
> 앞으로 1곳만 고치면 됨. 다만 브랜치 간 파일을 옮기는 거라 별도 커밋으로 분리할 것.

**함정 4. dev 서버 포트는 5175**

5173(best-practices), 5174(dev-sillok)가 이미 사용 중.
`config.mts`의 `vite.server.port`와 `NavigationItems.ts`의 `devPort`가
**반드시 일치**해야 dev 환경에서 앱 전환이 동작한다.

**함정 5. `withSidebar`는 수동 sidebar를 덮어쓴다**

공식 문서: "Any manual `sidebar` options you may have set previously will be overridden."

- → `wiki`에만 적용할 것. `frontend-docs`/`dev-sillok`은 절대 건드리지 말 것.
- → 기존 `filterDraftFromSidebar()`(사이드바 배열의 `draft: true` 필터)는
  자동 사이드바와 **같이 못 쓴다.** wiki에서는 frontmatter `draft: true` +
  `excludeFilesByFrontmatterFieldName: 'draft'`로 대체한다.
- → 이 옵션은 정적이라 PHASE 분기를 직접 해야 함 (위 3-3 코드의 `isProduction` 삼항 참조).
- → `srcExclude`도 자동으로 반영됨 (문서에 명시).

**수정 불필요한 것** (헷갈리지 말 것)
- `pnpm-workspace.yaml` — `packages: ['docs/*']`라 자동 인식됨
- `vercel.json` — 루트 리다이렉트만 있어서 `/wiki/`는 자동으로 잡힘

### 3-5. 검증

```bash
# 1. 자동 사이드바가 실제로 동작하는지
mkdir -p docs/wiki/content/typescript
cat > docs/wiki/content/typescript/satisfies.md <<'EOF'
# satisfies 연산자

테스트 문서.
EOF
pnpm docs:wiki:dev
# → localhost:5175/wiki/ 에서 config 수정 없이 사이드바에 떠야 성공

# 2. draft 제외가 동작하는지 (frontmatter 에 draft: true 넣고)
PHASE=live pnpm docs:wiki:build
# → 사이드바에서 빠져야 함

# 3. 통합 빌드에 포함되는지 (함정 1 검증)
pnpm build
ls dist/
# → index.html, frontend-docs/, dev-sillok/, wiki/ 넷 다 있어야 함

# 4. 레일 전환 (함정 3, 4 검증)
pnpm preview
# → localhost:3000 에서 세 사이트 아이콘 전환 + active 하이라이트 확인

# 5. 린트
pnpm lint
```

### 3-6. 성공 기준

**md 파일을 `docs/wiki/content/` 아래에 던져넣기만 하면
`config.mts` 수정 없이 사이드바에 자동으로 뜬다.**

이게 되면 목적 달성. (GitBook에서 원했던 운영 감각이 이것)

---

## 4. 나중에 할 일 (이번 작업 범위 아님)

### 4-1. `packages/docs-preset` 추출 — 우선순위 높음

워크스페이스당 410줄 중복을 없애는 1회성 리팩터링.

```
packages/docs-preset/          ← OneNavigation.vue, sidebar.ts, shared.ts,
                                  theme/index.ts, custom.css, phase.ts, ga.ts
docs/frontend-docs/.vitepress/config.mts   ← 20줄로 축소
docs/dev-sillok/.vitepress/config.mts
docs/wiki/.vitepress/config.mts
```

- `pnpm-workspace.yaml`에 `packages/*` 추가 필요 (현재 `docs/*`만 있음)
- GA는 워크스페이스별 on/off 옵션으로 만들 것 (지금 하드코딩돼서 누락 발생함)
- 소요 시간 추정치 없음. 실제로 해봐야 앎.

이걸 하고 나면 사이트 추가가 "폴더 1개 + config 20줄"이 되고,
GitBook 대비 관리 편의 격차가 사실상 사라진다.

### 4-2. `.scripts/build.mjs`를 `docs/*` glob 스캔으로

함정 1을 영구 제거.

---

## 5. 알려진 이슈 (이번 작업과 별개)

| 이슈 | 내용 |
|---|---|
| `dev-sillok` GA 누락 | `shared.ts`/`theme/index.ts`를 복사할 때 GA 분기가 빠짐. 개발 실록은 현재 유입 측정 불가 |
| `logger/index copy.md` | 1,056단어짜리 사본이 커밋돼 있음. 삭제 대상 |
| 사이드바 주석 처리 항목 | `config.mts`에 `// { text: 'API Client 정의', ... }` 형태로 여러 개. 켤지 지울지 정리 필요 |
| README TODO 불일치 | react-query / error-handling / form / logger가 미완료 체크박스인데 파일은 존재하고 일부는 배포됨 |
| draft 메커니즘 2개 | `sidebar.ts`의 `draft`(링크만 숨김, 페이지는 공개)와 frontmatter `draft`(`transformPageData`가 `layout: false`)가 동작이 다름. 용도 구분 또는 통일 필요 |
| 사이트 간 통합 검색 없음 | VitePress 로컬 검색은 앱 단위. 필요하면 Algolia DocSearch 검토 |

> 마지막 항목들은 의도된 것일 수 있음. 임의로 고치지 말고 확인 후 진행할 것.

---

## 6. repo 컨벤션 (CLAUDE.md 요약)

- 응답 및 **커밋 메시지 한국어**
- Biome: 스페이스 2칸, 싱글 쿼트, 세미콜론, 트레일링 콤마, 화살표 함수 항상 괄호
- 문서 스타일: 실무 중심, 코드 예제 위주, 간결하게
- `.ai/`는 gitignore 대상이라 다른 환경으로 안 넘어감 (그래서 이 문서가 repo 루트에 있음)
