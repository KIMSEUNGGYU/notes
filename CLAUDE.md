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
pnpm docs:best-practices:dev    # 베스트 프랙티스 (localhost:5173)
pnpm docs:work:dev              # 업무 노트 (localhost:5174)

# 빌드
pnpm build                      # 전체 통합 빌드 → dist/
pnpm docs:best-practices:build  # 개별 빌드
pnpm docs:work:build

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
├── docs/
│   ├── best-practices/         # 워크스페이스: 프론트엔드 베스트 프랙티스
│   │   ├── .vitepress/
│   │   │   ├── config.mts      # VitePress 설정
│   │   │   ├── components/     # Vue 컴포넌트
│   │   │   └── theme/          # 커스텀 테마
│   │   └── [topic]/index.md    # 문서 (폴더별 주제)
│   │
│   └── work-notes/             # 워크스페이스: 업무 노트
│       └── (동일 구조)
│
├── .scripts/build.mjs          # 통합 빌드 스크립트
├── code-examples/              # 문서에서 참조하는 코드 예제
└── AI_CONTEXT/                 # Claude와의 개발 기록, 작성 가이드
```

### 핵심 포인트

- **pnpm workspace + catalog**: `pnpm-workspace.yaml`에서 공통 의존성 버전 관리 (`vitepress`, `vue`, `typescript`)
- **각 문서 독립적**: `docs/best-practices`와 `docs/work-notes`는 독립적인 VitePress 프로젝트
- **통합 빌드**: `.scripts/build.mjs`가 각 워크스페이스 빌드 후 `dist/`에 통합ß

## 문서 작성 스타일

- 실무 중심, 코드 예제 위주
- 간결한 설명 (이론보다 실전)
- AI 특유의 장황함 제거
- 참고 문서: `AI_CONTEXT/WRITING_GUIDE.md`

## 코드 스타일 (Biome)

- 들여쓰기: 스페이스 2칸
- 싱글 쿼트
- 세미콜론 사용
- 트레일링 콤마 사용
- 화살표 함수 항상 괄호

## AI 컨텍스트 (.ai/)
.ai/
├── context/    # 프로젝트 배경
├── patterns/   # 구현 패턴
├── prompts/    # 프롬프트 템플릿
├── sessions/   # 작업 기록
└── specs/      # [옵션] 스펙 문서

### 사용 시점
- 프로젝트 파악 → `.ai/context/` 참조
- 구현 중 → `.ai/patterns/` 참조
- 반복 요청 → `.ai/prompts/` 참조
- `/recap`, `/organization` → `.ai/sessions/`에 저장

### 스펙주도개발 시 (옵션)
- 구현 전 → `.ai/specs/` 확인
- 스펙 없으면 작성 요청
