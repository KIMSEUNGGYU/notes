---
title: 에러 핸들링
description: FE 에러 핸들링 베스트 패턴 카탈로그 — 14개 패턴으로 정리
outline: deep
---

# 에러 핸들링

> FE에서 에러를 다룰 때 반복적으로 등장하는 베스트 패턴들을 **복붙 가능한 템플릿** 형태로 정리한 카탈로그입니다.

## 에러를 어떻게 처리하면 좋을지

핵심 원칙 4가지:

1. **모든 에러를 단일 모델로 정규화한다** — catch에서 매번 분기/단언하지 않도록 `AppError(kind)` 하나로 통일
2. **계층마다 책임을 나눈다** — `remotes`는 매핑만, `Boundary/UI`는 표시·리다이렉트만
3. **타입 가드는 구조적으로** — `instanceof`는 번들/직렬화 환경에서 깨질 수 있으므로 `name` 속성 체크
4. **사용자 메시지는 한 곳에서** — `kind → copy` 맵으로 중앙 관리

각 패턴은 다음 형식으로 정리:

```
언제 쓰나   — 적용 상황
적용 위치   — 코드베이스 폴더/계층
템플릿      — 복붙 가능한 베스트 코드
왜          — 근거
주의        — 함정 (선택)
```

## 패턴 인덱스

| #  | 패턴                          | 분류           |
| -- | ----------------------------- | -------------- |
| 01 | AppError(kind)                | 모델           |
| 02 | RedirectError                 | 모델           |
| 03 | 전용 Error 클래스 분리        | 모델           |
| 04 | 구조적 타입 가드              | 모델           |
| 05 | toAppError                    | Remotes        |
| 06 | parseOrThrow (Zod)            | Remotes        |
| 07 | remote try/catch              | Remotes        |
| 08 | GlobalErrorBoundary           | Boundary       |
| 09 | shouldCatch Boundary          | Boundary       |
| 10 | AsyncBoundary                 | Boundary       |
| 11 | kind 기반 retry 정책          | React Query    |
| 12 | Sentry 401 제외               | React Query    |
| 13 | errorCopy 중앙 관리           | UI             |
| 14 | 삼중 처리 계층 분리           | 아키텍처       |

---

# 모델 패턴

## 01. AppError(kind) — 단일 에러 모델

**언제 쓰나** — 모든 catch에서 동일 패턴으로 분기하고 싶을 때

**적용 위치** — `src/lib/error/AppError.ts`

**템플릿**

```typescript
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
```

**왜**
- catch에서 `error: unknown`만 받아도 `kind` 한 줄로 분기 → 모든 호출처가 동일 패턴
- 새 에러 유형은 `AppErrorKind`에만 추가 → 변경 지점 최소화
- 사용자 메시지/재시도 정책을 `kind`만 보고 결정

**주의** — `name`을 `readonly` 리터럴로 두면 구조적 타입 가드(§04)가 안전해진다.

---

## 02. RedirectError — 라우팅 전용 에러

**언제 쓰나** — 어떤 조건을 만나면 페이지를 옮겨야 할 때 (`taskId` 누락 → 404 등)

**적용 위치** — `src/lib/error/RedirectError.ts` + `RedirectErrorBoundary.tsx`

**템플릿 — 1) Error 클래스**

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

**템플릿 — 2) 페이지에서 throw**

```typescript
function TaskDetailPage() {
  const { taskId } = useRouter().query;
  if (typeof taskId !== 'string') {
    throw new RedirectError('/404');
  }
  return <TaskContent taskId={taskId} />;
}
```

**템플릿 — 3) Boundary로 잡아서 라우팅 실행**

```tsx
// /src/lib/error/RedirectErrorBoundary.tsx
import { ErrorBoundary, type ErrorBoundaryFallbackProps } from '@suspensive/react';
import { useRouter } from 'next/router';
import { useEffect, type PropsWithChildren } from 'react';
import { isRedirectError } from './RedirectError';

function RedirectFallback({ error }: ErrorBoundaryFallbackProps) {
  const router = useRouter();
  useEffect(() => {
    if (isRedirectError(error)) router.replace(error.url);
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

**템플릿 — 4) `_app.tsx`에 배치**

```tsx
<GlobalErrorBoundary>
  <RedirectErrorBoundary>
    <Component {...pageProps} />
  </RedirectErrorBoundary>
