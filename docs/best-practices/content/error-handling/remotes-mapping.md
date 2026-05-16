---
title: 부록 A — Remotes 에러 정규화
description: HTTP status → AppErrorKind 매핑 + Zod 응답 검증
outline: deep
---

# 부록 A — Remotes 에러 정규화

> 메인 [§1 AppError](./) 모델로 정규화하기 위한 매핑 패턴들. remote 함수가 모든 에러를 `AppError`로 변환해주면 호출처(useQuery/useMutation)는 항상 같은 모델만 다루면 된다.

**remote 함수의 표준 형태**

```
try → http 호출 → parseOrThrow(Zod) → catch → toAppError → throw
```

세 가지 도구가 필요:
1. `toAppError` — HTTP status → AppErrorKind 매핑
2. `parseOrThrow` — Zod로 응답 검증
3. `try/catch` 템플릿 — 일관 적용

---

## 1. toAppError — HTTP status → AppErrorKind 매핑

**적용 위치** — `src/lib/error/toAppError.ts`

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

- HTTP status 매핑을 **한 곳**에서만 함 → remote마다 분기 X
- 서버 message를 사용자에게 전달하면서 **fallback 카피**로 안전망
- 비-HTTP 에러(`AbortError`, 네트워크 단절)도 동일하게 `AppError`로 정규화

**주의** — `instanceof Response` 외의 라이브러리(ky, axios) 구조도 가정. 환경에 맞춰 status 추출 부분 조정.

---

## 2. parseOrThrow — Zod로 응답 검증

**적용 위치** — `src/lib/zod/parseOrThrow.ts`

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

## 3. remote try/catch 템플릿

**적용 위치** — `src/remotes/*.remote.ts`

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

**주의** — `try/catch`로 감싸지 않으면 ky의 raw `HTTPError`가 호출처까지 새어 나간다. **모든 remote에 일관 적용** 필수.

---

## 정리

remote는 **항상 이 흐름** — 호출처는 매번 같은 모델 받는다.

```
http.get/post → parseOrThrow → catch → toAppError → throw AppError
```

이렇게 정규화하면 `useQuery`/`useMutation` 콜백에서 `isAppError(error) && error.kind === ...` 한 줄로 분기 가능 — 메인의 §1 AppError 모델이 코드베이스 전반에서 동작.
