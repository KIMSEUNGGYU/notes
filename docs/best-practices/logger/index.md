---
title: Logger 패턴
description: Phase별 자동 전환되는 로거 시스템
outline: deep
---

# Logger 패턴

## 개요

사용자 행동 분석을 위한 이벤트 로깅 시스템. Phase별로 자동 전환되고, 타입 안전성을 보장한다.

**해결하는 문제**
- 환경마다 다른 로깅 방식 (local은 콘솔, live는 GA)
- 반복되는 공통 필드 전달 (`device`, `page_type`)
- 오타로 인한 잘못된 이벤트 전송
- 페이지별 이벤트 타입 불일치

---

## 1. 기본 로거

### Logger란?

사용자 행동을 추적해서 Google Analytics 같은 분석 도구로 전송하는 객체.

```typescript
interface Logger {
  log(name: string, params?: LoggerParams): void;
  logClick(params: EventParams): void;
}
```

- `log`: 범용 이벤트 전송 (페이지뷰, 스크롤 등)
- `logClick`: 클릭 이벤트 전송 (버튼, 링크 등)

### 사용 방법

```typescript
// 1. 로거 생성 (page_type은 모든 이벤트에 자동 포함)
const logger: Logger = {
  log(name, params) {
    // device 자동 감지 + page_type 병합 후 전송
    sendToAnalytics({ event: name, device: getDevice(), page_type: 'home', ...params });
  },
  logClick(params) {
    this.log('click_interaction', params);
  },
};

// 2. 클릭 이벤트 전송
logger.logClick({
  section_type: 'header',
  label: '로그인 버튼',
});
```

실제로는 `makeLogger({ page_type: 'home' })`로 생성하지만, 내부적으로 위와 같은 객체를 반환한다.

### 전송되는 데이터

```javascript
{
  event: 'click_interaction',
  device: 'pcweb',           // 자동 감지
  page_type: 'home',         // makeLogger에서 설정
  section_type: 'header',    // logClick에서 전달
  label: '로그인 버튼'        // logClick에서 전달
}
```

**필드 출처**
> 각 회사별 데이터 로깅 속성마다 다름

- `device`: 자동 감지 (PC/모바일 구분)
- `page_type`: 로거 생성 시 고정 (페이지 구분)
- `section_type`, `label`: 이벤트 발생 시마다 전달 (클릭 위치)

**핵심**: `makeLogger`로 한 번 생성하면, `device`와 `page_type`은 매번 전달할 필요 없다.

### 타입 안전성 추가

문자열 직접 입력 시 오타 발생 → 상수로 정의하고 타입 강제

```typescript
// 1. 상수 정의
const SECTION_TYPE = {
  HEADER: 'header',
  FOOTER: 'footer',
} as const;

const LABEL = {
  로그인_버튼: '로그인 버튼',
  회원가입_버튼: '회원가입 버튼',
} as const;

// 2. 타입 정의
type MyEventParams = {
  section_type: typeof SECTION_TYPE[keyof typeof SECTION_TYPE];
  label: typeof LABEL[keyof typeof LABEL];
};

// 3. 로거 생성
const logger = makeLogger<MyEventParams>({ page_type: 'home' });

// 4. 사용 - IDE 자동완성, 잘못된 값 입력 시 컴파일 에러
logger.logClick({
  section_type: SECTION_TYPE.HEADER,
  label: LABEL.로그인_버튼,
});
```

---

## 2. 환경별 로거

### makeLogger - Phase별 자동 전환

로컬은 콘솔만, 프로덕션은 GA만, 개발은 둘 다.

```typescript
export function makeLogger<TEventParams extends EventParams = EventParams>(
  options: MakeLoggerOptions
): Logger<TEventParams> {
  const phase = getPhase();

  switch (phase) {
    case 'local':
      return new ConsoleLogger(options);
    case 'dev':
      return combineLoggers(new ConsoleLogger(options), new GALogger(options));
    case 'live':
      return new GALogger(options);
  }
}
```

| Phase | 동작 | 용도 |
|-------|------|------|
| `local` | ConsoleLogger만 | 개발 디버깅 |
| `dev` | Console + GA | 디버깅 + 분석 |
| `live` | GALogger만 | 프로덕션 분석 |

코드 변경 없이 환경변수만으로 로거가 전환된다.

### ConsoleLogger

개발 환경에서 `console.table`로 시각화.

```typescript
export class ConsoleLogger implements Logger {
  private getBaseParams(params?: LoggerParams): LoggerParams {
    return {
      device: getDevice(),      // 런타임에 PC/모바일 감지
      ...this.baseParams,       // page_type + 커스텀 필드
      ...params,                // 호출 시 전달된 파라미터
    };
  }

  log(name: string, params?: LoggerParams) {
    console.table({ event: name, ...this.getBaseParams(params) });
  }
}
```

`getBaseParams`가 필드 병합을 담당. 나중 필드가 이전 값을 덮어쓴다.

