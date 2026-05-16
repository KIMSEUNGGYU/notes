---
title: 부록 D — 삼중 처리 계층 분리
description: HTTP / Interceptor / Query 계층별 책임 분리
outline: deep
---

# 부록 D — 삼중 처리 계층 분리

> 재시도/토큰 갱신/에러 분기가 코드베이스에 분산되어 **중복되기 시작할 때** 적용. 각 계층이 자기 책임만 진다.

---

## 계층별 책임

| 계층            | 위치                       | 역할              | 401 처리         | 일반 에러         |
| --------------- | -------------------------- | ----------------- | ---------------- | ----------------- |
| **HTTP**        | `remotes/index.ts` (ky)    | HTTP 재시도       | 최대 2회 재시도  | 재시도 안 함      |
| **Interceptor** | `afterResponseInterceptor` | 토큰 갱신         | 자동 토큰 갱신   | -                 |
| **Query**       | `queryClient.ts`           | 앱 레벨 재시도    | 재시도 안 함     | 최대 2회 재시도   |

---

## 각 계층의 코드

### HTTP 계층 (ky)

```typescript
// /src/remotes/index.ts
retry: {
  limit: 2,
  statusCodes: [401], // 401만 재시도
}
```

### Interceptor

```typescript
// afterResponseInterceptor
if (response.status === 401) {
  await refreshToken();
  return retry(originalRequest);
}
```

### Query 계층

```typescript
// /src/lib/queryClient.ts (부록 B와 동일)
retry: (failureCount, error: unknown) => {
  if (isAppError(error) && error.kind === 'Auth') return false;
  return failureCount < 2;
}
```

---

## 왜 Query에서 Auth는 재시도 안 하나

- HTTP/Interceptor에서 이미 401 → 토큰 갱신을 시도함
- Query까지 `Auth`가 도달했다는 건 **토큰 갱신도 실패**했다는 의미
- 더 재시도해봤자 같은 결과 → 로그인 페이지로 리다이렉트

```
요청 → HTTP 401 → ky가 1회 재시도 (limit: 2)
            ↓ 여전히 401
       Interceptor에서 refreshToken()
            ↓ 갱신 실패
       AppError('Auth')로 변환되어 Query까지 도달
            ↓
       Query는 재시도 안 함 → 로그인 페이지로
```

## 계층 분리의 이점

- **중복 처리 방지** — 토큰 갱신을 Query에서도 한 번 더 시도하는 등의 중복 없음
- **디버깅 용이** — 어느 계층에서 처리했는지 명확
- **정책 변경 시 한 곳만 수정** — 재시도 횟수를 늘리고 싶으면 해당 계층만

## 주의

- 모든 프로젝트가 삼중 구조까지 필요한 건 아니다
- 토큰 갱신 정책이 단순하면 **HTTP 계층 + Query 계층만**으로 충분
- 도입 시점: 같은 재시도/갱신 로직이 2-3곳에 흩어져 있다고 느낄 때