</GlobalErrorBoundary>
```

**왜**
- "표시할 에러"와 "이동할 의도"를 같은 모델로 묶지 않음 → 처리 로직 분리
- 라우터 의존성을 페이지 안으로 끌어들이지 않음 (Boundary가 처리)
- throw + 잡는 Boundary가 **한 패턴 쌍** — 한쪽만 있으면 동작 안 함

**주의**
- remote 함수에서 자동 리다이렉트 금지 — `RedirectError`로 승격은 UI/Boundary 책임
- `RedirectErrorBoundary`는 `GlobalErrorBoundary` **안쪽**에 배치 — 일반 에러는 통과해서 Global이 받음 (§08, §09 참고)

---

## 03. 전용 Error 클래스 분리 — 추가 정보가 필요한 에러

**언제 쓰나** — `AppError(kind)`의 단순 분기로는 부족, **추가 메타데이터**나 **특수 UI**가 필요할 때 (NotFoundError 예시)

**적용 위치** — `src/lib/error/{XxxError}.ts` + `{XxxErrorBoundary}.tsx`

**템플릿 — 1) Error 클래스**

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

**템플릿 — 2) throw**

```typescript
if (!task) throw new NotFoundError('작업');                // 케이스 A: 404 UI 표시
if (!task) throw new NotFoundError('작업', '/tasks');      // 케이스 B: 리다이렉트
```

**템플릿 — 3) Boundary로 분기 처리 (UI 표시 vs 리다이렉트)**

```tsx
// /src/lib/error/NotFoundErrorBoundary.tsx
import { ErrorBoundary, type ErrorBoundaryFallbackProps } from '@suspensive/react';
import { useRouter } from 'next/router';
import { useEffect, type PropsWithChildren } from 'react';
import { isNotFoundError } from './NotFoundError';

