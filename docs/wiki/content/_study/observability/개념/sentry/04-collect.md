---
title: 수집 경로
description: 에러가 Sentry 로 가는 길 — 자동으로 잡히는 것과 우리가 보내는 것
order: 4
outline: deep
---

# 수집 경로

> **SDK 가 자동으로 잡는 것**과 **우리가 직접 호출하는 것**, 둘이다. 어느 쪽으로 보내느냐가 이벤트에 실리는 정보를 바꾼다.

## 1. SDK 가 자동으로 잡는 것

`Sentry.init()`이 실행되면 SDK가 브라우저 전역 에러 훅에 자기를 끼워넣는다. 코드는 더 안 쓴다.

```
window.onerror              try/catch 없이 터진 동기 에러
window.onunhandledrejection 아무도 catch 안 한 Promise 실패
```

breadcrumbs 수집(클릭·라우팅·fetch/XHR·console)도 같이 켜진다.

Next.js 서버 쪽은 `instrumentation.ts`에 `onRequestError = Sentry.captureRequestError` 한 줄을 두면 SSR 중 에러가 자동으로 올라간다 (설치 마법사가 넣어준다).

## 2. 우리가 직접 호출하는 것

```ts
Sentry.captureException(error)               // 에러 객체를 보낸다
Sentry.captureMessage('결제 위젯 로드 실패')   // 에러 객체 없이 문자열만
```

**자동이 못 잡는 에러**와 **맥락을 실어야 하는 에러**가 여기로 온다. `captureMessage`는 예외는 아니지만 기록하고 싶은 상황용이고 [Level](./01-sentry#_3-level-—-심각도) 과 같이 쓴다.

## 3. 렌더 중 에러 — ErrorBoundary 도 결국 직접 호출이다

boundary가 잡은 에러는 자동 훅에 안 걸린다. **React가 일부러 전역으로 안 보내기 때문이다** — 그 구역만 fallback UI로 바꾸고 나머지는 살리는 게 boundary의 목적이라, 전역으로 보내면 앱 전체가 죽은 것처럼 취급된다.

그래서 boundary가 직접 넘겨야 한다. 배선은 한 줄이고, 그 아래 트리의 렌더 에러가 전부 이 줄을 탄다.

```tsx
<ErrorBoundary onError={Sentry.captureReactException}>
```

`captureException`이 아니라 `captureReactException`인 이유 — **어느 컴포넌트에서 났는지(componentStack)**를 같이 붙여준다.

## 4. 어느 쪽으로 보내느냐가 실리는 정보를 바꾼다

같은 400이라도 남는 게 다르다.

```
ErrorBoundary 로     "렌더 중 ApiError" + 어느 컴포넌트인지
                     어느 API 였나 · 상태코드 · 응답 본문은 없다

captureException 로  tags·extra 로 endpoint · status · 응답 본문까지 실을 수 있다
```

boundary는 에러 객체를 **받은 모습 그대로** 넘기고, 원인이 API 실패인 걸 모른다. react-query의 `throwOnError: true`로 쿼리 실패를 boundary까지 던지는 구조라면 이 손실이 기본값이 된다.
