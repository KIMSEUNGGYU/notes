---
title: 부록 — SSR Hydration / Dehydration
description: Next.js SSR에서 서버/클라이언트 중복 요청 방지
outline: deep
---

# 부록 — SSR Hydration / Dehydration

> Next.js App Router에서 React Query 사용 시 **서버/클라이언트 중복 요청**을 방지하는 패턴.

---

## 문제 — 중복 요청

```tsx
// ❌ 서버와 클라이언트가 각각 요청

// Server Component
export default async function Page() {
  const todos = await getTodos(); // 1. 서버 요청
  return <TodoListView initialData={todos} />;
}

// Client Component
function TodoListView({ initialData }) {
  const { data } = useQuery({
    queryKey: ['todos'],
    queryFn: getTodos, // 2. 클라이언트에서 또 요청
  });
}
```

같은 데이터를 서버/클라이언트가 두 번 요청. 첫 페이지 응답이 느려지고 서버 부하도 늘어남.

---

## 해결 — Hydration / Dehydration

### Server Component — prefetch + dehydrate

```tsx
// /app/todos/page.tsx
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { TodoListView } from './TodoListView';

export default async function TodosPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['todos'],
    queryFn: getTodos,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TodoListView />
    </HydrationBoundary>
  );
}
```

### Client Component — 동일 queryKey로 가져오기

```tsx
// TodoListView.tsx
'use client';

export function TodoListView() {
  // 서버에서 prefetch한 데이터를 그대로 사용 — 중복 요청 X
  const { data } = useSuspenseQuery({
    queryKey: ['todos'],
    queryFn: getTodos,
  });

  return <TodoList todos={data} />;
}
```

---

## 흐름

```
[Server Component]
   prefetchQuery → 데이터 가져오기
        ↓
   dehydrate → 직렬화
        ↓
   HydrationBoundary → 클라이언트로 전달
        ↓
[Client Component]
   캐시된 데이터 사용 (중복 요청 없음)
```

---

## 왜

- 서버에서 받은 데이터를 클라이언트가 **그대로 활용** → 중복 요청 제거
- 첫 페이지 렌더가 빠름 (서버 fetch 결과를 즉시 사용)
- `useSuspenseQuery` / `useQuery` 어느 쪽이든 동작

## 주의

- Server Component와 Client Component의 **`queryKey`가 정확히 같아야** 캐시 매칭 (`queryKey` 팩토리로 일치 보장)
- `getQueryClient`는 서버에서 매 요청마다 새 인스턴스 (메모리 누수 방지)
- `dehydrate`는 직렬화 가능한 데이터만 — `Date`, `Map`, 클래스 인스턴스 등은 손상될 수 있음
