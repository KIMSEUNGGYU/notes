# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 언어 설정

- 항상 한국어로 응답
- 커밋 메시지도 한국어로 작성

## 프로젝트 개요

프론트엔드 개발 지식 및 업무 경험을 정리한 VitePress 기반 기술 블로그. pnpm workspace를 사용한 모노레포 구조.

## 주요 명령어

```bash
# 설치
pnpm install

# 개발 서버
pnpm best:dev                   # 베스트 프랙티스 (localhost:5173)
pnpm wiki:dev                   # Wiki (localhost:5175)

# 빌드
pnpm build                      # 전체 통합 빌드 → dist/
pnpm best:build                 # 개별 빌드
pnpm wiki:build

# 린트 & 포맷
pnpm lint                       # Biome 검사
pnpm lint:fix                   # Biome 자동 수정
pnpm format                     # 포맷팅
pnpm check                      # 검사 + 수정

# 프리뷰
pnpm preview                    # 통합 빌드 결과 프리뷰 (localhost:3000)
```

## 아키텍처

```
notes/
├── docs/                       # 문서 사이트 (워크스페이스)
│   ├── best-practices/         # → /frontend-docs/  (5173)
│   │   ├── .vitepress/
│   │   │   ├── config.mts      # 사이트 고유 설정 (사이드바·제목·포트)
│   │   │   └── theme/index.ts  # @notes/shared 테마 re-export
│   │   └── content/            # 문서 (폴더별 주제)
│   └── wiki/                   # → /wiki/           (5175, 사이드바 자동 생성)
│       └── content/
│           ├── study/          # 학습 기록 — live 에서 제외
│           └── posts/          # 발행 글 (*.draft.md 는 live 에서 제외)
│
├── packages/shared/src/        # 사이트 공통 배관 (@notes/shared)
│   ├── nav-apps.ts             # 앱 전환 레일 SSOT
│   ├── config.ts               # VitePress 공통 설정 (mergeConfig)
│   ├── theme.ts                # 공통 테마
│   ├── OneNavigation.vue       # 좌측 레일 컴포넌트
│   ├── sidebar.ts              # 사이드바 draft 필터
│   ├── phase.ts                # PHASE 판별 (live / dev)
│   ├── ga.ts                   # Google Analytics
│   └── custom.css
│
├── _templates/vitepress/new/   # hygen 스캐폴딩 템플릿
├── .scripts/build.mjs          # 통합 빌드 스크립트
├── .ai/                        # AI 컨텍스트 (gitignore — 다른 환경에 안 넘어감)
└── code-examples/              # 문서에서 참조하는 코드 예제
```

### 핵심 포인트

- **pnpm workspace + catalog**: `pnpm-workspace.yaml`에서 공통 의존성 버전 관리 (`vitepress`, `vue`, `typescript`)
- **공통 배관은 `@notes/shared`**: 사이트에 남는 파일은 `config.mts`와 `theme/index.ts` 둘뿐. 레일에 앱을 추가하려면 `packages/shared/src/nav-apps.ts` 한 곳만 고친다
- **통합 빌드**: `.scripts/build.mjs`가 각 워크스페이스 빌드 후 `dist/`에 통합
- **PHASE**: `live`면 GA 활성 + draft 숨김, 그 외는 반대. 환경변수가 없으면 `VERCEL_ENV === 'production'`일 때만 `live`
- **새 사이트 추가**: `pnpm new:vitepress` — `nav-apps.ts`와 `build.mjs`에 자동 주입된다

## 문서 작성 스타일

- 실무 중심, 코드 예제 위주
- 간결한 설명 (이론보다 실전)
- AI 특유의 장황함 제거

## 코드 스타일 (Biome)

- 들여쓰기: 스페이스 2칸
- 싱글 쿼트
- 세미콜론 사용
- 트레일링 콤마 사용
- 화살표 함수 항상 괄호

## AI 컨텍스트 (.ai/)

```
.ai/
├── contexts/   # 프로젝트 배경
├── patterns/   # 구현 패턴
├── prompts/    # 프롬프트 템플릿
└── sessions/   # 작업 기록
```

### 사용 시점
- 프로젝트 파악 → `.ai/contexts/` 참조
- 구현 중 → `.ai/patterns/` 참조
- 반복 요청 → `.ai/prompts/` 참조
- `/recap`, `/organization` → `.ai/sessions/`에 저장
