---
title: API 관리 (기본편)
description: 프론트엔드 개발시 API 정의 기본
outline: 2
draft: true
todo: 
 - 1차 초안 완성 (글 가독성 신경쓰기)
 - 글 다듬기?
---

# API 관리 (기본편)

## 0. 들어가며

프론트엔드 개발을 하다 보면 API 관련 코드가 점점 복잡해지는 경험을 하게 됩니다. 처음엔 간단하게 시작했던 API 호출 코드가, 프로젝트가 커지면서 관리하기 어려워지는 거죠.

저는 실무에서 이런 문제들을 자주 마주했습니다:

- API 함수마다 네이밍이 달라서 찾기 어려웠던 경험
- 타입이 제대로 정의되지 않아 런타임 에러가 발생했던 경험  
- API 관련 코드가 여기저기 흩어져서 수정할 때마다 여러 파일을 뒤져야 했던 경험

이번 글에서는 **변경에 용이한 API 관리 방법**을 다뤄보려고 합니다. 복잡한 패턴보다는 실무에서 바로 적용할 수 있는 실용적인 방법들을 소개하겠습니다.

---

## 1. 네이밍 컨벤션

### 1. API 인자는 `params`로 통일

API 함수에 전달하는 데이터는 `params`로 통일하는 것을 권장합니다.

#### ❌ Before

```typescript
function getUser(payload: GetUserPayload) { ... }
function createPost(body: CreatePostBody) { ... }
function updateComment(data: UpdateCommentData) { ... }
```

함수마다 `payload`, `body`, `data` 등 다른 이름을 사용하면 일관성이 떨어집니다.

#### ✅ After

```typescript
// Path Parameter - URL 경로에 사용
function fetchUser(params: FetchUserParams) {
  return httpClient.get(`/v1/users/${params.id}`);
}

// Search Parameter - 쿼리 스트링으로 전달
function fetchUsers(params: FetchUsersParams) {
  return httpClient.get('/v1/users', { params });
}

// Body Payload - 요청 본문으로 전달
function postUser(params: PostUserParams) {
  return httpClient.post('/v1/users', params);
}

// 혼합 사용 - Path + Body
function updateUser(params: UpdateUserParams) {
  const { id, ...body } = params;
  return httpClient.put(`/v1/users/${id}`, body);
}
```

**왜 `params`로 통일할까요?**

- search parameter, path parameter, body payload 등 다양한 형태의 데이터를 하나의 이름으로 표현할 수 있습니다
- 함수 내부에서 destructuring으로 용도에 맞게 분리합니다
- 일관된 네이밍은 코드 검색과 리팩토링을 쉽게 만듭니다

### 2. HTTP 메서드에 따른 함수 네이밍

HTTP 메서드에 따라 함수 이름의 prefix를 통일합니다.

| HTTP 메서드 | 함수 prefix | 예시 |
|------------|------------|------|
| GET | `fetch` | `fetchUser`, `fetchPostList` |
| POST | `post` | `postUser`, `postComment` |
| PUT/PATCH | `update` | `updateUser`, `updateProfile` |
| DELETE | `delete` | `deleteUser`, `deleteComment` |

#### ❌ Before

```typescript
function getUserList() { ... }        // GET
function getUser() { ... }            // GET
function createPost() { ... }         // POST
function modifyComment() { ... }      // PUT
function removePost() { ... }         // DELETE
```

함수 이름만 봐서는 어떤 HTTP 메서드를 사용하는지 알기 어렵습니다.

#### ✅ After

```typescript
function fetchUserList() { ... }      // GET
function fetchUser() { ... }          // GET
function postPost() { ... }           // POST
function updateComment() { ... }      // PUT
function deletePost() { ... }         // DELETE
```

**왜 이렇게 통일할까요?**

- 함수 이름만 봐도 어떤 HTTP 메서드를 사용하는지 바로 알 수 있습니다
- REST API의 의미론적 의도를 코드에서 명확하게 표현할 수 있습니다
- IDE의 자동완성을 활용할 때 `fetch`만 입력해도 모든 조회 API를 쉽게 찾을 수 있습니다

---

## 2. 타입 정의

API 응답 데이터의 타입을 정의하는 방법은 크게 두 가지가 있습니다.

### 방법 1: TypeScript 기본 타입 (interface/type)

가장 기본적이고 보편적인 방법입니다.

```typescript
// Payment.type.ts
export interface Payment {
  key: string;
  amount: number;
  detail?: {
    // ...
  };
}

export type PaymentList = Pick<Payment, 'key' | 'amount'>[];
```

**장점:**
- 별도의 라이브러리 없이 TypeScript 기본 기능만 사용
- 러닝 커브가 낮음
- 번들 사이즈 증가 없음

**단점:**
- 런타임에 타입 검증을 할 수 없음
- API 응답이 예상과 다를 때 타입 에러를 미리 잡을 수 없음

### 방법 2: Zod (선택사항)

런타임 타입 검증이 필요한 경우 Zod를 사용할 수 있습니다.

```typescript
// Payment.schema.ts
import { z } from 'zod';

export const PaymentSchema = z.object({
  key: z.string(),
  amount: z.number(),
  detail: z.object({
    // ...
  }).optional(),
});

export type Payment = z.infer<typeof PaymentSchema>;

export const PaymentListSchema = z.array(
  PaymentSchema.pick({ key: true, amount: true })
);
```

**장점:**
- API 응답을 파싱할 때 런타임에 타입을 검증할 수 있음
- 잘못된 데이터가 들어오면 즉시 에러를 발생시켜 디버깅이 쉬움
- 스키마에서 타입을 추론하므로 타입과 검증 로직이 항상 동기화됨

