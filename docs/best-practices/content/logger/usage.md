---
title: 부록 — 페이지별 사용 트랙
description: 페이지마다 EventParams 정의 + 로거 인스턴스 + 컴포넌트 사용
outline: deep
---

# 부록 — 페이지별 사용 트랙

> 메인 [Logger 패턴](./)의 인프라(§01~§06) 구축이 끝난 다음, **페이지 추가될 때마다 반복하는 사용 트랙**.

logger 인스턴스의 단위는 **이벤트 set을 공유하는 도메인**. 이 도메인이 무엇이냐는 프로젝트 구조에 따라 다르다 — page일 수도, 서비스일 수도, 모듈일 수도 있다.

**사용 트랙 흐름**

```
§0  인프라 설정 (GTM + global.d.ts) ── 최초 1회
§1  도메인 단위 디렉토리            ┐
§2  EventParams 정의 (DA 요청)       │
§3  페이지 전용 로거 인스턴스        │  ← 페이지마다 반복
§4  컴포넌트에서 사용                ┘
§5  확장 (새 분석 도구 추가)
§6  도입 5단계 (전체 절차)
```

---

## 0. 인프라 설정 — GTM 스니펫 + global.d.ts

logger가 실제로 GA에 전송되려면 두 가지 인프라가 먼저 필요하다:

1. **GTM 스니펫이 페이지에 로드** → `window.dataLayer` 존재 보장
2. **`Window.dataLayer` 타입 선언** → TypeScript가 알도록

이게 빠지면 `GALogger`가 항상 noop — 콘솔에서는 정상이지만 실제 GA에는 아무것도 안 들어간다.

### `_document.tsx`에 GTM 스니펫 주입

```tsx
// /pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

function GoogleTagManager() {
  if (!GTM_ID) return null;
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${GTM_ID}');`,
      }}
    />
  );
}

