---
title: 에러 핸들링
description: 에러 클래스를 정의하고 각 Boundary에서 제어하는 패턴
outline: deep
---

# 에러 핸들링

## TL;DR

핵심은 두 가지:

1. **에러를 클래스로 정의한다** — `AppError(kind)`를 기본으로, 라우팅/조회 실패 같은 특수 의도는 전용 Error 클래스(`RedirectError`, `NotFoundError`)로 분리
2. **각 에러 클래스마다 전담 Boundary로 잡는다** — 1:1 매칭으로 처리 로직 분리

부가 패턴(remotes 정규화, 재시도 정책, 사용자 메시지, 계층 분리)은 [부록](#부록)에서 다룬다.

## 에러 ↔ Boundary 매칭

| 에러 클래스         | 적용 상황                          | 잡는 Boundary                |
| ------------------- | ---------------------------------- | ---------------------------- |
| `AppError(kind)`    | 일반 (도메인 무관 모든 에러)       | `GlobalErrorBoundary`        |
| `RedirectError`     | 라우팅 의도                        | `RedirectErrorBoundary`      |
| `NotFoundError`     | 특정 리소스 부재 (추가 메타데이터) | `NotFoundErrorBoundary`      |
| React Query 에러    | Query/Mutation 실패 + 재시도       | `AsyncBoundary` (with reset) |

---

## 0. 공통 — 구조적 타입 가드 (instanceof 회피)

모든 에러 클래스에는 `is<Class>Error` 타입 가드를 함께 제공한다. **`instanceof` 대신 `name` 속성**으로 판별.

```typescript
export function isAppError(error: unknown): error is AppError {
  return (
    error != null &&
    typeof error === 'object' &&
    (error as { name?: string }).name === 'AppError'
  );
}
```

**왜 name 체크?**

- **번들 코드 스플리팅** — 클래스가 여러 청크에 중복되면 `instanceof` false
- **직렬화/역직렬화** — Next.js Server → Client 전달 시 클래스 정보 손실
- **실행 컨텍스트 차이** — iframe / Web Worker / 다른 window 객체

`name` 속성 체크는 위 환경 모두에서 안전.

---

## 1. AppError + GlobalErrorBoundary

> 분류되지 않은 모든 에러의 기본 형태. 일관 모델로 정규화하고 최종 폴백에서 받는다.

### 1.1 AppError 클래스

```typescript
// /src/lib/error/AppError.ts
export type AppErrorKind =
  | 'Auth'
  | 'NotFound'
  | 'Network'
  | 'Server'
  | 'InvalidData'
  | 'Unknown';

export class AppError extends Error {
  readonly name = 'AppError';
  readonly kind: AppErrorKind;
  readonly status?: number;
  readonly cause?: unknown;

  constructor(
    kind: AppErrorKind,
    message: string,
    options?: { status?: number; cause?: unknown },
  ) {
    super(message);
    this.kind = kind;
    this.status = options?.status;
    this.cause = options?.cause;
  }
}

export function isAppError(error: unknown): error is AppError {
  return (
    error != null &&
    typeof error === 'object' &&
    (error as { name?: string }).name === 'AppError'
  );
}
```

**왜 단일 모델?**

- catch에서 `error: unknown`만 받아도 `kind` 한 줄로 분기 → 모든 호출처가 동일 패턴
- 새 에러 유형은 `AppErrorKind`에만 추가
- 사용자 메시지/재시도 정책을 `kind`만 보고 결정 ([부록 B](./react-query-policy), [부록 C](./error-copy))

### 1.2 AppError throw — 어디서, 어떻게

대부분의 `AppError`는 [부록 A의 `toAppError`](./remotes-mapping)가 remote 함수에서 자동으로 만들어 throw한다. 비즈니스 로직에서 직접 throw할 때는 `kind`를 골라서:

```typescript
// 입력값 검증 실패
if (!isValidEmail(email)) {
  throw new AppError('InvalidData', '이메일 형식이 올바르지 않습니다');
}

// 권한 없음 (서버 통신 전 클라이언트에서 차단)
if (!hasPermission) {
  throw new AppError('Auth', '권한이 없습니다');
}

// 예상치 못한 상태
if (somethingUnexpected) {
  throw new AppError('Unknown', '예상치 못한 오류가 발생했습니다');
}
```

### 1.3 throw → Boundary 도달 흐름

throw된 `AppError`가 `GlobalErrorBoundary`까지 어떻게 도달하는지:

```
[remotes / 컴포넌트]   throw new AppError('Server', ...)
        ↓
[React Query]          useSuspenseQuery / useMutation
                       (throwOnError: true 로 throw 전파)
        ↓
[전용 Boundary들]      RedirectErrorBoundary, NotFoundErrorBoundary
                       (shouldCatch로 AppError는 통과)
        ↓
[GlobalErrorBoundary]  AppError 포함 모든 미처리 에러를 받음
                       → Sentry 로깅 + FullScreenError 표시
```

`AppError`는 **분류되지 않은 모든 에러의 기본** — 라우팅(§2)도 NotFound(§3)도 아닌 모든 에러가 GlobalErrorBoundary에 도달한다.

### 1.4 GlobalErrorBoundary

`AppError` 및 잡히지 않은 모든 에러의 **최종 폴백**.

```tsx
// /src/components/GlobalErrorBoundary.tsx
import * as Sentry from '@sentry/nextjs';
import { ErrorBoundary } from '@toss/error-boundary';
import { type ErrorInfo, type ReactNode, useCallback } from 'react';

export function GlobalErrorBoundary({ children }: { children: ReactNode }) {
  const handleError = useCallback((error: Error, info: ErrorInfo) => {
    Sentry.withScope(scope => {
      for (const key of Object.keys(info)) {
        scope.setExtra(key, (info as Record<string, unknown>)[key]);
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

**작동 메커니즘**

- `onError` — 에러 발생 시 콜백. 여기서 Sentry로 로깅 (`ErrorInfo`의 컴포넌트 스택까지 전송)
- `renderFallback` — 에러 발생 후 children 대신 렌더링할 컴포넌트
- 한 번 에러가 잡히면 자식 컴포넌트는 unmount, fallback이 그 자리를 차지
- `FullScreenError` 안에서 `errorCopy[error.kind]`로 메시지를 꺼내 표시 — [부록 C](./error-copy) 참고

**왜**

- 잡히지 않은 모든 에러의 **최종 안전망**
- Sentry 로깅은 여기 한 곳에 (전용 Boundary들은 표시/라우팅에 집중)

### 1.5 \_app.tsx 배치 — 가장 바깥

```tsx
<GlobalErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <RedirectErrorBoundary>
      <NotFoundErrorBoundary>
        <Component {...pageProps} />
      </NotFoundErrorBoundary>
    </RedirectErrorBoundary>
  </QueryClientProvider>
</GlobalErrorBoundary>
```

`GlobalErrorBoundary`는 **가장 바깥** — 다른 Boundary들이 못 잡은 에러를 받는 최종 안전망.

---

## 2. RedirectError + RedirectErrorBoundary

> 어떤 조건을 만나면 페이지를 옮겨야 할 때 (`taskId` 누락 → 404 등)

### 2.1 RedirectError 클래스

```typescript
// /src/lib/error/RedirectError.ts
export class RedirectError extends Error {
  readonly name = 'RedirectError';
  constructor(public readonly url: string) {
    super(`Redirecting to ${url}`);
  }
}

export function isRedirectError(error: unknown): error is RedirectError {
  return (
    error != null &&
    typeof error === 'object' &&
    (error as { name?: string }).name === 'RedirectError'
  );
}
```

### 2.2 throw 케이스 — 두 가지로 나뉜다

"잘못된 URL이면 RedirectError"라고 단순하게 묶으면 안 된다. **URL param 정합성**과 **비즈니스 조건 후 라우팅**은 다른 문제이고, 적합한 도구가 다르다.

#### (a) URL param 검증 — `getServerSideProps`에서 (SSR 권장)

URL 파라미터(`/tasks/[taskId]` 같은 동적 경로)의 검증은 페이지가 마운트되기 **전, 서버에서** 처리한다. 컴포넌트는 항상 검증된 값을 받고, `RedirectError`를 throw할 필요도 없다.

```typescript
// /pages/tasks/[taskId].tsx
import type { GetServerSideProps } from 'next';
import { z } from 'zod';

const pageParamsSchema = z.object({
  taskId: z.string().regex(/^\d+$/), // 도메인 형식까지 강제
});

interface Props {
  taskId: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const params = pageParamsSchema.safeParse(context.params);
  if (!params.success) {
    return { notFound: true }; // Next.js 기본 404
  }
  return { props: { taskId: params.data.taskId } };
};

function TaskDetailPage({ taskId }: Props) {
  // taskId는 이미 검증됨 — 분기 코드 없음
  return <TaskContent taskId={taskId} />;
}
```

**왜 SSR?**

- 잘못된 URL은 페이지 진입 자체를 막음 → 클라이언트 라우터 의존 X
- 검증된 props만 자식 컴포넌트로 전달 → 검증 안 된 값이 코드베이스 안으로 새지 않음
- Next.js 기본 `{ notFound: true }` 활용 — `RedirectError`를 동원할 필요 없음
- SEO/공유 링크에서 잘못된 URL도 즉시 404

> 검증된 값을 깊은 자식까지 전달할 땐 props drilling 대신 Context Provider로 묶는 패턴도 자주 쓰임 (`<TaskIdProvider value={taskId}>`).

#### (b) 클라이언트 비즈니스 조건 — `RedirectError` throw

데이터 fetch 후의 상태나 권한에 따라 다른 페이지로 보내야 할 때. 이게 진짜 `RedirectError`의 자리.

```typescript
// 권한 체크 — admin 아니면 로그인 페이지로
function AdminPage() {
  const { data: user } = useSuspenseQuery(userQuery);

  if (!user.isAdmin) {
    throw new RedirectError('/login?from=admin');
  }

  return <AdminContent />;
}
```

```typescript
// 데이터 상태에 따른 라우팅 — pending이면 대기 페이지로
function PaymentResultPage({ paymentId }: Props) {
  const { data: payment } = useSuspenseQuery(paymentQuery({ paymentId }));

  if (payment.status === 'pending') {
    throw new RedirectError(`/payment/${paymentId}/pending`);
  }

  return <PaymentDetail payment={payment} />;
}
```

**언제 RedirectError가 필요한가?**

- 데이터 fetch **후**의 상태에 따른 라우팅 (SSR 시점엔 아직 데이터를 모름)
- 클라이언트 사이드의 권한/세션 상태에 따른 라우팅
- 사용자 액션 결과에 따른 자동 이동 (결제 완료 → 결과 페이지 등)

#### 선택 기준

| 상황                                | 도구                            | 라우팅 방식           |
| ----------------------------------- | ------------------------------- | --------------------- |
| URL param 자체의 정합성 (형식, 존재)| `getServerSideProps` + Zod      | `{ notFound: true }`  |
| 데이터/권한/상태 후 조건부 이동     | 컴포넌트 내부에서 throw         | `RedirectError`       |

URL의 정합성은 (a) SSR로, 비즈니스 조건 후 라우팅은 (b) `RedirectError`로. **둘을 섞으면 책임이 흐려진다.**

**참고** — API 응답 스키마 검증(`parseOrThrow`)도 같은 Zod 패턴이지만 잡는 쪽이 다름:
- API 응답 검증 실패 → `InvalidData` AppError → `GlobalErrorBoundary` ([부록 A](./remotes-mapping))
- 클라이언트 조건 위반 → `RedirectError` → `RedirectErrorBoundary` (여기)

### 2.3 RedirectErrorBoundary

**작동 메커니즘**

- `shouldCatch={isRedirectError}` — `RedirectError`만 잡고 다른 에러는 통과 (위로 propagate → 상위 Boundary로)
- 잡힌 경우 `fallback`(`RedirectFallback`)이 렌더링되며 `error` prop으로 잡힌 에러 전달
- `RedirectFallback` 안에서 `useEffect` + `router.replace(error.url)`로 실제 라우팅 수행
- 라우팅만 수행하고 UI는 렌더링하지 않음 (`return null`)

**구현**

```tsx
// /src/lib/error/RedirectErrorBoundary.tsx
import { ErrorBoundary, type ErrorBoundaryFallbackProps } from '@suspensive/react';
import { useRouter } from 'next/router';
import { useEffect, type PropsWithChildren } from 'react';
import { isRedirectError } from './RedirectError';

// 1) Fallback — error.url로 라우팅 수행 (UI 없음)
function RedirectFallback({ error }: ErrorBoundaryFallbackProps) {
  const router = useRouter();
  useEffect(() => {
    if (isRedirectError(error)) router.replace(error.url);
  }, [error, router]);
  return null;
}

// 2) Boundary — shouldCatch로 RedirectError만 선별
export function RedirectErrorBoundary({ children }: PropsWithChildren) {
  return (
    <ErrorBoundary shouldCatch={isRedirectError} fallback={RedirectFallback}>
      {children}
    </ErrorBoundary>
  );
}
```

> `@suspensive/react`의 `shouldCatch` 옵션을 활용. 라이브러리 없이 직접 구현하는 일반 형태는 §5 메타 패턴 참고.

**왜**

- "표시할 에러"와 "이동할 의도"를 같은 모델로 묶지 않음 → 처리 로직 분리
- 라우터 의존성을 페이지 안으로 끌어들이지 않음 (Boundary가 처리)
- throw + 잡는 Boundary가 **한 패턴 쌍** — 한쪽만 있으면 동작 안 함

**주의** — remote 함수에서 자동 리다이렉트 금지. `RedirectError`로 승격은 UI/Boundary 책임.

---

## 3. NotFoundError + NotFoundErrorBoundary

> `AppError(kind)`의 단순 분기로는 부족, **추가 메타데이터**(`resource`, `redirectTo`)나 **전용 UI**가 필요할 때.

### 3.1 NotFoundError 클래스

```typescript
// /src/lib/error/NotFoundError.ts
export class NotFoundError extends Error {
  readonly name = 'NotFoundError';
  constructor(
    public readonly resource: string,
    public readonly redirectTo?: string,
  ) {
    super(`${resource} not found`);
  }
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return (
    error != null &&
    typeof error === 'object' &&
    (error as { name?: string }).name === 'NotFoundError'
  );
}
```

### 3.2 throw

```typescript
if (!task) throw new NotFoundError('작업');                // 케이스 A: 404 UI 표시
if (!task) throw new NotFoundError('작업', '/tasks');      // 케이스 B: 리다이렉트
```

### 3.3 NotFoundErrorBoundary — UI 표시 vs 리다이렉트 분기

```tsx
// /src/lib/error/NotFoundErrorBoundary.tsx
import { ErrorBoundary, type ErrorBoundaryFallbackProps } from '@suspensive/react';
import { useRouter } from 'next/router';
import { useEffect, type PropsWithChildren } from 'react';
import { isNotFoundError } from './NotFoundError';

function NotFoundFallback({ error }: ErrorBoundaryFallbackProps) {
  const router = useRouter();

  useEffect(() => {
    if (isNotFoundError(error) && error.redirectTo) {
      router.replace(error.redirectTo);
    }
  }, [error, router]);

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

**왜**

- 특정 에러에 추가 정보(`resource`, `redirectTo`)를 담아 fallback에서 활용
- AppError를 부풀리지 않고 **별도 모델 + 별도 Boundary**로 분리
- 한 Boundary에서 `redirectTo` 유무에 따라 **리다이렉트와 UI 표시 동시 지원**

**주의** — 전용 클래스를 무분별하게 만들면 모델이 많아져 다시 복잡해진다. **`AppError(kind)`로 충분한지** 먼저 검토.

---

## 4. React Query 에러 + AsyncBoundary

> `Suspense + ErrorBoundary + QueryErrorResetBoundary`를 묶어 **로딩 / 에러 / 재시도**를 한 컴포넌트로.

### 4.1 AsyncBoundary

```tsx
// /src/lib/AsyncBoundary.tsx
import { Suspense, ErrorBoundary } from '@suspensive/react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import type { ComponentProps, FC, PropsWithChildren } from 'react';

interface AsyncBoundaryProps {
  pendingFallback: React.ReactNode;
  rejectedFallback: ComponentProps<typeof ErrorBoundary>['fallback'];
}

export const AsyncBoundary: FC<PropsWithChildren<AsyncBoundaryProps>> = ({
  pendingFallback,
  rejectedFallback,
  children,
}) => (
  <QueryErrorResetBoundary>
    {({ reset }) => (
      <ErrorBoundary fallback={rejectedFallback} onReset={reset}>
        <Suspense fallback={pendingFallback}>{children}</Suspense>
      </ErrorBoundary>
    )}
  </QueryErrorResetBoundary>
);
```

### 4.2 사용 예시

```tsx
<AsyncBoundary
  pendingFallback={<Loading />}
  rejectedFallback={({ error, reset }) => <ErrorFallback error={error} onReset={reset} />}
>
  <SuspenseQuery {...taskDetailQueryOptions(taskId)}>
    {({ data }) => <Content taskDetail={data} />}
  </SuspenseQuery>
</AsyncBoundary>
```

**왜**

- 로딩/에러/재시도를 **한 컴포넌트로** 묶음 → 페이지가 깔끔
- `onReset`으로 ErrorBoundary 재시도 시 **쿼리도 함께 리셋** → "다시 시도" 버튼이 실제로 작동
- `QueryErrorResetBoundary` 없이는 한 번 에러 난 쿼리가 재시도해도 캐시 에러 그대로

**주의** — 페이지 단위/카드 단위 어디든 둘 수 있으니 **단위 결정** 중요. 너무 잘게 두면 부분 로딩이 산만, 너무 크게 두면 일부 에러로 전체가 fallback.

> 재시도 정책(kind별 분기)과 Sentry 필터는 [부록 B](./react-query-policy) 참고.

---

## 5. 새 전용 에러 추가 — shouldCatch 메타 패턴

> §2 `RedirectError`, §3 `NotFoundError`처럼 새 전용 Error 클래스를 만들 때마다 따라할 일반 형태.

### 일반 템플릿

```tsx
import { ErrorBoundary, type ErrorBoundaryFallbackProps } from '@suspensive/react';
import { type PropsWithChildren } from 'react';
import { isXxxError } from './XxxError';

function XxxFallback({ error }: ErrorBoundaryFallbackProps) {
  // error 활용한 전용 처리: 라우팅 / 표시 / 로깅 등
  if (isXxxError(error)) {
    // ...
  }
  return null;
}

export function XxxErrorBoundary({ children }: PropsWithChildren) {
  return (
    <ErrorBoundary shouldCatch={isXxxError} fallback={XxxFallback}>
      {children}
    </ErrorBoundary>
  );
}
```

**구체 예시**

- §2 `RedirectError` → `RedirectErrorBoundary` (URL로 라우팅)
- §3 `NotFoundError` → `NotFoundErrorBoundary` (404 UI 또는 리다이렉트)

**왜**

- `shouldCatch`로 **딱 그 에러만** 잡고 나머지는 통과
- 페이지마다 분기/라우팅 로직을 중복하지 않음
- 일반 에러는 자연스럽게 `GlobalErrorBoundary`(§1)로 도달

**주의**

- `@suspensive/react`의 `shouldCatch`는 React 기본 ErrorBoundary에 없는 옵션
- 직접 구현 시 `componentDidCatch`에서 `shouldCatch(error)`가 false면 `throw error`로 **재던지기**

---

## 부록

부가 패턴들은 별도 문서로 분리:

- [A. Remotes 에러 정규화](./remotes-mapping) — `toAppError`, `parseOrThrow`(Zod), `try/catch`
- [B. React Query 정책](./react-query-policy) — kind 기반 retry, Sentry 401 제외
- [C. errorCopy 중앙 관리](./error-copy) — kind → 사용자 메시지 맵
- [D. 삼중 처리 계층 분리](./layered-architecture) — HTTP / Interceptor / Query 계층별 책임
