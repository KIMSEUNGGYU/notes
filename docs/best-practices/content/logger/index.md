---
title: Logger 패턴
description: 환경별 구현 + combineLoggers 합성으로 단일 인터페이스 제공
outline: deep
---

# Logger 패턴

> 환경별로 다른 로거를 따로 만들고 `combineLoggers`로 합성해 **사용처에는 단일 `Logger` 인터페이스**만 노출하는 패턴.

> **두 트랙으로 구성**
> - **메인 (이 문서)** = **인프라 구축 트랙** — 한 번 갖춰두면 끝 (5개 필수 + 1개 선택)
> - **[부록](./usage)** = **페이지별 사용 트랙** — 페이지 추가될 때마다 반복

## 무엇을 해결하나

**❌ 기존 방식 — 호출부가 모든 걸 채워야 함**

```tsx
<button onClick={() => {
  window.dataLayer?.push({
    event: 'click_interaction',
    device: window.innerWidth > 640 ? 'pcweb' : 'moweb', // 매번 직접 계산
    page_type: 'home',                                    // 매번 직접 입력
    section_type: 'gnb',                                  // 자유 문자열 — 오타 가능
    label: '상담',                                        // 자유 문자열 — 오타 가능
  });
}}>상담</button>
```

| 문제                                     | 결과                                            |
| ---------------------------------------- | ----------------------------------------------- |
| `device`/`page_type` 계산 호출부마다 반복 | 누락/실수 → 집계 누락                          |
| `section_type`/`label`이 자유 문자열      | 같은 버튼이 여러 키로 흩어져 GA 집계 깨짐      |
| phase별 분기를 호출부가 알아야 함        | local에서 GA 오염, 환경 분기 코드 흩어짐       |

**✅ 패턴 적용 — 호출부는 `section_type`/`label`만**

```tsx
<button onClick={() => {
  pageLogger.logClick({
    section_type: SECTION_TYPE.GNB, // enum — 오타 시 컴파일 에러
    label: LABEL.상담,               // enum — 오타 시 컴파일 에러
  });
}}>상담</button>
```

- `device`, `page_type` 자동 주입
- `SECTION_TYPE` / `LABEL` enum으로 잠금 → 오타 차단
- phase 분기는 `makeLogger`가 처리 (local=콘솔만, dev=둘 다, live=GA만)

## 핵심 아이디어

**구성 다이어그램**

```
         Logger (인터페이스)
              ▲
   ┌──────────┼──────────────┐
ConsoleLogger GALogger  combineLoggers
   └──────────┬──────────────┘
              │
      makeLogger (Phase 분기)
              │
              ▼
         pageLogger (사용처)
```

**구성 요소 5가지 — 코드 없이 한눈에**

| 이름                | 한 줄 설명                                              |
| ------------------- | ------------------------------------------------------- |
| `Logger`            | 모두가 따르는 **단일 인터페이스** (계약)                |
| `ConsoleLogger`     | 콘솔 출력 구현 (local/dev에서 사용)                     |
| `GALogger`          | GA 전송 구현 (dev/live에서 사용)                        |
| `combineLoggers` ⭐ | 여러 Logger를 합쳐 단일 Logger로 (**핵심 추상화**)      |
| `makeLogger`        | Phase에 따라 위 구현체를 조합해 단일 `Logger` 반환     |

**동작 원리**

`Logger`는 단일 인터페이스. 환경별 구현(`ConsoleLogger`, `GALogger`)을 따로 만들고, **`combineLoggers`로 합성**해서 환경에 따라 다른 동작을 단일 인터페이스로 제공한다.

- `local` → `ConsoleLogger`
- `dev` → `ConsoleLogger` + `GALogger` (`combineLoggers`로 합성)
- `live` → `GALogger`

사용처는 항상 `Logger` 하나만 쓴다. 어떤 환경에서 어떻게 동작할지는 `makeLogger`가 결정.

> **차별점** — 여러 로거를 합성해도 사용처는 단일 로거처럼 다룬다. 환경별 분기·합성을 사용처가 알 필요 없게 만드는 `combineLoggers` 추상화가 이 패턴의 핵심.

**원칙 3가지**