function GoogleTagManagerNoScript() {
  if (!GTM_ID) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <GoogleTagManager />
      </Head>
      <body>
        <GoogleTagManagerNoScript />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

### `global.d.ts`에 dataLayer 타입 선언

```typescript
// /types/global.d.ts
export {};

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}
```

### GTM 어드민 설정

- GA4 태그 등록
- 트리거: **Custom Event** `click_interaction`
- 변수: `device`, `page_type`, `section_type`, `label` 등을 Data Layer Variable로 등록

---

## 1. 도메인 단위 로거 디렉토리

**언제 쓰나** — 도메인(`page_type` 단위)마다 고유한 이벤트 set이 있을 때 (대부분의 경우)

**적용 위치 — 프로젝트 구조에 따라**

| 프로젝트 구조          | 도메인 단위        | logger 위치 예시                          |
| ---------------------- | ------------------ | ----------------------------------------- |
| 단일 서비스 / SPA      | page               | `src/pages/{page}/logger/`                |
| 모노레포 (다중 서비스) | 서비스 + 페이지    | `apps/{service}/src/pages/{page}/logger/` |
| 큰 페이지 + 하위 모듈  | 모듈               | `src/features/{module}/logger/`           |

**판단 기준**

- 같은 `page_type`을 쓰는 컴포넌트끼리 → **한 logger**
- 다른 `page_type`이라면 → **별도 logger**
- 단위가 너무 크면 상수 파일이 비대해지고 다른 도메인 값이 섞임
- 단위가 너무 작으면 인스턴스 폭증

> `src/lib/logger`에 글로벌로 단일 인스턴스를 두는 것도 가능하지만, 공통 이벤트가 정말 적을 때(앱 전역 페이지뷰만 같이 쓰는 등) 한정. **도메인 분리의 이점을 잃으니 기본 추천은 아님**.

**템플릿 — page 단위 (가장 흔한 케이스)**

```
pages/
  home/
    logger/
      constants.ts    # SECTION_TYPE, LABEL 상수
      types.ts        # HomeEventParams 타입
      index.ts        # homeLogger 인스턴스 + re-export
    PCSection6.tsx    # 실제 사용
```

**왜**

- 도메인별 이벤트가 서로 섞이지 않음 → 다른 도메인 값 사용 시 컴파일 에러
- 상수/타입/인스턴스를 한 폴더에 묶어 발견성 ↑
- 도메인 제거 시 함께 정리 (orphan 이벤트 없음)

---

## 2. EventParams 정의 — DA 요청 사항을 타입으로

> 메인 §01에서 본 `EventParams`는 DA가 요청한 분석 필드. 페이지마다 `extends EventParams`로 확장해서 **도메인 한정 타입 강제**.

**언제 쓰나** — DA가 요청한 분석 필드(`section_type`, `label` 등)를 페이지별로 타입 강제하고 싶을 때

**적용 위치** — `src/pages/{page}/logger/constants.ts` + `types.ts`

**템플릿 — 상수 + 타입 (2 파일)**

```typescript
// /pages/home/logger/constants.ts
export const SECTION_TYPE = {
  GNB: 'gnb',
  CTA: 'cta',
  더_알아보기: '더 알아보기',
} as const;

export const LABEL = {
  GNB_프로모션: '프로모션',
  구매_상담_신청하기: '구매 상담 신청하기',
} as const;
```

```typescript
// /pages/home/logger/types.ts
import type { EventParams } from '@/lib/logger';
import type { LABEL, SECTION_TYPE } from './constants';

export type SectionType = (typeof SECTION_TYPE)[keyof typeof SECTION_TYPE];
export type Label = (typeof LABEL)[keyof typeof LABEL];

// EventParams 확장 — DA가 요청한 분석 필드를 페이지 도메인 값으로 좁힘
export interface HomeEventParams extends EventParams {
  section_type: SectionType;
  label: Label;
}
```

**사용 — 컴파일 시점 강제**

```typescript
const logger = makeLogger<HomeEventParams>({ page_type: 'home' });

logger.logClick({
  section_type: SECTION_TYPE.GNB,         // ✅ IDE 자동완성
  label: LABEL.GNB_프로모션,               // ✅ IDE 자동완성
});

logger.logClick({
  section_type: 'invalid',                 // ❌ 컴파일 에러
  label: '없는 라벨',                      // ❌ 컴파일 에러
});
```

**왜**

- DA가 요청한 분석 필드를 페이지별로 **타입 강제** → 누락/오타 컴파일 시 감지
- 상수 기반 → IDE 자동완성 + 리네임 안전
- 다른 페이지(`landingLogger`)의 값 사용 시 컴파일 에러 → 도메인 분리

**주의**

- 상수는 `as const`로 선언. 안 그러면 `string`으로 넓혀져 타입 강제력이 사라진다
- 메인 §01의 `EventParams`를 `extends`해서 기본 필드(`section_type`, `label`)는 유지하면서 페이지별 값 범위만 좁힘
- DA 요청에 새 필드가 추가되면 `HomeEventParams`에만 추가하면 됨 (인프라 변경 X)

---

## 3. 로거 인스턴스

**언제 쓰나** — 도메인마다 `page_type`과 EventParams 타입을 고정해 생성

**적용 위치** — `src/pages/{domain}/logger/index.ts`

**템플릿**

```typescript
// /pages/home/logger/index.ts
import { makeLogger } from '@/lib/logger';
import type { HomeEventParams } from './types';

export { LABEL, SECTION_TYPE } from './constants';
export type { HomeEventParams } from './types';

export const homeLogger = makeLogger<HomeEventParams>({
  page_type: 'main',
});
```

**왜**

- `page_type: 'main'`을 인스턴스 생성 시 고정 → 매 호출마다 전달 불필요
- 제네릭 `<HomeEventParams>`로 도메인 전용 타입 강제
- `index.ts`에서 상수까지 re-export → 컴포넌트는 `from 'pages/home/logger'` 한 줄로 import

---

## 4. 컴포넌트에서 사용

**언제 쓰나** — 페이지 안의 모든 클릭/이벤트 발생 지점

**적용 위치** — `src/pages/{domain}/**/*.tsx`

**템플릿**

```tsx
import { homeLogger, LABEL, SECTION_TYPE } from 'pages/home/logger';

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

**전송되는 데이터**

```javascript
{
  event: 'click_interaction',
  device: 'pcweb',         // getDevice가 자동 주입 (LoggerParams)
  page_type: 'main',       // homeLogger 생성 시 고정 (LoggerParams)
  section_type: '더 알아보기', // EventParams — 컴포넌트가 채움
  label: '프론트'             // EventParams — 컴포넌트가 채움
}
```

**왜**

- 컴포넌트는 `logClick({...})` 한 줄 — `device`, `page_type`은 자동 병합
- 상수 import로 IDE 자동완성 → 오타 0
- 다른 페이지(`landingLogger`)와 섞일 일 없음 — 타입이 막음

---

## 5. 확장 — 새 분석 도구 추가 (Mixpanel 예시)

새 분석 SDK(Mixpanel, Amplitude, 자체 백엔드 수집 등)는 `Logger` 인터페이스만 구현하면 추가 가능 — **호출부는 0줄 변경**.

```tsx
// /src/lib/logger/MixpanelLogger.ts
import type { BaseLoggerParams, EventParams, Logger, LoggerParams } from './types';
import { getDevice } from './utils';

export class MixpanelLogger<T extends EventParams = EventParams> implements Logger<T> {
  constructor(private readonly baseParams: BaseLoggerParams) {}

  log(name: string, params?: LoggerParams) {
    if (typeof window === 'undefined' || !window.mixpanel) return;
    window.mixpanel.track(name, {
      device: getDevice(),
      ...this.baseParams,
      ...params,
    });
  }

  logClick(params: T) {
    this.log('click_interaction', params);
  }
}
```

```tsx
// /src/lib/logger/makeLogger.ts — combineLoggers에 추가만
case 'live':
  return combineLoggers(
    new GALogger(options),
    new MixpanelLogger(options), // ← 한 줄 추가
  );
```

**왜 호출부가 안 바뀌나**

- `Logger` 인터페이스만 충족 → 사용처 입장에선 동일
- `combineLoggers`가 fan-out — 한 번의 `logClick`이 GA + Mixpanel 둘 다로
- 호출부 코드는 **단 한 줄도 바뀌지 않음**

이게 메인 §04 `combineLoggers`가 핵심 추상화로 꼽힌 이유.

---

## 6. 도입 5단계 — 처음 적용할 때

| 단계 | 작업                                                                                                                              |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **`logger/` 폴더 통째로 복사** — 메인 §01~§06 코드를 `src/lib/logger/`에 배치                                                       |
| 2    | **`phase.ts` 도메인 수정** — 본인 프로젝트의 dev/live 도메인에 맞춰 분기 조건 변경                                                 |
| 3    | **인프라 설정** — §0 GTM 스니펫 + `global.d.ts` 추가, GTM 어드민에서 GA4 태그 + 트리거(`click_interaction`) 등록                  |
| 4    | **도메인별 logger 만들기** — §1~§3 (디렉토리 + `EventParams` 정의 + 인스턴스)                                                       |
| 5    | **컴포넌트에서 호출 + 검증** — §4 (상수 import + `logClick`), `pnpm dev`로 브라우저 콘솔 확인                                       |

**검증 팁**

- 브라우저 콘솔에 `console.table` 출력 → `ConsoleLogger` 정상
- GTM Preview 모드로 `dataLayer.push` 확인 → `GALogger` 정상
- 두 가지 모두 보여야 dev Phase의 `combineLoggers`가 정상 작동

---

## 정리

- 도메인마다 `logger/` 디렉토리 — `constants.ts` / `types.ts` / `index.ts` 3개 파일
- DA 요청 사항은 `EventParams` 확장으로 타입 강제
- `makeLogger<XxxEventParams>({ page_type: ... })`로 도메인 전용 인스턴스 생성
- 컴포넌트는 상수 import + `logClick({...})` 한 줄

도메인 추가 시 같은 패턴 복붙 → **도메인 한정 타입 강제 + IDE 자동완성**.

- 전체 코드 예시: [code-examples/logger](https://github.com/KIMSEUNGGYU/notes/tree/main/code-examples/logger)
