---
title: 에러 핸들링
description: 웹 개발에서 에러를 체계적으로 처리하는 방법
outline: deep
---

# 에러 핸들링

## 개요

웹 개발에서 발생하는 다양한 에러를 체계적으로 처리하는 패턴입니다.

---

## 1. 에러란?

### Exception vs Error State

**Exception (예상하지 못한 에러)**
- 런타임에 발생하는 예상 불가능한 문제
- `try-catch`로 처리
- 예: 네트워크 장애, 서버 다운

**Error State (예상 가능한 에러)**
- 비즈니스 로직에서 예상 가능한 상태
- 타입으로 표현
- 예: 입력값 검증 실패, 권한 없음

```typescript
// ❌ 예상 가능한 상황에 Exception 사용
function login() {
  if (!isValid) throw new Error('invalid');
}

// ✅ Error State로 표현
type LoginResult =
  | { status: 'success'; token: string }
  | { status: 'error'; reason: 'invalid' | 'expired' };
```

**핵심:**
- Exception은 예상 불가능한 상황에만 사용
- Error State로 예상 가능한 에러 표현

---

## 2. 에러 정의 방법

### 일반 에러 (AppError)

범용적으로 사용할 수 있는 에러 클래스입니다.

```typescript
// lib/error/AppError.ts
export type AppErrorKind =
  | 'Auth'
  | 'NotFound'
  | 'Network'
  | 'Server'
  | 'Unknown';

export class AppError extends Error {
  kind: AppErrorKind;

  constructor(kind: AppErrorKind, message: string) {
    super(message);
    this.name = 'AppError';
    this.kind = kind;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error != null && typeof error === 'object' && (error as any)?.name === 'AppError';
}
```

**활용:**

```typescript
// API 에러 변환
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      if (response.status === 401) throw new AppError('Auth', '로그인이 필요합니다');
      if (response.status === 404) throw new AppError('NotFound', '데이터를 찾을 수 없습니다');
      throw new AppError('Server', '서버 오류');
    }
    return response.json();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Network', '네트워크 오류');
  }
}
```

### 특수 에러 (RedirectError)

**특정 동작**이 필요한 경우 전용 에러 클래스를 만듭니다.

```typescript
// lib/error/RedirectError.ts
import { is } from '@tossteam/is';

export class RedirectError extends Error {
  readonly name = 'RedirectError';
  constructor(public readonly url: string) {
    super(`Redirecting to ${url}`);
  }
}

export function isRedirectError(error: unknown): error is RedirectError {
  return is.object(error) && 'name' in error && error.name === 'RedirectError';
}
```

**활용:**

```typescript
// 페이지에서 조건 검사 후 리다이렉트
function TaskDetailPage() {
  const router = useRouter();
  const { taskId } = router.query;

  // 유효하지 않은 taskId면 404로 리다이렉트
  if (!is.string(taskId)) {
    throw new RedirectError('/404');
  }

  return <TaskContent taskId={taskId} />;
}
```

**왜 분리했나?**
- AppError는 **에러 메시지 표시**용
- RedirectError는 **페이지 이동**이라는 특수한 동작
- 각 에러 타입별로 다른 처리 로직

### 확장: AppError에서 특정 에러 분리하기

필요한 경우 AppError의 특정 kind를 전용 에러로 분리할 수 있습니다.

**예시: NotFoundError 분리**

```typescript
// lib/error/NotFoundError.ts
export class NotFoundError extends Error {
  readonly name = 'NotFoundError';
  constructor(
    public readonly resource: string,
    public readonly redirectTo?: string
  ) {
    super(`${resource} not found`);
  }
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error != null && typeof error === 'object' && (error as any)?.name === 'NotFoundError';
}
```

```typescript
// lib/error/NotFoundErrorBoundary.tsx
import { ErrorBoundary, type ErrorBoundaryFallbackProps } from '@suspensive/react';
import { isNotFoundError } from './NotFoundError';
import { useRouter } from 'next/router';
import { type PropsWithChildren, useEffect } from 'react';

function NotFoundFallback({ error }: ErrorBoundaryFallbackProps) {
  const router = useRouter();

  useEffect(() => {
    if (isNotFoundError(error) && error.redirectTo) {
      // redirectTo가 있으면 리다이렉트
      router.replace(error.redirectTo);
    }
  }, [error, router]);

  // redirectTo가 없으면 404 UI 표시
  if (isNotFoundError(error) && !error.redirectTo) {
    return (
      <div>
        <h2>{error.resource}를 찾을 수 없습니다</h2>
        <button onClick={() => router.push('/')}>홈으로</button>
      </div>
    );
  }

  return null;
}

export function NotFoundErrorBoundary({ children }: PropsWithChildren) {
  return (
    <ErrorBoundary shouldCatch={isNotFoundError} fallback={NotFoundFallback}>
      {children}
    </ErrorBoundary>
  );
}
```

**사용:**

```typescript
// 케이스 1: 404 UI 표시
if (!task) {
  throw new NotFoundError('작업');
}

// 케이스 2: 리다이렉트
if (!task) {
  throw new NotFoundError('작업', '/tasks');
}
```

**언제 분리하나?**
- 특정 에러에 **추가 정보**(resource, redirectTo 등)가 필요할 때
- 특정 에러에 **특수한 UI/동작**이 필요할 때
- AppError의 단순 kind 분기로는 부족할 때

