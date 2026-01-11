---
title: API Client 정의
description: Interceptor를 활용한 토큰 주입, 로깅, 토큰 갱신 자동화
outline: deep
---

# API Client 정의

## Overview

API Client 생성 패턴과 Interceptor 활용법을 다룹니다. 토큰 자동 주입, 로깅, 에러 리포팅, 토큰 갱신을 한 곳에서 관리할 수 있습니다.

## 1. API Client 생성

```tsx
// ✅ Good — 인스턴스 생성
import ky from 'ky';

export const apiClient = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
});
```

```tsx
// axios 사용 시
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});
```

```tsx
// ❌ Bad — 전역 객체 직접 사용
import axios from 'axios';

axios.get('/v1/users'); // 전역 설정에 의존
```

**이유:**
- 도메인별로 Client를 분리하여 관리 가능
- 각 Client마다 Interceptor를 개별 설정 가능
- 전역 변수 의존은 안티패턴

## 2. Request Interceptor 활용 사례

### 토큰 자동 주입

```tsx
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

모든 API 요청에 토큰이 자동으로 추가됩니다.

### 로깅 (데이터 분석용)

```tsx
// 모든 POST 요청 로깅
axios.interceptors.request.use((config) => {
  if (config.method?.toUpperCase() === 'POST') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: config.method,
      url: config.url,
      data: config.data,
    };
    Logger.info(logEntry); // Mixpanel 등
  }
  return config;
});
```

POST 요청을 로깅하면 유저 행동을 API 단위로 파악할 수 있습니다.

## 3. Response Interceptor 활용 사례

### 에러 리포팅 (Sentry)

```tsx
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

모든 API 에러가 자동으로 Sentry에 기록됩니다. 401은 정상적인 토큰 만료 케이스이므로 제외합니다.

### 토큰 자동 갱신

#### 기본 패턴

```tsx
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

    const token = await postRefreshToken({ refreshToken });
    saveTokens({
      accessToken: token.accessToken,
      refreshToken,
    });
  }

  return response;
}
```

#### 무한 루프 문제

기본 패턴에는 문제가 있습니다.

```tsx
// ❌ 무한 루프 발생
// apiClient로 API 요청 → 401 발생
// → interceptor에서 apiClient로 refresh API 호출 → refresh도 401 발생
// → 또 interceptor에서 refresh API 호출 → 무한 루프
```

refresh 전용 클라이언트를 분리하여 해결합니다.

```tsx
// refresh API 전용 (인터셉터 없음)
export const refreshApiClient = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
});

// 일반 API용 (인터셉터 포함)
export const apiClient = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
  retry: {
    limit: 2,
    methods: ['get', 'post', 'put', 'delete', 'patch'],
    statusCodes: [401],
  },
  hooks: {
    beforeRequest: [beforeRequestInterceptor],
    afterResponse: [afterResponseInterceptor, afterResponseErrorReporter],
  },
});
```

#### Race Condition 방지

여러 API가 동시에 401을 받으면 토큰 갱신 요청이 중복 발생할 수 있습니다. Promise를 공유하여 해결합니다.

```tsx
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

- 동시 401 발생 시 `refreshTokenPromise` 공유
- 첫 요청만 실제 갱신 API 호출, 나머지는 대기
- ky `retry` 설정으로 토큰 갱신 후 원래 요청 자동 재시도

## 4. HttpClient 래퍼 클래스 (선택)

서버 응답이 일정한 형태(`ApiResponse`)를 가질 때 래퍼 클래스로 추상화할 수 있습니다.

### Before

```tsx
// ❌ 모든 API에서 응답 구조 확인 반복
export async function fetchPayment(params: { id: string }) {
  const response = await httpClient.get(`/v1/payments/${params.id}`);

  if (response.data.resultType === 'SUCCESS') {
    return response.data.success;
  }

  throw new Error(response.data.error);
}
```

### HttpClient 클래스

```tsx
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
        return response.success;
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
  return error != null && typeof error === 'object' && (error as any)?.name === 'ApiError';
}
```

**왜 `instanceof` 대신 조건 체크를 사용하는가?**
- 번들 스플리팅 시 클래스가 여러 청크에 중복 포함되면 다른 인스턴스로 인식
- Server/Client Component 간 직렬화 시 클래스 정보 손실
- iframe, Web Worker 등에서 생성된 객체는 `instanceof` 실패

### After

```tsx
// remotes/httpClient.ts
import ky from 'ky';
import { HttpClient } from '@/lib/HttpClient';

const apiClient = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
});

export const httpClient = new HttpClient(apiClient);
```

```tsx
// ✅ 깔끔해진 API 함수
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
