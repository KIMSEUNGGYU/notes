---
title: API 관리 패턴
description: 프론트엔드 API 레이어 패턴 실무 가이드
outline: deep
---

# API 관리 패턴

## 개요

프론트엔드에서 API를 체계적으로 관리하기 위한 실무 패턴입니다. 복잡한 이론보다는 **바로 적용 가능한 실용적인 방법**에 집중합니다.

### 주요 내용

- 일관된 네이밍 규칙으로 유지보수성 확보
- 타입 안정성 확보 (TypeScript / Zod)
- HTTP Client 설계 및 Interceptor 활용
- 토큰 갱신 및 에러 처리 자동화

---

## 1. 네이밍 규칙

### API 함수 매개변수는 `params`로 통일

```typescript
// ✅ Good
function fetchUser(params: { id: string }) {
  return httpClient.get(`/v1/users/${params.id}`);
}

function fetchUsers(params: { page: number; limit: number }) {
  return httpClient.get('/v1/users', { searchParams: params });
}

function postUser(params: { name: string; email: string }) {
  return httpClient.post('/v1/users', { json: params });
}

// ❌ Bad - 매개변수 이름이 제각각
function getUser(payload: { id: string }) { ... }
function createUser(body: { name: string }) { ... }
function updateUser(data: { id: string }) { ... }
```

**이유:**
- search parameter, path parameter, body payload 모두 `params`로 통일
- 함수 내부에서 destructuring으로 용도별 분리
- 코드 검색 및 리팩토링 용이

---

### HTTP 메서드별 함수 Prefix

| HTTP 메서드 | Prefix | 예시 |
|------------|--------|------|
| GET | `fetch` | `fetchUser`, `fetchUserList` |
| POST | `post` | `postUser`, `postComment` |
| PUT/PATCH | `update` | `updateUser`, `updateProfile` |
| DELETE | `delete` | `deleteUser`, `deleteComment` |

```typescript
// ✅ Good
function fetchUserList() { ... }      // GET
function fetchUser() { ... }          // GET
function postUser() { ... }           // POST
function updateUser() { ... }         // PUT
function deleteUser() { ... }         // DELETE

// ❌ Bad - 메서드를 파악하기 어려움
function getUserList() { ... }
function createUser() { ... }
function modifyUser() { ... }
function removeUser() { ... }
```

**이유:**
- 함수명만 보고 HTTP 메서드 파악 가능
- IDE 자동완성 활용 (예: `fetch` 입력 → 모든 조회 API 표시)
- REST API 의도를 코드에 명확히 표현

---

## 2. 타입 정의

### 기본 타입 (TypeScript)

가장 보편적인 방법입니다.

```typescript
// models/payment.dto.ts

// 기본 스키마: GET 단건 조회 응답 기준
export interface Payment {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  detail?: {
    description: string;
    metadata: Record<string, unknown>;
  };
}

// 다른 API는 기본 타입을 확장
export type PaymentListItem = Omit<Payment, 'detail'>;

export type CreatePaymentParams = Pick<Payment, 'amount'> & {
  description?: string;
};

export type UpdatePaymentParams = Partial<Pick<Payment, 'status'>> & {
  id: Payment['id'];
};
```

**장점:** 별도 라이브러리 불필요, 러닝 커브 낮음
**단점:** 런타임 타입 검증 불가

---

### Zod 스키마 (선택사항)

런타임 타입 검증이 필요한 경우 사용합니다.

```typescript
// models/payment.schema.ts
import { z } from 'zod';

// 기본 스키마: GET 단건 조회 응답 기준
export const PaymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  status: z.enum(['pending', 'completed', 'failed']),
  createdAt: z.string(),
  detail: z.object({
    description: z.string(),
    metadata: z.record(z.unknown()),
  }).optional(),
});

export type Payment = z.infer<typeof PaymentSchema>;

// 다른 API는 기본 스키마를 확장
export const PaymentListSchema = z.array(
  PaymentSchema.omit({ detail: true })
);
```