---

## 3. React ErrorBoundary 패턴

### 일반 에러 처리 (GlobalErrorBoundary)

모든 에러를 포착하고 Sentry에 로깅한 후 에러 UI를 표시합니다.

```typescript
// components/GlobalErrorBoundary.tsx
import * as Sentry from '@sentry/nextjs';
import { ErrorBoundary } from '@toss/error-boundary';
import { type ErrorInfo, type ReactNode, useCallback } from 'react';
import { FullScreenError } from './FullScreenError';

interface Props {
  children: ReactNode;
}

export function GlobalErrorBoundary({ children }: Props) {
  const handleError = useCallback((error: Error, info: ErrorInfo) => {
    Sentry.withScope(scope => {
      for (const key of Object.keys(info)) {
        scope.setExtra(key, (info as any)[key]);
      }
      Sentry.captureException(error);
    });
  }, []);

  return (
    <ErrorBoundary onError={handleError} renderFallback={() => <FullScreenError />}>
      {children}
    </ErrorBoundary>
  );
}
```

**핵심:**
- `@toss/error-boundary` 사용 (함수형 컴포넌트 지원)
- `onError`에서 Sentry 로깅 + ErrorInfo context 전송
- `renderFallback`으로 전체 화면 에러 UI 표시

### 특수 에러 처리 (RedirectErrorBoundary)

RedirectError를 포착하고 페이지 이동을 처리합니다.

```typescript
// lib/error/RedirectErrorBoundary.tsx
import { ErrorBoundary, type ErrorBoundaryFallbackProps } from '@suspensive/react';
import { isRedirectError } from './RedirectError';
import { useRouter } from 'next/router';
import { type PropsWithChildren, useEffect } from 'react';

function RedirectFallback({ error }: ErrorBoundaryFallbackProps) {
  const router = useRouter();

  useEffect(() => {
    if (isRedirectError(error)) {
      router.replace(error.url);
    }
  }, [error, router]);

  return null;
}

export function RedirectErrorBoundary({ children }: PropsWithChildren) {
  return (
    <ErrorBoundary shouldCatch={isRedirectError} fallback={RedirectFallback}>
      {children}
    </ErrorBoundary>
  );
}
```

### AsyncBoundary (ErrorBoundary + Suspense + QueryErrorResetBoundary)

로딩, 에러 처리, 그리고 React Query 에러 리셋을 통합합니다.

```typescript
// lib/AsyncBoundary.tsx
import { Suspense, ErrorBoundary } from '@suspensive/react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ComponentProps, FC, PropsWithChildren } from 'react';

interface AsyncBoundaryProps {
  pendingFallback: React.ReactNode;
  rejectedFallback: ComponentProps<typeof ErrorBoundary>['fallback'];
}

export const AsyncBoundary: FC<PropsWithChildren<AsyncBoundaryProps>> = ({
  pendingFallback,
  rejectedFallback,
  children,
}) => {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary fallback={rejectedFallback} onReset={reset}>
          <Suspense fallback={pendingFallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};
```

**핵심:**
- `QueryErrorResetBoundary`: React Query 에러 상태 초기화
- `ErrorBoundary`의 `onReset`과 연결하여 재시도 시 쿼리도 함께 리셋

**사용 예시:**

```typescript
// pages/_app.tsx
<GlobalErrorBoundary>
  <QueryClientProvider>
    <RedirectErrorBoundary>
      <Component {...pageProps} />
    </RedirectErrorBoundary>
  </QueryClientProvider>
</GlobalErrorBoundary>

// pages/task/[taskId].tsx
if (!is.string(taskId)) {
  throw new RedirectError('/404');
}

<AsyncBoundary
  pendingFallback={<Loading />}
  rejectedFallback={({ error, reset }) => <ErrorFallback error={error} onReset={reset} />}
>
  <SuspenseQuery {...taskDetailQueryOptions(taskId)}>
    {({ data }) => <Content taskDetail={data} />}
  </SuspenseQuery>
</AsyncBoundary>
```

---

## 4. React Query 에러 처리

### 재시도 정책

```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { isAppError } from '@/lib/error/AppError';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        // Auth, NotFound는 재시도 불필요
        if (isAppError(error) && (error.kind === 'Auth' || error.kind === 'NotFound')) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
```

**재시도 시나리오:**

| 에러 종류 | 재시도 여부 | 이유 |
|---------|----------|------|
| Auth | ❌ | 토큰 갱신 실패 시 재시도 무의미 |
| NotFound | ❌ | 리소스가 없는 상태는 재시도해도 동일 |
| Server | ✅ (2회) | 일시적 서버 오류 가능성 |
| Network | ✅ (2회) | 네트워크 불안정 가능성 |

---

## 정리

### 핵심 원칙

- **Exception은 예상 불가능한 상황에만** 사용
- **Error State로 예상 가능한 에러** 표현
- **일반 에러는 AppError**, **특수 동작은 전용 에러 클래스**
- **ErrorBoundary로 에러별 처리 로직 분리**
- **AsyncBoundary로 로딩/에러 통합 관리**

### 적용 효과

- 선언적 에러 처리로 코드 간결화
- 에러 타입별 명확한 처리
- 관심사 분리로 유지보수성 향상
- 일관된 로딩/에러 UX