**단점:**
- 추가 라이브러리 필요 (번들 사이즈 증가)
- 팀원들이 Zod 문법을 익혀야 함
- 파싱 과정에서 약간의 성능 오버헤드 발생

### 어떤 방법을 선택해야 할까요?

저는 **Zod를 선호**하지만, 팀의 상황에 따라 다를 수 있습니다.

**Zod를 추천하는 경우:**
- 외부 API를 사용하는 경우 (응답 형태가 변경될 가능성)
- 타입 안정성이 중요한 금융/결제 도메인
- API 응답 데이터의 무결성 검증이 필요한 경우

**TypeScript 기본 타입을 추천하는 경우:**
- 내부 API를 사용하며 타입이 잘 관리되는 경우
- 번들 사이즈를 최소화해야 하는 경우
- 팀의 러닝 커브를 낮추고 싶은 경우

이 글에서는 두 방법을 모두 소개하지만, 예제는 **TypeScript 기본 타입**을 중심으로 작성하겠습니다.

---

## 3. API 정의 템플릿

### 디렉토리 구조

**지역성 원칙**: 실제 사용하는 곳과 가까운 위치에 파일을 둡니다.

자세한 내용은 [링크]를 참고해주세요.

```
src/
  pages/
    payment/
      models/payment.dto.ts       # 타입 정의
      remotes/payment.ts          # API 함수
      
  models/                         # 공통 타입
  remotes/                        # 공통 API
```

### 1. 타입 정의 (models/payment.dto.ts)

서버에서 단일 엔티티를 조회(GET)했을 때의 응답을 기준으로 작성합니다.

```typescript
// src/pages/payment/models/payment.dto.ts

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
```

이 기본 타입을 바탕으로 다른 API의 타입을 확장합니다:

```typescript
// 목록 조회 응답 (detail 제외)
export type PaymentListItem = Omit<Payment, 'detail'>;

// 생성 요청
export type CreatePaymentParams = Pick<Payment, 'amount'> & {
  description?: string;
};

// 수정 요청
export type UpdatePaymentParams = Partial<Pick<Payment, 'status'>> & {
  id: Payment['id'];
};
```

**왜 이렇게 할까요?**

- 하나의 기본 타입에서 파생되므로 타입 간 일관성이 유지됩니다
- 서버 응답이 변경되면 기본 타입만 수정하면 됩니다
- `Pick`, `Omit`, `Partial` 같은 유틸리티 타입으로 코드 중복을 줄일 수 있습니다

#### Zod를 사용하는 경우

```typescript
// src/pages/payment/models/payment.dto.ts
import { z } from 'zod';

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

export const PaymentListSchema = z.array(
  PaymentSchema.omit({ detail: true })
);
```

---

### 2. API 함수 정의 (remotes/payment.ts)

```typescript
// src/pages/payment/remotes/payment.ts
import { httpClient } from '@/remotes/httpClient';
import type { 
  Payment, 
  PaymentListItem,
  CreatePaymentParams,
  UpdatePaymentParams 
} from '../models/payment.dto';

// GET - 단건 조회
export async function fetchPayment(params: { id: Payment['id'] }) {
  const response = await httpClient.get<Payment>(`/v1/payments/${params.id}`);
  return response.data;
}

// GET - 목록 조회
export async function fetchPayments() {
  const response = await httpClient.get<PaymentListItem[]>('/v1/payments');
  return response.data;
}

// POST - 생성
export async function postPayment(params: CreatePaymentParams) {
  const response = await httpClient.post<Payment>('/v1/payments', params);
  return response.data;
}

// PUT - 수정
export async function updatePayment(params: UpdatePaymentParams) {
  const { id, ...body } = params;
  const response = await httpClient.put<Payment>(`/v1/payments/${id}`, body);
  return response.data;
}

// DELETE - 삭제
export async function deletePayment(params: { id: Payment['id'] }) {
  await httpClient.delete(`/v1/payments/${params.id}`);
}
```

#### Zod를 사용하는 경우

```typescript
// src/pages/payment/remotes/payment.ts (with Zod)
import { httpClient } from '@/remotes/httpClient';
import { PaymentSchema, PaymentListSchema } from '../models/payment.dto';

export async function fetchPayment(params: { id: string }) {
  const response = await httpClient.get(`/v1/payments/${params.id}`);
  // parse로 런타임 검증 + 타입 추론
  return PaymentSchema.parse(response.data);
}

export async function fetchPayments() {
  const response = await httpClient.get('/v1/payments');
  return PaymentListSchema.parse(response.data);
}

// POST, PUT, DELETE는 동일...
```

---

**왜 이렇게 할까요?**

- API 함수는 순수하게 HTTP 통신만 담당합니다
- 비즈니스 로직은 hook이나 service 레이어에서 처리합니다
- params 객체를 받아서 URL이나 body에 필요한 값을 추출합니다

---

## 4. 마무리

이번 글에서는 API 관리의 기본이 되는 세 가지를 다뤘습니다:

1. **네이밍 컨벤션** - params 통일, HTTP 메서드 기반 prefix
2. **타입 정의** - TypeScript 기본 타입 또는 Zod
3. **API 정의 템플릿** - models, remotes 파일 분리

저는 이런 기본 원칙들이 실무에서 정말 중요하다고 생각합니다. 처음엔 번거로워 보여도, 프로젝트가 커지면서 일관된 패턴의 가치를 체감하게 됩니다.

다음 **#2-2 심화편**에서는 HttpClient 설계, Interceptor 활용, VO 패턴 등을 다뤄보겠습니다.

---

**변경에 용이한 프론트엔드 코드 시리즈**
- [#1. 컴포넌트 설계](링크)
- #2-1. API 관리 - 기본편 (현재 글)
- #2-2. API 관리 - 심화편 (예정)