**장점:** 런타임 검증, 스키마-타입 자동 동기화
**단점:** 번들 사이즈 증가, 학습 필요

**사용 권장 케이스:**
- 외부 API (응답 형태 변경 가능성)
- 타입 안정성이 중요한 도메인 (금융/결제)
- 데이터 무결성 검증 필요

---

## 3. API 함수 정의

### 기본 패턴

```typescript
// remotes/payment.ts
import { httpClient } from '@/remotes/httpClient';
import type { Payment, PaymentListItem } from '../models/payment.dto';

// GET - 단건 조회
export async function fetchPayment(params: { id: string }) {
  const response = await httpClient.get<Payment>(`/v1/payments/${params.id}`);
  return response.data;
}

// GET - 목록 조회
export async function fetchPayments(params?: { status?: string; page?: number }) {
  const response = await httpClient.get<PaymentListItem[]>('/v1/payments', {
    searchParams: params,
  });
  return response.data;
}

// POST - 생성
export async function postPayment(params: { amount: number; description?: string }) {
  const response = await httpClient.post<Payment>('/v1/payments', {
    json: params,
  });
  return response.data;
}

// PUT - 수정
export async function updatePayment(params: { id: string; status: string }) {
  const { id, ...body } = params;
  const response = await httpClient.put<Payment>(`/v1/payments/${id}`, {
    json: body,
  });
  return response.data;
}

// DELETE - 삭제
export async function deletePayment(params: { id: string }) {
  await httpClient.delete(`/v1/payments/${params.id}`);
}
```

---

### Zod 사용 시

```typescript
// remotes/payment.ts
import { httpClient } from '@/remotes/httpClient';
import { PaymentSchema, PaymentListSchema } from '../models/payment.schema';

export async function fetchPayment(params: { id: string }) {
  const response = await httpClient.get(`/v1/payments/${params.id}`);
  return PaymentSchema.parse(response.data); // 런타임 검증 + 타입 추론
}

export async function fetchPayments() {
  const response = await httpClient.get('/v1/payments');
  return PaymentListSchema.parse(response.data);
}
```

---

## 4. HttpClient 설계

서버 응답이 일정한 형태(`ApiResponse`)를 가질 때, 래퍼 클래스로 추상화할 수 있습니다.

### 문제 상황

```typescript
// ❌ Before - 모든 API에서 응답 구조 확인 반복
export async function fetchPayment(params: { id: string }) {
  const response = await httpClient.get(`/v1/payments/${params.id}`);

  if (response.data.resultType === 'SUCCESS') {
    return response.data.success;
  }

  throw new Error(response.data.error);
}
```

---

### HttpClient 클래스

```typescript
// lib/HttpClient.ts
import { HTTPError, type KyInstance, type Options } from 'ky';

interface ApiSuccessResponse<T> {
  resultType: 'SUCCESS';
  success: T;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error: string;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class HttpClient {
  constructor(private client: KyInstance) {}

  private async request<T>(path: string, options?: Options): Promise<T> {
    try {
      const response = await this.client(path, options).json<ApiSuccessResponse<T>>();

      if (response.resultType === 'SUCCESS') {
        return response.success; // 실제 데이터만 반환
      }

      throw new Error('Invalid response type');
    } catch (error) {
      if (error instanceof HTTPError) {
        const errorBody = await error.response.json<ApiErrorResponse>();
        throw new ApiError(errorBody.statusCode, errorBody.error, errorBody.message);
      }
      throw error;
    }
  }

  get<T>(path: string, options?: Options): Promise<T> {
    return this.request(path, { ...options, method: 'get' });
  }

  post<T>(path: string, options?: Options): Promise<T> {
    return this.request(path, { ...options, method: 'post' });
  }

  put<T>(path: string, options?: Options): Promise<T> {
    return this.request(path, { ...options, method: 'put' });
  }

  delete<T>(path: string, options?: Options): Promise<T> {
    return this.request(path, { ...options, method: 'delete' });
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
```

---

### 사용