[전체 코드 보기](https://github.com/KIMSEUNGGYU/notes/blob/main/code-examples/logger/lib/logger/ConsoleLogger.ts)

### GALogger

프로덕션 환경에서 Google Analytics 4로 전송.

```typescript
export class GALogger implements Logger {
  log(name: string, params?: LoggerParams) {
    if (typeof window === 'undefined' || !window.dataLayer) {
      return;
    }

    window.dataLayer.push({
      event: name,
      ...this.getBaseParams(params),
    });
  }
}
```

**SSR 대응**: `window` 없거나 `dataLayer` 없으면 조용히 무시. 에러 발생 안 함.

[전체 코드 보기](https://github.com/KIMSEUNGGYU/notes/blob/main/code-examples/logger/lib/logger/GALogger.ts)

### combineLoggers

여러 로거를 하나로 묶는다. `dev` Phase에서 Console + GA 동시 사용.

```typescript
export function combineLoggers(...loggers: Logger[]): Logger {
  return {
    log(name, params) {
      loggers.forEach(logger => logger.log(name, params));
    },
    logClick(params) {
      loggers.forEach(logger => logger.logClick(params));
    },
  };
}
```

동일한 `Logger` 인터페이스 반환 → 사용처는 단일 로거처럼 사용.

[전체 코드 보기](https://github.com/KIMSEUNGGYU/notes/blob/main/code-examples/logger/lib/logger/combineLoggers.ts)

### Device 자동 감지

```typescript
export function getDevice(): Device {
  if (typeof window === 'undefined') return DEVICE.PC_WEB;

  const isPc = window.matchMedia(`(min-width: ${BREAKPOINTS.mobile + 1}px)`).matches;
  return isPc ? DEVICE.PC_WEB : DEVICE.MOBILE_WEB;
}
```

- SSR: `pcweb` 기본값
- 클라이언트: `matchMedia`로 뷰포트 감지
- 로그 전송할 때마다 호출 → 항상 최신 값

[전체 코드 보기](https://github.com/KIMSEUNGGYU/notes/blob/main/code-examples/logger/lib/logger/utils.ts)

---

## 3. 실전 활용 사례

실제 프로젝트에서는 페이지마다 별도 로거 디렉토리를 만들어 관리한다.

**전체 코드**: [code-examples/logger](https://github.com/KIMSEUNGGYU/notes/tree/main/code-examples/logger)

### 디렉토리 구조

```
pages/
  home/
    logger/
      constants.ts    # SECTION_TYPE, LABEL 상수
      types.ts        # HomeEventParams 타입
      index.ts        # homeLogger 인스턴스
    PCSection6.tsx    # 실제 사용
```

### constants.ts

페이지에서 사용하는 모든 section과 label 정의.

```typescript
export const SECTION_TYPE = {
  GNB: 'gnb',
  CTA: 'cta',
  사장님_이야기: '사장님 이야기',
  더_알아보기: '더 알아보기',
} as const;

export const LABEL = {
  GNB_프로모션: '프로모션',
  구매_상담_신청하기: '구매 상담 신청하기',
  더_알아보기_프론트: '프론트',
  더_알아보기_태블릿_세트: '태블릿 세트',
} as const;
```

### types.ts

상수 기반 타입 생성.

```typescript
import type { EventParams } from 'lib/logger';
import type { LABEL, SECTION_TYPE } from './constants';

export type SectionType = (typeof SECTION_TYPE)[keyof typeof SECTION_TYPE];
export type Label = (typeof LABEL)[keyof typeof LABEL];

export interface HomeEventParams extends EventParams {
  section_type: SectionType;
  label: Label;
}
```

### index.ts

페이지 전용 로거 인스턴스 생성.

```typescript
import { makeLogger } from 'lib/logger';
import type { HomeEventParams } from './types';

export { LABEL, SECTION_TYPE } from './constants';
export type { HomeEventParams } from './types';

export const homeLogger = makeLogger<HomeEventParams>({
  page_type: 'main',
});
```

### 컴포넌트에서 사용

```tsx
import { LABEL, SECTION_TYPE, homeLogger } from 'pages/home/logger';

export function PCSection6() {
  return (
    <Button
      onClick={() => {
        homeLogger.logClick({
          section_type: SECTION_TYPE.더_알아보기,
          label: LABEL.더_알아보기_프론트,
        });
      }}
    >
      더 알아보기
    </Button>
  );
}
```

**전송 데이터**
```javascript
{
  event: 'click_interaction',
  device: 'pcweb',
  page_type: 'main',
  section_type: '더 알아보기',
  label: '프론트'
}
```

**장점**: Home 페이지에서만 유효한 값만 사용 가능. 다른 페이지 값 입력 시 컴파일 에러.

**참고**:
- [전체 페이지 로거 구현](https://github.com/KIMSEUNGGYU/notes/tree/main/code-examples/logger/pages/home/logger)
- [constants.ts](https://github.com/KIMSEUNGGYU/notes/blob/main/code-examples/logger/pages/home/logger/constants.ts)
- [types.ts](https://github.com/KIMSEUNGGYU/notes/blob/main/code-examples/logger/pages/home/logger/types.ts)
- [index.ts](https://github.com/KIMSEUNGGYU/notes/blob/main/code-examples/logger/pages/home/logger/index.ts)

---

## 정리

### 빠른 시작

```typescript
// 기본 사용
const logger = makeLogger({ page_type: 'home' });
logger.logClick({ section_type: 'header', label: '로그인 버튼' });

// 타입 안전하게
const SECTION = { HEADER: 'header' } as const;
const logger = makeLogger<MyEventParams>({ page_type: 'home' });
```

### 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **자동화** | `device`, `page_type` 자동 포함 |
| **타입 안전** | 상수 기반 타입으로 오타 방지 |
| **환경별 전환** | Phase에 따라 Console/GA 자동 선택 |

### 해결한 문제

| 문제 | 해결 |
|------|------|
| 환경마다 다른 로깅 | `makeLogger`가 Phase 기반 자동 전환 |
| 공통 필드 반복 전달 | 자동으로 병합 |
| 오타로 잘못된 이벤트 | 상수 + 타입 강제 |
| 페이지별 타입 불일치 | 페이지별 전용 로거 인스턴스 |
