---
title: API 관리 (심화편)
description: 프론트엔드 개발시 API 활용
outline: 2
draft: true
todo: 
 - 1차 초안 완성 (글 가독성 신경쓰기)
 - 글 다듬기?
---

# API 관리 (심화편)

## 0. 들어가며

[#2-1 기본편](링크)에서는 API 관리의 기본이 되는 네이밍 컨벤션, 타입 정의, 파일 구조를 다뤘습니다.

이번 심화편에서는 실무에서 마주치는 더 복잡한 요구사항들을 다룹니다:

- API 응답 형태가 일정하지 않아 매번 데이터를 추출하는 번거로움
- 토큰 만료 시 자동으로 갱신하고 재요청하는 로직
- 여러 API가 동시에 실패했을 때 토큰 갱신이 중복 호출되는 문제
- API 에러를 효과적으로 추적하고 모니터링하는 방법

이런 문제들을 해결하기 위한 패턴들을 소개하겠습니다.

---

## 1. HttpClient 설계

### 문제 상황

일반적으로 axios나 ky를 직접 사용하면 이런 코드를 작성하게 됩니다:

```typescript
// ❌ Before
export async function fetchPayment(params: { id: string }) {
  const response = await httpClient.get(`/v1/payments/${params.id}`);
  
  // API 응답 구조에 따라 매번 다르게 처리
  if (response.data.resultType === 'SUCCESS') {
    return response.data.success;
  }
  
  throw new Error(response.data.error);
}
```

**문제점:**
- 모든 API 함수에서 응답 구조를 확인하는 코드가 반복됩니다
- 에러 처리 로직이 일관되지 않습니다
- 실제 데이터를 추출하는 과정이 번거롭습니다

### 해결: HttpClient 래퍼 클래스

서버 응답이 일정한 형태(`ApiResponse`)를 가질 때, 이를 추상화하는 HttpClient 클래스를 만들 수 있습니다.

#### 1. 응답 타입 정의

```typescript
// lib/HttpClient.ts

// 성공 응답
interface ApiSuccessResponse<T> {
  resultType: 'SUCCESS';
  success: T;
}

// 에러 응답
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error: string;
}
```

#### 2. ApiError 클래스

```typescript
// lib/HttpClient.ts

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

// 타입 가드
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
```

#### 3. HttpClient 클래스

```typescript
// lib/HttpClient.ts
import { HTTPError, type KyInstance, type Options } from 'ky';

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
      // HTTPError (4xx, 5xx)
      if (error instanceof HTTPError) {
        const errorBody = await error.response.json<ApiErrorResponse>();
        throw new ApiError(errorBody.statusCode, errorBody.error, errorBody.message);
      }

      // 네트워크 에러, 타임아웃 등
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

  patch<T>(path: string, options?: Options): Promise<T> {
    return this.request(path, { ...options, method: 'patch' });
  }

  delete<T>(path: string, options?: Options): Promise<T> {
    return this.request(path, { ...options, method: 'delete' });
  }
}
```

#### 4. httpClient 인스턴스 생성

```typescript
// remotes/httpClient.ts
import ky from 'ky';
import { HttpClient } from '@/lib/HttpClient';

const apiClient = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
});

export const httpClient = new HttpClient(apiClient);
```

#### 5. 깔끔해진 API 함수

```typescript
// ✅ After
export async function fetchPayment(params: { id: string }) {
  // HttpClient가 알아서 success 데이터만 반환
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

**장점:**
- API 함수가 간결해집니다
- 응답 구조 파싱 로직이 한 곳에 집중됩니다
- 일관된 에러 처리가 가능합니다

---

## 2. Interceptor 활용

Interceptor를 사용하면 모든 API 요청/응답을 가로채서 공통 로직을 실행할 수 있습니다.

### 1. Request Interceptor - 토큰 자동 주입

모든 API 요청에 자동으로 AccessToken을 추가합니다.

```typescript
// remotes/httpClient.ts

/**
 * 모든 요청에 AccessToken을 자동으로 주입
 */
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

**왜 이렇게 할까요?**
- 모든 API 함수에서 토큰을 수동으로 추가할 필요가 없습니다
- 토큰 관리 로직이 한 곳에 집중됩니다

### 2. Response Interceptor - 토큰 자동 갱신

401 에러(토큰 만료) 발생 시 자동으로 토큰을 갱신하고 재요청합니다.

#### 문제: 순환 참조

일반적인 방법으로 구현하면 순환 참조 문제가 발생합니다:

```typescript
// ❌ 순환 참조 문제
// 1. apiClient로 API 요청 → 401 발생
// 2. interceptor에서 apiClient로 refresh API 호출 → 401 발생
// 3. 다시 interceptor에서 apiClient로... → 무한 루프!
```

#### 해결: refresh 전용 클라이언트 분리

```typescript
// remotes/httpClient.ts

/**
 * refresh API 전용 ky 인스턴스 (인터셉터 없음)
 * 순환 참조 방지를 위해 별도로 관리
 */
export const refreshApiClient = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
});

export const refreshHttpClient = new HttpClient(refreshApiClient);

/**
 * 일반 API용 ky 인스턴스 (인터셉터 포함)
 */
export const apiClient = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
  retry: {
    limit: 2,
    methods: ['get', 'post', 'put', 'delete', 'patch'],
    statusCodes: [401], // 401 에러만 재시도
  },
  hooks: {
    beforeRequest: [beforeRequestInterceptor],
    afterResponse: [afterResponseInterceptor, afterResponseErrorReporter],
  },
});

export const httpClient = new HttpClient(apiClient);
```

#### Race Condition 방지

여러 API가 동시에 401을 받으면 토큰 갱신이 중복 호출될 수 있습니다.

```typescript
// remotes/httpClient.ts

/**
 * 401 응답이 동시에 발생하는 경우 여러 토큰 갱신 요청을 방지하기 위해 Promise를 공유
 */
let refreshTokenPromise: Promise<void> | null = null;

/**
 * 401 에러 발생 시 토큰 갱신 처리
 * afterResponse에서 토큰 갱신 후, ky의 retry 메커니즘이 자동으로 재시도
 */
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

    // 이미 토큰 갱신 중이면 해당 Promise를 기다림 (Race Condition 방지)
    if (refreshTokenPromise === null) {
      refreshTokenPromise = (async () => {
        try {
          // refreshToken으로 accessToken 갱신
          const token = await postRefreshToken({ refreshToken });
          saveTokens({
            accessToken: token.accessToken,
            refreshToken,
          });
        } catch (error) {
          // refreshToken도 만료된 경우 로그아웃
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

    // 토큰 갱신 완료 대기
    await refreshTokenPromise;
  }

  return response;
}
```

**동작 흐름:**

1. API 요청 → 401 발생
2. `afterResponseInterceptor`에서 refreshToken으로 토큰 갱신
3. ky의 `retry` 메커니즘이 자동으로 원래 요청 재시도
4. 새 토큰으로 성공

**Race Condition 방지:**
- 동시에 여러 API가 401을 받아도 `refreshTokenPromise`를 공유
- 첫 번째 요청만 실제 갱신 API를 호출
- 나머지는 같은 Promise를 기다림

### 3. Error Reporting - Sentry 자동 리포팅

```typescript
// remotes/httpClient.ts

/**
 * 에러 응답을 Sentry에 리포팅
 * 401은 정상적인 토큰 만료이므로 리포팅 제외
 */
async function afterResponseErrorReporter(
  request: Request,
  options: NormalizedOptions,
  response: Response
) {
  // 401은 토큰 만료로 정상적인 케이스이므로 리포팅 제외
  if (!response.ok && response.status !== 401) {
    const error = new HTTPError(response, request, options);
    sentryService.captureApiError(error);
  }

  return response;
}
```

**왜 이렇게 할까요?**
- 모든 API 에러를 자동으로 추적할 수 있습니다
- 정상적인 케이스(401)는 제외하여 노이즈를 줄입니다
- 각 API 함수에서 일일이 에러 리포팅 코드를 작성할 필요가 없습니다

### 4. 로깅 (선택사항)

개발 환경이나 특정 상황에서 API 로깅이 필요할 때:

```typescript
// Request 로깅
function requestLogger(request: Request) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[API Request]', request.method, request.url);
  }
  return request;
}

// Response 로깅
async function responseLogger(
  request: Request,
  options: NormalizedOptions,
  response: Response
) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[API Response]', response.status, request.url);
  }
  return response;
}

const apiClient = ky.create({
  hooks: {
    beforeRequest: [beforeRequestInterceptor, requestLogger],
    afterResponse: [afterResponseInterceptor, responseLogger],
  },
});
```

---

## 3. VO 클래스 패턴 (선택사항)

VO(Value Object) 패턴은 서버 응답 데이터에 비즈니스 로직을 추가할 때 유용합니다.

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
  
  const directors = movie.credits.crew.filter(c => c.department === 'Directing');
  
  return (
    <div>
      <p>{movieInfo}</p>
      <p>감독: {directors.map(d => d.name).join(', ')}</p>
    </div>
  );
}
```

**문제점:**
- 같은 계산 로직이 여러 컴포넌트에 중복됩니다
- 비즈니스 로직이 UI 코드와 섞여 있습니다
- 테스트하기 어렵습니다

### 해결: VO 클래스

#### 1. createBaseModel 유틸

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

#### 2. Movie 클래스 정의

```typescript
// models/movie.ts
import { createBaseModel } from '@/utils/createBaseModel';
import type { MovieDetail } from './movie.dto';

