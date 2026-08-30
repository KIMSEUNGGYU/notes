# CLAUDE.md

## 언어 설정

- 항상 한국어로 응답

## 프로젝트 개요

프론트엔드 개발 지식 및 업무 경험을 정리한 VitePress 기반 기술 블로그. pnpm workspace를 사용한 모노레포 구조.

## 핵심 포인트

- **pnpm workspace + catalog**: `pnpm-workspace.yaml`에서 공통 의존성 버전 관리 (`vitepress`, `vue`, `typescript`)
- **공통 배관은 `@notes/shared`**: 사이트에 남는 파일은 `config.mts`와 `theme/index.ts` 둘뿐. 레일에 앱을 추가하려면 `packages/shared/src/nav-apps.ts` 한 곳만 고친다
- **통합 빌드**: `.scripts/build.mjs`가 각 워크스페이스 빌드 후 `dist/`에 통합
- **PHASE**: `live`면 GA 활성 + draft 숨김, 그 외는 반대. 환경변수가 없으면 `VERCEL_ENV === 'production'`일 때만 `live`
- **새 사이트 추가**: `pnpm new:vitepress` — `nav-apps.ts`와 `build.mjs`에 자동 주입된다

## 문서 작성 스타일

- 실무 중심, 코드 예제 위주
- 간결한 설명 (이론보다 실전)
- AI 특유의 장황함 제거
