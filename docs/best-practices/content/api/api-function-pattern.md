---
title: API 함수 작성 패턴
description: 함수명 네이밍, 매개변수 통일, 타입 정의 규칙
outline: deep
---

# API 함수 작성 패턴

## Overview

프론트엔드에서 API 함수를 일관되게 작성하기 위한 실무 패턴입니다. 함수명 규칙, 매개변수 네이밍, 타입 정의 방법을 다룹니다.

## 1. 함수명 네이밍

| HTTP 메서드 | Prefix | 예시 |
|-------------|--------|------|
| GET | `fetch` | `fetchUser`, `fetchUserList` |
| POST | `post` | `postUser`, `postComment` |
| PUT/PATCH | `update` | `updateUser`, `updateProfile` |
| DELETE | `delete` | `deleteUser`, `deleteComment` |

```tsx
// ✅ Good
function fetchUserList() { ... }   // GET
function fetchUser() { ... }       // GET
function postUser() { ... }        // POST
function updateUser() { ... }      // PUT
function deleteUser() { ... }      // DELETE

// ❌ Bad
function getUserList() { ... }
function createUser() { ... }
function modifyUser() { ... }
function removeUser() { ... }
```

**이유:**
- 함수명만 보고 HTTP 메서드 파악 가능
- IDE에서 `fetch` 입력 시 모든 조회 API 자동완성

## 2. 매개변수 네이밍

```tsx
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

// ❌ Bad
function getUser(payload: { id: string }) { ... }
function createUser(body: { name: string }) { ... }
function updateUser(data: { id: string }) { ... }
```

**이유:**
- search parameter, path parameter, body payload 모두 `params`로 통일
- 함수 내부에서 구조 분해로 용도별 분리 가능
- 코드 검색 시 `params`로 일괄 검색

## 3. 타입 정의 — TypeScript

GET 단건 조회 응답을 기준 타입으로 정의하고, 다른 API는 이를 확장합니다.

```tsx
// models/payment.dto.ts

// 기준 타입: GET 단건 조회 응답
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

// 목록 조회: detail 필드 제외
export type PaymentListItem = Omit<Payment, 'detail'>;

// 생성 요청: 필요한 필드만 선택
export type CreatePaymentParams = Pick<Payment, 'amount'> & {
  description?: string;
};

// 수정 요청: 선택적 필드 + 필수 id
export type UpdatePaymentParams = Partial<Pick<Payment, 'status'>> & {
  id: Payment['id'];
};
```

## 4. 타입 정의 — Zod (선택)

런타임 타입 검증이 필요한 경우 사용합니다.

> 참고: [검증하지 말고 파싱하라](https://eatchangmyeong.github.io/2022/12/04/parse-don-t-validate.html)
<!-- - [링크-이전중이라서](https://blog.eatch.dev/)  -->

```tsx
// models/payment.schema.ts
import { z } from 'zod';

// 기준 스키마: GET 단건 조회 응답
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

// 목록 조회 스키마
export const PaymentListSchema = z.array(
  PaymentSchema.omit({ detail: true })
);
```

**사용 권장 케이스:**
- 외부 API 연동 (응답 형태 변경 가능성)
- 타입 안정성이 중요한 도메인 (금융, 결제)
- 데이터 무결성 검증 필요

## 5. API 함수 템플릿

**TypeScript 사용 시**

```tsx
// remotes/payment.ts
import { httpClient } from '@/remotes/httpClient';
import type { Payment, PaymentListItem } from '../models/payment.dto';

// GET 단건
export async function fetchPayment(params: { id: string }) {
  const response = await httpClient.get<Payment>(`/v1/payments/${params.id}`);
  return response.data;
}

// GET 목록
export async function fetchPayments(params?: { status?: string; page?: number }) {
  const response = await httpClient.get<PaymentListItem[]>('/v1/payments', {
    searchParams: params,
  });
  return response.data;
}

// POST
export async function postPayment(params: { amount: number; description?: string }) {
  const response = await httpClient.post<Payment>('/v1/payments', {
    json: params,
  });
  return response.data;
}

// PUT
export async function updatePayment(params: { id: string; status: string }) {
  const { id, ...body } = params;
  const response = await httpClient.put<Payment>(`/v1/payments/${id}`, {
    json: body,
  });
  return response.data;
}

// DELETE
export async function deletePayment(params: { id: string }) {
  await httpClient.delete(`/v1/payments/${params.id}`);
}
```

**Zod 사용 시**

```tsx
// remotes/payment.ts
import { httpClient } from '@/remotes/httpClient';
import { PaymentSchema, PaymentListSchema } from '../models/payment.schema';

export async function fetchPayment(params: { id: string }) {
  const response = await httpClient.get(`/v1/payments/${params.id}`);
  return PaymentSchema.parse(response.data);
}

export async function fetchPayments() {
  const response = await httpClient.get('/v1/payments');
  return PaymentListSchema.parse(response.data);
}
```