type Cast = MovieDetail['credits']['cast'][number];
type Crew = MovieDetail['credits']['crew'][number];

abstract class MovieBase extends createBaseModel<MovieDetail>() {
  protected constructor(detail: MovieDetail) {
    super(detail);
  }

  // People 관련 로직
  get directors(): Crew[] {
    return this.credits.crew.filter((item) => item.department === 'Directing');
  }
  
  get mainActors(): Cast[] {
    return this.credits.cast.slice(0, 6);
  }

  // 비즈니스 로직
  get formattedRuntime(): string {
    const hours = Math.floor(this.runtime / 60);
    const minutes = this.runtime % 60;
    return `${hours}시간 ${minutes}분`;
  }

  get movieInfo(): string {
    const releaseYear = this.releaseDate.split('-')[0];
    const runtime = this.formattedRuntime;
    const genres = this.genres.map((item) => item.name).join(' • ');
    return `${releaseYear} • ${runtime} • ${genres}`;
  }

  get formattedRating(): string {
    return this.voteAverage.toFixed(1);
  }
}

// 실제 구현체
export class Movie extends MovieBase {
  constructor(detail: MovieDetail) {
    super(detail);
  }
}
```

#### 3. API에서 사용

```typescript
// remotes/movie.ts
import { httpClient } from '@/remotes/httpClient';
import { Movie } from '../models/movie';
import type { MovieDetail } from '../models/movie.dto';