```typescript
// remotes/httpClient.ts
import ky from 'ky';
import { HttpClient } from '@/lib/HttpClient';

const apiClient = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
});

export const httpClient = new HttpClient(apiClient);
```

```typescript
// ✅ After - 깔끔해진 API 함수
export async function fetchPayment(params: { id: string }) {
  return httpClient.get<Payment>(`/v1/payments/${params.id}`);
}

// 에러 처리
try {
  const payment = await fetchPayment({ id: '123' });
} catch (error) {
  if (isApiError(error)) {
    console.error(error.statusCode, error.message);
  }
}
```

---

## 5. Interceptor 활용

### Request Interceptor - 토큰 자동 주입

```typescript
// remotes/httpClient.ts

function beforeRequestInterceptor(request: Request) {
  const token = useAuthStore.getState().tokens?.accessToken;

  if (token) {
    const headers = new Headers(request.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return new Request(request, { headers });
  }

  return request;
}

const apiClient = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
  hooks: {
    beforeRequest: [beforeRequestInterceptor],
  },
});
```

**효과:** 모든 API에서 토큰 수동 추가 불필요

---

### Response Interceptor - 토큰 자동 갱신

#### 문제: 순환 참조

```typescript
// ❌ 순환 참조 발생
// apiClient로 API 요청 → 401 발생
// → interceptor에서 apiClient로 refresh API 호출 → 401 발생
// → 무한 루프!
```

#### 해결: refresh 전용 클라이언트 분리

```typescript
// remotes/httpClient.ts

// refresh API 전용 (인터셉터 없음)
export const refreshApiClient = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
});

export const refreshHttpClient = new HttpClient(refreshApiClient);

// 일반 API용 (인터셉터 포함)
export const apiClient = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
  retry: {
    limit: 2,
    methods: ['get', 'post', 'put', 'delete', 'patch'],
    statusCodes: [401], // 401만 재시도
  },
  hooks: {
    beforeRequest: [beforeRequestInterceptor],
    afterResponse: [afterResponseInterceptor, afterResponseErrorReporter],
  },
});

export const httpClient = new HttpClient(apiClient);
```

---

#### Race Condition 방지

```typescript
// remotes/httpClient.ts

let refreshTokenPromise: Promise<void> | null = null;

async function afterResponseInterceptor(
  _request: Request,
  _options: NormalizedOptions,
  response: Response
) {
  if (response.status === 401) {
    const refreshToken = useAuthStore.getState().tokens?.refreshToken ?? '';

    if (!refreshToken) {
      logout();
      return response;
    }

    // 이미 토큰 갱신 중이면 해당 Promise 재사용
    if (refreshTokenPromise === null) {
      refreshTokenPromise = (async () => {
        try {
          const token = await postRefreshToken({ refreshToken });
          saveTokens({
            accessToken: token.accessToken,
            refreshToken,
          });
        } catch (error) {
          if (error instanceof HTTPError) {
            sentryService.captureApiError(error);
          }
          logout();
          throw error;
        } finally {
          refreshTokenPromise = null;
        }
      })();
    }

    await refreshTokenPromise;
  }

  return response;
}
```

**동작 흐름:**
1. API 요청 → 401 발생
2. `afterResponseInterceptor`에서 토큰 갱신
3. ky의 `retry` 메커니즘이 자동으로 원래 요청 재시도

**Race Condition 방지:**
- 동시 401 발생 시 `refreshTokenPromise` 공유
- 첫 요청만 실제 갱신 API 호출
- 나머지는 동일 Promise 대기

---

### Error Reporting - Sentry 자동 리포팅

```typescript
async function afterResponseErrorReporter(
  request: Request,
  options: NormalizedOptions,
  response: Response
) {
  // 401은 정상 케이스이므로 제외
  if (!response.ok && response.status !== 401) {
    const error = new HTTPError(response, request, options);
    sentryService.captureApiError(error);
  }

  return response;
}
```

**효과:**
- 모든 API 에러 자동 추적
- 정상 케이스(401) 제외로 노이즈 감소
- 각 API에서 에러 리포팅 코드 불필요