function NotFoundFallback({ error }: ErrorBoundaryFallbackProps) {
  const router = useRouter();

  // redirectTo가 있으면 리다이렉트
  useEffect(() => {
    if (isNotFoundError(error) && error.redirectTo) {
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

**템플릿 — 4) Boundary 배치**

```tsx
<GlobalErrorBoundary>
  <RedirectErrorBoundary>
    <NotFoundErrorBoundary>
      <Component {...pageProps} />
    </NotFoundErrorBoundary>
  </RedirectErrorBoundary>
</GlobalErrorBoundary>
```

**왜**
- 특정 에러에 추가 정보(`resource`, `redirectTo`)를 담아 fallback에서 활용
- AppError를 부풀리지 않고 **별도 모델 + 별도 Boundary**로 분리
- 한 Boundary 안에서 `redirectTo` 유무에 따라 **리다이렉트와 UI 표시 동시 지원**

**주의** — 전용 클래스를 무분별하게 만들면 모델이 많아져 다시 복잡해진다. **`AppError(kind)`로 충분한지** 먼저 검토.

---

## 04. 구조적 타입 가드 — instanceof 회피

**언제 쓰나** — 모든 에러 판별 함수

**적용 위치** — 각 Error 클래스 파일 하단

**템플릿**

```typescript
export function isAppError(error: unknown): error is AppError {
  return (
    error != null &&
    typeof error === 'object' &&
    (error as { name?: string }).name === 'AppError'
  );
}

export function isRedirectError(error: unknown): error is RedirectError {
  return (
    error != null &&
    typeof error === 'object' &&
    (error as { name?: string }).name === 'RedirectError'
  );
}
```

**왜**
- **번들 코드 스플리팅** — 클래스가 여러 청크에 중복되면 `instanceof` false
- **직렬화/역직렬화** — Next.js Server → Client 전달 시 클래스 정보 손실
- **실행 컨텍스트 차이** — iframe / Web Worker / 다른 window에서 false
- `name` 속성 체크는 위 3가지 모두에서 **안전하게 통과**

**주의** — 더 엄격하게 하려면 `'kind' in error` 같은 속성 추가 체크.

---

# Remotes 계층 패턴

## 05. toAppError — HTTP status → AppErrorKind 매핑

**언제 쓰나** — remote 함수의 catch 블록 (모든 fetch/ky 에러를 받는 곳)

**적용 위치** — `src/lib/error/toAppError.ts`

**템플릿**

```typescript
import { AppError } from './AppError';

export async function toAppError(err: unknown): Promise<AppError> {
  const status =
    (err as { response?: { status?: number }; status?: number })?.response?.status ??
    (err as { status?: number })?.status;

  const serverMsg = await readServerMessage(err);

  if (status === 401 || status === 403) {
    return new AppError('Auth', serverMsg ?? '로그인이 필요합니다', { status, cause: err });
  }
  if (status === 404) return new AppError('NotFound', serverMsg ?? '찾을 수 없습니다', { status, cause: err });
  if (status === 422) return new AppError('InvalidData', serverMsg ?? '잘못된 요청입니다', { status, cause: err });
  if (typeof status === 'number' && status >= 500) {
    return new AppError('Server', serverMsg ?? '서버 오류', { status, cause: err });
  }

  // 상태 없음 — 네트워크/취소
  if (status == null) {
    const name = (err as { name?: string })?.name;
    if (name === 'AbortError' || name === 'CanceledError') {
      return new AppError('Unknown', '요청이 취소되었습니다', { cause: err });
    }
    return new AppError('Network', '네트워크 오류가 발생했습니다', { cause: err });
  }

  return new AppError('Unknown', serverMsg ?? '요청 처리 중 문제가 발생했습니다', { status, cause: err });
}

// 서버 응답 본문에서 메시지 추출 (json/text 모두 지원)
async function readServerMessage(err: unknown): Promise<string | undefined> {
  const res: Response | undefined =
    err instanceof Response ? err : (err as { response?: Response })?.response;
  if (!res) return;
  try {
    const ct = res.headers?.get?.('content-type') ?? '';
    if (ct.includes('application/json')) {
      const json = (await res.clone().json().catch(() => undefined)) as
        | { message?: string; error?: string }
        | undefined;
      return json?.message ?? json?.error;
    }
    return (await res.clone().text().catch(() => undefined))?.trim() || undefined;
  } catch {
    return;
  }
}
```

**왜**
- HTTP status 매핑을 **한 곳**에서만 함 → remote마다 분기 안 함
- 서버 message를 사용자에게 전달하면서도 **fallback 카피**로 안전망
- 비-HTTP 에러(AbortError, 네트워크)도 동일하게 `AppError`로 정규화

**주의** — `instanceof Response` 외의 라이브러리(ky, axios) 구조도 가정. 환경에 맞춰 status 추출 부분 조정.

---

## 06. parseOrThrow (Zod) — 응답 스키마 검증

**언제 쓰나** — 서버 응답을 사용하기 직전, 런타임 타입 보장이 필요할 때

**적용 위치** — `src/lib/zod/parseOrThrow.ts`

**템플릿**

```typescript
import { z } from 'zod';
import { AppError } from '@/lib/error/AppError';

export function parseOrThrow<T>(
  schema: z.ZodType<T>,
  data: unknown,
  message = 'API 응답 스키마 불일치',
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError('InvalidData', message, { cause: result.error });
  }
  return result.data;
}
```

**왜**
- 제네릭 `http.get<T>()`는 **컴파일 타입만 약속** — 런타임 안전 X
- Zod로 검증하면 서버 스키마 변경 시 즉시 `InvalidData`로 감지
- 검증 실패도 동일한 에러 모델(`AppError`)로 흐름 통일

**주의** — 모든 응답을 검증할 필요는 없음. 외부/금융/결제 같은 중요 도메인에 우선 적용.

---

## 07. remote try/catch — 원시 에러 정규화

**언제 쓰나** — 모든 remote 함수

**적용 위치** — `src/remotes/*.remote.ts`

**템플릿**

```typescript
import { http } from 'tosslib';
import { parseOrThrow } from '@/lib/zod/parseOrThrow';
import { toAppError } from '@/lib/error/toAppError';
import { QuestionsSchema } from '@/models/question.schema';

export async function fetchQuestions(signal?: AbortSignal) {
  try {
    const data = await http.get('/api/questions', { signal });
    return parseOrThrow(QuestionsSchema, data, '설문 목록 응답 스키마 불일치');
  } catch (err) {
    throw await toAppError(err);
  }
}
```

**왜**
- 모든 remote가 **같은 패턴** — try → 호출 → parse → catch → toAppError
- 호출처는 항상 `AppError`만 받음 → 분기 단순화
- remote에서 토스트/리다이렉트/로깅 일체 금지 (책임 분리)

**주의** — `try/catch`로 감싸지 않으면 ky의 raw `HTTPError`가 호출처까지 새어 나간다. 모든 remote에 일관 적용.

---

# Boundary / React Query 패턴

## 08. GlobalErrorBoundary — 전역 fallback + Sentry

**언제 쓰나** — 앱 최상위에서 모든 에러의 최종 폴백

**적용 위치** — `src/components/GlobalErrorBoundary.tsx`, `_app.tsx`

**템플릿**

```tsx
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

**왜**
- 잡히지 않은 모든 에러의 **최종 안전망**
- Sentry 로깅은 여기 한 곳에 (각 boundary가 중복 기록 X)
- `onError`에서 `ErrorInfo` context까지 전송 → 스택/컴포넌트 트리 확보

**주의** — `RedirectError`까지 잡지 않도록 안쪽에 `shouldCatch` Boundary를 둔다(§09).

---

## 09. shouldCatch Boundary — 특정 에러만 처리 (메타 패턴)

**언제 쓰나** — `RedirectError`(§02), `NotFoundError`(§03)처럼 **특정 에러만 잡아 전용 로직**으로 처리하고 싶을 때. 새 전용 Error 클래스를 만들 때마다 이 형태를 따른다.

**적용 위치** — `src/lib/error/{XxxErrorBoundary}.tsx`

**템플릿 (일반 형태)**

```tsx
import { ErrorBoundary, type ErrorBoundaryFallbackProps } from '@suspensive/react';
import { type PropsWithChildren } from 'react';
import { isXxxError } from './XxxError';

function XxxFallback({ error }: ErrorBoundaryFallbackProps) {
  // error를 활용한 전용 처리: 라우팅 / 표시 / 로깅 등
  if (isXxxError(error)) {
    // ...
  }
  return null; // 또는 전용 fallback UI
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
- §02 `RedirectError` → `RedirectErrorBoundary` (URL로 라우팅)
- §03 `NotFoundError` → `NotFoundErrorBoundary` (404 UI 또는 리다이렉트)

**왜**
- `shouldCatch`로 **딱 그 에러만** 잡고 나머지는 통과
- 페이지마다 분기/라우팅 로직을 중복하지 않음
- 일반 에러는 자연스럽게 `GlobalErrorBoundary`(§08)로 도달

**주의**
- `@suspensive/react`의 `shouldCatch`는 React 기본 ErrorBoundary에 없는 옵션 — 라이브러리 또는 직접 구현 필요
- 직접 구현 시 `componentDidCatch`에서 `shouldCatch(error)`가 false면 `throw error`로 **재던지기** 처리

---

## 10. AsyncBoundary — Suspense + ErrorBoundary + QueryReset

**언제 쓰나** — React Query 사용 페이지/컴포넌트의 로딩+에러+재시도 통합

**적용 위치** — `src/lib/AsyncBoundary.tsx`

**템플릿**

```tsx
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

```tsx
// 사용
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

**주의** — 페이지 단위/카드 단위 어디든 둘 수 있으니 **단위 결정**이 중요. 너무 잘게 두면 부분 로딩이 산만, 너무 크게 두면 일부 에러로 전체가 fallback.

---

## 11. kind 기반 retry 정책 — Query/Mutation 일관성

**언제 쓰나** — `QueryClient` 생성 시 (앱 1회)

**적용 위치** — `src/lib/queryClient.ts`

**템플릿**

```typescript
import { QueryClient } from '@tanstack/react-query';
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
    },
  },
});
```

| Kind         | 재시도   | 이유                                |
| ------------ | -------- | ----------------------------------- |
| Auth         | ❌       | 토큰 갱신도 실패한 상태 — 무의미    |
| NotFound     | ❌       | 리소스 없음 — 재시도해도 동일       |
| Server       | ✅ (2회) | 일시적 서버 오류 가능               |
| Network      | ✅ (2회) | 네트워크 불안정 가능                |
| InvalidData  | ✅ (2회) | 일시적 응답 이상 가능               |

**왜**
- `kind`만 보고 정책 결정 → status code 분기 X
- **Query와 Mutation이 같은 정책** — 일관성 깨지면 사용자 경험 들쭉날쭉
- 의미 없는 재시도 제거 → 서버 부하/응답 시간 절약

**주의**
- `error: unknown`으로 명시해야 `isAppError` 타입 가드가 동작
- 함수형 retry는 **반드시 boolean 반환** — `return 2` 같은 숫자는 타입 에러

---

## 12. Sentry 401 제외 — 노이즈 제거

**언제 쓰나** — `mutations.onError` 또는 글로벌 onError 콜백

**적용 위치** — `src/lib/queryClient.ts`

**템플릿**

```typescript
mutations: {
  retry: /* §11 참조 */,
  onError: (error: unknown) => {
    // 401은 정상 인증 플로우 — Sentry에 기록하지 않음
    if (isAppError(error) && error.kind === 'Auth') return;
    Sentry.captureException(error);
  },
}
```

**왜**
- 401은 **토큰 만료** 같은 정상적인 사용자 플로우 — 에러라기보단 상태 전이
- 모니터링에 진짜 문제만 남겨야 **실제 이슈가 묻히지 않음**
- 알람 노이즈 줄이면 oncall 피로도 감소

**주의** — `Auth` 외에 어떤 kind를 제외할지는 도메인에 따라 다름. NotFound도 정상 케이스인 경우가 많다.

---

# UI / 아키텍처 패턴

## 13. errorCopy 중앙 관리 — kind → 사용자 메시지

**언제 쓰나** — fallback UI / 토스트 / 모달에서 사용자에게 메시지 보여줄 때

**적용 위치** — `src/lib/error/errorCopy.ts`

**템플릿**

```typescript
import type { AppErrorKind } from './AppError';

export const errorCopy: Record<
  AppErrorKind,
  { title: string; desc?: string; actionLabel?: string }
> = {
  Auth: { title: '로그인이 필요합니다', desc: '세션이 만료되었어요.' },
  NotFound: { title: '찾을 수 없어요', desc: '요청한 리소스가 없어요.' },
  Network: { title: '네트워크 오류', desc: '인터넷 연결을 확인해주세요.' },
  Server: { title: '서버에 문제가 있어요', desc: '잠시 후 다시 시도해주세요.' },
  InvalidData: { title: '데이터가 유효하지 않아요', desc: '다시 시도하거나 문의해주세요.' },
  Unknown: { title: '문제가 발생했어요', desc: '잠시 후 다시 시도해주세요.' },
};
```

```tsx
// 사용
function FullScreenError({ error }: { error: AppError }) {
  const copy = errorCopy[error.kind];
  return (
    <div>
      <h2>{copy.title}</h2>
      {copy.desc && <p>{copy.desc}</p>}
    </div>
  );
}
```

**왜**
- 토스트/페이지/모달이 같은 메시지를 공유 → 일관된 UX
- 카피라이팅 수정 시 **한 곳만** 변경
- `Record<AppErrorKind, ...>`이므로 새 kind 추가 시 **TypeScript가 누락 강제**

**주의** — 서버가 의미 있는 message를 주면 `errorCopy[kind].title` 대신 `error.message`를 우선 표시하는 정책도 가능. 프로젝트마다 결정.

---

## 14. 삼중 처리 계층 분리 — HTTP / Interceptor / Query

**언제 쓰나** — 재시도/토큰 갱신/에러 분기가 코드베이스에 분산되어 중복되기 시작할 때

**적용 위치** — `remotes/index.ts` (ky 설정) + `afterResponseInterceptor` + `queryClient.ts`

**템플릿**

| 계층            | 위치                       | 역할             | 401 처리         | 일반 에러         |
| --------------- | -------------------------- | ---------------- | ---------------- | ----------------- |
| **HTTP**        | `remotes/index.ts` (ky)    | HTTP 재시도      | 최대 2회 재시도  | 재시도 안 함      |
| **Interceptor** | `afterResponseInterceptor` | 토큰 갱신        | 자동 토큰 갱신   | -                 |
| **Query**       | `queryClient.ts`           | 앱 레벨 재시도   | 재시도 안 함     | 최대 2회 재시도   |

```typescript
// HTTP 계층 (ky)
retry: { limit: 2, statusCodes: [401] }

// Interceptor
if (response.status === 401) await refreshToken();

// Query 계층 — §11과 동일
retry: (failureCount, error: unknown) => {
  if (isAppError(error) && error.kind === 'Auth') return false;
  return failureCount < 2;
}
```

**왜**
- 각 계층이 **자기 책임만** 진다 → 중복 처리 방지
- 401이 Query까지 도달했다는 건 "HTTP 재시도 + 토큰 갱신 둘 다 실패"라는 의미 → 더 재시도해봤자 동일
- 정책 변경 시 **한 곳만** 수정

**주의** — 모든 프로젝트가 삼중 구조까지 필요한 건 아니다. 토큰 갱신 정책이 단순하면 HTTP 계층 + Query 계층만으로 충분.

---

## 부록

- 패턴들은 **독립적**이므로 필요한 것부터 도입 가능
- 추천 도입 순서: §01 → §04 → §07 → §11 → §08 → 나머지
- 모델(§01~04)부터 잡으면 **나머지 패턴이 자연스럽게 따라붙는다**