export async function fetchMovieDetail(params: { id: string }) {
  const response = await httpClient.get<MovieDetail>(`/movie/${params.id}`);
  return new Movie(response); // VO 클래스로 감싸서 반환
}
```

#### 4. 깔끔해진 컴포넌트

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
- 비즈니스 로직이 한 곳에 집중됩니다
- 컴포넌트가 간결해집니다
- 로직을 독립적으로 테스트할 수 있습니다
- getter를 사용해 자연스러운 인터페이스를 제공합니다

**단점:**
- 클래스 문법에 익숙하지 않으면 러닝 커브가 있습니다
- 간단한 데이터 변환에는 과한 추상화일 수 있습니다

### 언제 사용할까요?

**VO 패턴을 추천하는 경우:**
- 복잡한 계산 로직이 필요한 도메인 (영화, 주문, 결제 등)
- 같은 변환 로직이 여러 곳에서 반복되는 경우
- 도메인 로직을 명확하게 분리하고 싶은 경우

**단순 함수를 추천하는 경우:**
- 간단한 포맷팅만 필요한 경우
- 한 곳에서만 사용하는 로직
- 팀에서 함수형 프로그래밍을 선호하는 경우

---

## 4. 마무리

이번 글에서는 API 관리의 심화 패턴들을 다뤘습니다:

1. **HttpClient 설계** - ApiResponse 래핑, 일관된 에러 처리
2. **Interceptor 활용** - 토큰 자동 주입/갱신, Race Condition 방지, 에러 리포팅
3. **VO 클래스 패턴** - 비즈니스 로직 캡슐화

저는 이런 패턴들이 프로젝트 초기에는 과할 수 있지만, 프로젝트가 커지면서 점점 가치를 발휘한다고 생각합니다. 특히 토큰 갱신 로직과 에러 리포팅은 거의 모든 프로젝트에서 필요한 기능이기에 초기에 잘 설계해두면 나중에 큰 도움이 됩니다.

---

**변경에 용이한 프론트엔드 코드 시리즈**
- [#1. 컴포넌트 설계](링크)
- [#2-1. API 관리 - 기본편](링크)
- #2-2. API 관리 - 심화편 (현재 글)
