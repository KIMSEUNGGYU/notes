# Logger 패턴 - 전체 코드

Phase별 자동 전환되는 로거 시스템의 전체 구현 코드입니다.

## 디렉토리 구조

```
logger/
├── lib/
│   └── logger/              # 핵심 라이브러리
│       ├── index.ts         # 공개 API
│       ├── makeLogger.ts    # Phase별 로거 생성
│       ├── ConsoleLogger.ts # 콘솔 로거
│       ├── GALogger.ts      # Google Analytics 로거
│       ├── combineLoggers.ts# 로거 결합
│       ├── types.ts         # 타입 정의
│       ├── constants.ts     # 상수
│       └── utils.ts         # 유틸리티
└── pages/
    └── home/
        └── logger/          # 페이지별 로거 예시
            ├── index.ts
            ├── types.ts
            └── constants.ts
```

## 주요 파일

### 핵심 구현

- [makeLogger.ts](./lib/logger/makeLogger.ts) - Phase별 로거 자동 전환
- [ConsoleLogger.ts](./lib/logger/ConsoleLogger.ts) - 개발용 콘솔 로거
- [GALogger.ts](./lib/logger/GALogger.ts) - 프로덕션 GA 로거
- [combineLoggers.ts](./lib/logger/combineLoggers.ts) - 여러 로거 결합

### 타입 시스템

- [types.ts](./lib/logger/types.ts) - Logger 인터페이스 및 타입
- [constants.ts](./lib/logger/constants.ts) - DEVICE, EVENT_NAME 상수

### 실전 예시

- [pages/home/logger/](./pages/home/logger/) - Home 페이지 전용 로거 구현

## 사용 방법

```typescript
import { makeLogger } from './lib/logger';

// 로거 생성
const logger = makeLogger({ page_type: 'home' });

// 이벤트 전송
logger.logClick({
  section_type: 'header',
  label: '로그인 버튼',
});
```

## 관련 문서

전체 설명은 [Logger 패턴 문서](../../docs/best-practices/_/logger.md)를 참고하세요.
