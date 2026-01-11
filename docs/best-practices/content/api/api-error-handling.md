---
title: API 에러 처리
description: isApiError 활용과 React Query 에러 처리 패턴
outline: deep
---

# API 에러 처리

## Overview

API Client 정의 편에서 만든 `isApiError`를 활용한 에러 처리 패턴과 React Query 에러 처리 방법을 다룹니다.

## 1. isApiError 활용

### 기본 사용

```tsx
import { isApiError } from '@/lib/HttpClient';

try {
  const payment = await fetchPayment({ id: '123' });
} catch (error) {
  if (isApiError(error)) {
    // error가 ApiError 타입으로 좁혀짐
    console.error(error.statusCode, error.message);
  }
}
```

### 에러 메시지 추출

```tsx
function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  return '알 수 없는 오류가 발생했습니다.';
}
```

### 주의: 클로저 내부에서 타입 좁히기

```tsx
// ❌ 에러 발생 - 클로저 내부에서 타입 좁히기 안 됨
if (isApiError(error)) {
  toastOverlay.open(({ isOpen, close }) => (
    <Toast>{error.message}</Toast>  // error는 여전히 unknown
  ));
}

// ✅ 변수에 먼저 추출
if (isApiError(error)) {
  const message = error.message;  // 타입 좁혀진 상태에서 추출
  toastOverlay.open(({ isOpen, close }) => (
    <Toast>{message}</Toast>
  ));
}
```

TypeScript는 클로저 함수가 언제 실행될지 알 수 없어서, `if` 블록 안에서 좁혀진 타입이 클로저 내부까지 전파되지 않습니다.

## 2. React Query 에러 처리

### 재시도 정책

```tsx
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/lib/HttpClient';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        // 401 에러는 재시도하지 않음
        if (isApiError(error) && error.statusCode === 401) {
          return false;
        }
        // 다른 에러는 최대 2번까지 재시도
        return failureCount < 2;
      },
      throwOnError: true,
    },
    mutations: {
      retry: (failureCount, error: unknown) => {
        if (isApiError(error) && error.statusCode === 401) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});
```

**포인트:**
- `error: unknown` 타입 명시 필요 (타입 가드가 올바르게 동작)
- `return failureCount < 2` (함수형 retry는 boolean 반환)
- 401은 Interceptor에서 토큰 갱신 처리하므로 재시도 불필요

### Sentry 리포팅

```tsx
// lib/queryClient.ts
import * as Sentry from '@sentry/nextjs';
import { TimeoutError } from 'ky';

export const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: (failureCount, error: unknown) => {
        if (isApiError(error) && error.statusCode === 401) {
          return false;
        }
        return failureCount < 2;
      },
      onError: async (error) => {
        // 401은 정상적인 인증 플로우이므로 Sentry 리포트 제외
        if (isApiError(error) && error.statusCode === 401) {
          return;
        }

        const message = isApiError(error) 
          ? error.message 
          : '알 수 없는 오류가 발생했습니다.';

        Sentry.captureException(error, {
          extra: {
            message,
            network: error instanceof TimeoutError ? getConnectionInfo() : undefined,
          },
        });
      },
    },
  },
});

function getConnectionInfo() {
  try {
    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  } catch {
    return undefined;
  }
}
```

**포인트:**
- 401은 토큰 만료로 정상 케이스이므로 Sentry 리포트 제외
- TimeoutError 발생 시 네트워크 상태 정보 추가 (디버깅 용이)