1. **단일 인터페이스 `Logger`** — 사용처는 환경/구현체 신경 X
2. **환경별 구현체 분리 + `combineLoggers`로 합성** — 이 합성 추상화가 핵심
3. **이벤트는 페이지 전용 상수/타입으로 강제** — 오타 방지, 도메인 한정 (→ [부록 §2 EventParams 정의](./usage#_2-eventparams-정의-da-요청-사항을-타입으로))

각 패턴은 다음 형식:

```
언제 쓰나   — 적용 상황
적용 위치   — 코드베이스 폴더/계층
템플릿      — 복붙 가능한 베스트 코드
왜          — 근거
주의        — 함정 (선택)
```

## Phase ↔ Logger 구현 매칭

| Phase   | 동작                       | 용도                  |
| ------- | -------------------------- | --------------------- |
| `local` | `ConsoleLogger`만          | 개발 디버깅 (콘솔만)  |
| `dev`   | `combineLoggers(Console, GA)` | 디버깅 + 분석 둘 다   |
| `live`  | `GALogger`만               | 프로덕션 분석만       |

코드 변경 없이 환경변수(Phase)만으로 로거가 전환된다.


---

# 모델 패턴

## 01. Logger 인터페이스 — 단일 추상화

**언제 쓰나** — 로거 시스템의 출발점. 모든 구현체와 사용처가 이 인터페이스만 의존

**적용 위치** — `src/lib/logger/types.ts`

**템플릿**

```typescript
export interface LoggerParams {
  device?: Device;
  page_type?: string;
  [key: string]: unknown;
}

export interface EventParams {
  section_type: string;
  label: string;
}

export interface Logger<TEventParams extends EventParams = EventParams> {
  log(name: string, params?: LoggerParams): void;
  logClick(params: TEventParams): void;
}
```

**`LoggerParams` vs `EventParams` — 누가 채우나**

| 타입            | 누가 채우나                  | 무엇                                                       |
| --------------- | ---------------------------- | ---------------------------------------------------------- |
| `LoggerParams`  | **인프라가 자동 주입**       | 모든 이벤트 공통 (`device`, `page_type` 등)                |
| `EventParams`   | **DA가 요청한 분석 스펙**    | 이벤트마다 채워야 할 분석 필드 (`section_type`, `label` 등) |

- `LoggerParams`는 환경/페이지 단위로 한 번 결정되어 자동 합성 — 호출부가 신경 X
- `EventParams`는 클릭 시점에 컴포넌트가 직접 채움 — 페이지별로 `extends EventParams`로 확장해 도메인 한정 타입 강제 ([부록 §2](./usage#_2-eventparams-정의-da-요청-사항을-타입으로))

**왜**

- 사용처는 단일 인터페이스만 의존 → 구현체 교체 영향 없음
- `log` — 범용 이벤트 (페이지뷰, 스크롤 등)
- `logClick` — 클릭 이벤트 전용 (제네릭으로 페이지별 타입 강제)
- 환경별 구현체(`ConsoleLogger`, `GALogger`)는 모두 이 형태를 따름

---

# 환경별 구현 패턴

## 02. ConsoleLogger — 개발 환경 구현

**언제 쓰나** — local/dev Phase에서 콘솔로 시각 확인이 필요할 때

**적용 위치** — `src/lib/logger/ConsoleLogger.ts`

**템플릿**

```typescript
import { getDevice } from './utils';
import type { Logger, LoggerParams, EventParams, MakeLoggerOptions } from './types';

export class ConsoleLogger<TEventParams extends EventParams = EventParams>
  implements Logger<TEventParams>
{
  constructor(private readonly baseParams: MakeLoggerOptions) {}

  private getBaseParams(params?: LoggerParams): LoggerParams {
    return {
      device: getDevice(),    // 런타임에 PC/모바일 감지
      ...this.baseParams,     // page_type + 커스텀 필드
      ...params,              // 호출 시 전달된 파라미터
    };
  }

  log(name: string, params?: LoggerParams) {
    console.table({ event: name, ...this.getBaseParams(params) });
  }

  logClick(params: TEventParams) {
    this.log('click_interaction', params);
  }
}
```

**왜**

- `console.table`로 이벤트 시각화 → 개발자 도구에서 한눈에
- `getBaseParams`가 필드 병합 담당 (나중 필드가 이전 값을 덮어쓰는 spread 순서)
- 클래스라 인스턴스마다 `baseParams` 격리
- **local Phase에서 GA 오염 방지** — 개발 중 콘솔만 켜면 실제 GA 분석 데이터에 노이즈가 들어가지 않음

---

## 03. GALogger — 프로덕션 구현

**언제 쓰나** — dev/live Phase에서 Google Analytics로 실제 전송

**적용 위치** — `src/lib/logger/GALogger.ts`

**템플릿**

```typescript
export class GALogger<TEventParams extends EventParams = EventParams>
  implements Logger<TEventParams>
{
  constructor(private readonly baseParams: MakeLoggerOptions) {}

  private getBaseParams(params?: LoggerParams): LoggerParams {
    return {
      device: getDevice(),
      ...this.baseParams,
      ...params,
    };
  }

  log(name: string, params?: LoggerParams) {
    // SSR 대응 — window/dataLayer 없으면 조용히 무시
    if (typeof window === 'undefined' || !window.dataLayer) return;

    window.dataLayer.push({
      event: name,
      ...this.getBaseParams(params),
    });
  }

  logClick(params: TEventParams) {
    this.log('click_interaction', params);
  }
}
```

**왜**

- `window.dataLayer.push`로 GA4 이벤트 전송 (GTM 연동)
- **SSR 가드** — `window` 없거나 `dataLayer` 없으면 조용히 무시 → 서버 렌더링 에러 없음
- `ConsoleLogger`와 동일한 `Logger` 인터페이스 → 사용처 동일

**주의** — `dataLayer`는 GTM 스니펫이 먼저 로드되어야 존재. 스크립트 로드 타이밍에 따라 초기 이벤트가 유실될 수 있으니 critical 이벤트는 hydration 후 발사.

---

## 04. combineLoggers — 다중 로거 결합 ⭐ (핵심 추상화)

**언제 쓰나** — 환경에 따라 여러 로거를 동시에 사용해야 할 때 (`dev` Phase에서 Console과 GA를 함께)

**적용 위치** — `src/lib/logger/combineLoggers.ts`

**템플릿**

```typescript
import type { Logger, EventParams } from './types';

export function combineLoggers<TEventParams extends EventParams = EventParams>(
  ...loggers: Logger<TEventParams>[]
): Logger<TEventParams> {
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

**왜 — 이 패턴의 핵심 추상화**

- 동일한 `Logger` 인터페이스를 반환 → **여러 로거를 합성해도 사용처는 단일 로거처럼 사용**
- `dev`에서 Console+GA를 동시에 보낼 수 있는 이유 (사용처는 둘이 합쳐진 줄 모름)
- N개 로거 결합 가능 (Console + GA + Amplitude + 자체 분석 도구 등)
- **새 분석 도구(Mixpanel 등) 추가 시 호출부는 0줄 변경** — 새 `Logger` 구현체 만들고 `combineLoggers` 인자에 추가하면 끝 (자세히는 [부록 §5](./usage#_5-확장-새-분석-도구-추가-mixpanel-예시))
- 환경별 분기는 `makeLogger`(§05)에 가두고 결합 로직은 여기에 분리

> **이게 일반적인 logger 라이브러리에는 잘 없는 부분.** 보통은 라이브러리 안에 "여러 transport"가 박혀 있어 확장이 어려운데, `combineLoggers`로 빼면 새 도구 추가가 한 줄로 끝난다.

---

## 05. makeLogger — Phase 자동 전환

**언제 쓰나** — 로거 생성 시 항상 이 팩토리만 호출. 환경별 분기를 사용처에 노출하지 않음

**적용 위치** — `src/lib/logger/makeLogger.ts`

**템플릿**

```typescript
import { getPhase } from '@/lib/env';
import { ConsoleLogger } from './ConsoleLogger';
import { GALogger } from './GALogger';
import { combineLoggers } from './combineLoggers';
import type { EventParams, Logger, MakeLoggerOptions } from './types';

export function makeLogger<TEventParams extends EventParams = EventParams>(
  options: MakeLoggerOptions,
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

**왜**

- 사용처는 `makeLogger`만 호출 → Phase 분기를 한 곳에 가둠
- 환경 추가 시 이 함수만 수정
- 제네릭으로 페이지별 EventParams 타입 그대로 통과
- `dev`에서는 `combineLoggers`(§04)로 합성한 단일 인터페이스 반환
- **phase를 직접 읽음 (DI 아님)** — phase는 빌드 환경에 의해 1회 결정되므로 런타임 주입 의미 없음. 호출부에서 phase를 모르도록 캡슐화하는 게 더 중요한 설계 목표

---

## 유틸리티

### getDevice

> 패턴은 아니고 utility. `LoggerParams.device`를 자동 주입하기 위한 헬퍼.

**적용 위치** — `src/lib/logger/utils.ts`

```typescript
import { BREAKPOINTS } from '@/lib/constants';

export const DEVICE = {
  PC_WEB: 'pcweb',
  MOBILE_WEB: 'mweb',
} as const;

export type Device = (typeof DEVICE)[keyof typeof DEVICE];

export function getDevice(): Device {
  if (typeof window === 'undefined') return DEVICE.PC_WEB; // SSR 기본값

  const isPc = window.matchMedia(`(min-width: ${BREAKPOINTS.mobile + 1}px)`).matches;
  return isPc ? DEVICE.PC_WEB : DEVICE.MOBILE_WEB;
}
```

- SSR에선 `pcweb` 기본값으로 안전 fallback
- 클라이언트에선 `matchMedia`로 뷰포트 감지
- **매 이벤트 발사 시점**에 호출 — 모듈 로드 시 캐시(`const device = getDevice()`)하면 화면 회전 같은 변화를 못 따라간다

---

[전체 코드 예시 — code-examples/logger](https://github.com/KIMSEUNGGYU/notes/tree/main/code-examples/logger)