---

## 6. VO 클래스 패턴 (선택사항)

서버 응답 데이터에 비즈니스 로직을 추가할 때 유용합니다.

### 문제 상황

```typescript
// ❌ Before - 컴포넌트에서 직접 계산
function MovieDetail({ movie }: { movie: Movie }) {
  const hours = Math.floor(movie.runtime / 60);
  const minutes = movie.runtime % 60;
  const formattedRuntime = `${hours}시간 ${minutes}분`;

  const releaseYear = movie.releaseDate.split('-')[0];
  const genres = movie.genres.map(g => g.name).join(' • ');
  const movieInfo = `${releaseYear} • ${formattedRuntime} • ${genres}`;

  return <div>{movieInfo}</div>;
}
```

**문제:** 계산 로직 중복, 비즈니스 로직과 UI 혼재

---

### VO 클래스

```typescript
// utils/createBaseModel.ts
export const createBaseModel = <T>() => {
  return class {
    constructor(props: T) {
      Object.assign(this, props);
    }
  } as { new (args: T): Exclude<T, null | undefined> };
};
```

```typescript
// models/movie.service.ts
import { createBaseModel } from '@/utils/createBaseModel';
import type { MovieDetail } from './movie.dto';

abstract class MovieBase extends createBaseModel<MovieDetail>() {
  protected constructor(detail: MovieDetail) {
    super(detail);
  }

  get directors() {
    return this.credits.crew.filter((item) => item.department === 'Directing');
  }

  get formattedRuntime(): string {
    const hours = Math.floor(this.runtime / 60);
    const minutes = this.runtime % 60;
    return `${hours}시간 ${minutes}분`;
  }

  get movieInfo(): string {
    const releaseYear = this.releaseDate.split('-')[0];
    const genres = this.genres.map((item) => item.name).join(' • ');
    return `${releaseYear} • ${this.formattedRuntime} • ${genres}`;
  }

  get formattedRating(): string {
    return this.voteAverage.toFixed(1);
  }
}

export class Movie extends MovieBase {
  constructor(detail: MovieDetail) {
    super(detail);
  }
}
```

---

### API에서 사용

```typescript
// remotes/movie.ts
import { httpClient } from '@/remotes/httpClient';
import { Movie } from '../models/movie.service';

export async function fetchMovieDetail(params: { id: string }) {
  const response = await httpClient.get<MovieDetail>(`/movie/${params.id}`);
  return new Movie(response); // VO 클래스로 감싸서 반환
}
```

---

### 컴포넌트

```typescript
// ✅ After
function MovieDetail({ movie }: { movie: Movie }) {
  return (
    <div>
      <p>{movie.movieInfo}</p>
      <p>감독: {movie.directors.map(d => d.name).join(', ')}</p>
      <p>평점: {movie.formattedRating}</p>
    </div>
  );
}
```

**장점:**
- 비즈니스 로직 한 곳 집중
- 컴포넌트 간결
- 로직 독립 테스트 가능

**사용 권장:**
- 복잡한 계산 로직 필요 (영화, 주문, 결제)
- 같은 변환 로직 반복
- 도메인 로직 명확히 분리 필요

---

## 정리

### 핵심 원칙

| 항목 | 규칙 |
|------|------|
| 매개변수 | `params`로 통일 |
| 함수명 | `fetch`/`post`/`update`/`delete` prefix |
| 타입 기준 | GET 단건 조회 응답 |
| 타입 확장 | `Pick`/`Omit`/`Partial` 활용 |

### 선택 사항

- **Zod**: 외부 API, 타입 안정성 중요 시
- **HttpClient**: ApiResponse 형태 일정 시
- **Interceptor**: 토큰 관리, 에러 추적 필요 시
- **VO 패턴**: 복잡한 비즈니스 로직 필요 시

### 적용 우선순위

1. **필수**: 네이밍 규칙, 기본 타입 정의
2. **권장**: Interceptor (토큰 관리)
3. **선택**: HttpClient, Zod, VO 패턴

---
