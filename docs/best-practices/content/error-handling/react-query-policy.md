---
title: 부록 B — React Query 정책
description: kind 기반 retry + Sentry 401 제외
outline: deep
---

# 부록 B — React Query 정책

> 메인 [§4 AsyncBoundary](./)와 함께 사용. `AppError`의 `kind`를 보고 재시도와 로깅을 분기한다.

---

## 1. kind 기반 retry 정책

**적용 위치** — `src/lib/queryClient.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/nextjs';
import { isAppError } from '@/lib/error/AppError';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        if (isAppError(error) && (error.kind === 'Auth' || error.kind === 'NotFound')) {
          return false;
        }
        return failureCount < 2;
      },
      throwOnError: true,
    },
    mutations: {
      retry: (failureCount, error: unknown) => {
        if (isAppError(error) && error.kind === 'Auth') return false;
        return failureCount < 2;
      },
      onError: (error: unknown) => {
        // 401은 정상 인증 플로우 — Sentry 리포트 제외
        if (isAppError(error) && error.kind === 'Auth') return;
        Sentry.captureException(error);
      },
    },
  },
});
```

**재시도 시나리오**

| Kind          | 재시도   | 이유                              |
| ------------- | -------- | --------------------------------- |
| `Auth`        | ❌       | 토큰 갱신도 실패 — 무의미         |
| `NotFound`    | ❌       | 리소스 없음 — 재시도해도 동일     |
| `Server`      | ✅ (2회) | 일시적 서버 오류 가능             |
| `Network`     | ✅ (2회) | 네트워크 불안정 가능              |
| `InvalidData` | ✅ (2회) | 일시적 응답 이상 가능             |

**왜**

- `kind`만 보고 정책 결정 → status code 분기 X
- **Query와 Mutation이 같은 정책** — 일관성 깨지면 사용자 경험 들쭉날쭉
- 의미 없는 재시도 제거 → 서버 부하/응답 시간 절약

**Mutation 일관성 — 흔한 실수**

```typescript
// ❌ Query는 재시도하는데 Mutation은 모두 안 함
mutations: { retry: 0 }

// ✅ Query와 동일 정책
mutations: {
  retry: (failureCount, error: unknown) => {
    if (isAppError(error) && error.kind === 'Auth') return false;
    return failureCount < 2;
  },
}
```

**함수형 retry는 boolean 반환**

```typescript
// ❌ 흔한 타입 에러
retry: (failureCount, error) => {
  if (isAppError(error) && error.kind === 'Auth') return false;
  return 2; // React Query 함수형 retry는 boolean만 허용
};

// ✅ failureCount 비교로 boolean
retry: (failureCount, error: unknown) => failureCount < 2;
```

또한 콜백 파라미터는 `error: unknown`으로 명시해야 `isAppError` 타입 가드가 제대로 동작한다.

---

## 2. Sentry 401 제외 — 노이즈 제거

```typescript
onError: (error: unknown) => {
  // 401은 정상 인증 플로우 — Sentry에 기록하지 않음
  if (isAppError(error) && error.kind === 'Auth') return;
  Sentry.captureException(error, {
    extra: {
      /* ... */
    },
  });
};
```

**왜**

- 401은 **토큰 만료** 같은 정상적인 사용자 플로우 — 에러라기보단 상태 전이
- 모니터링에 진짜 문제만 남겨야 **실제 이슈가 묻히지 않음**
- 알람 노이즈 줄이면 oncall 피로도 감소

**주의** — `Auth` 외에 어떤 kind를 제외할지는 도메인에 따라 다름. NotFound도 정상 케이스인 경우가 많다.

---

## 정리

- `kind`만 보고 정책을 결정하면 **status code 분기가 사라진다**
- Query/Mutation 정책 통일 → 사용자 경험 일관
- Sentry는 의미 있는 에러만 남기기 — 401 같은 정상 플로우는 필터

상위 계층(HTTP/Interceptor)에서 같이 다루는 더 큰 그림은 [부록 D](./layered-architecture) 참고.
