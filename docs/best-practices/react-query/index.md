---
title: React Query 패턴
description: 실무 중심 React Query 사용 패턴
outline: deep
---

# React Query 패턴

## 개요

React Query는 서버 상태 관리를 단순화하고 캐싱, 동기화, 에러 처리를 자동으로 처리합니다.

---

## 1. queryOptions

### queryOptions vs UseQueryOptions

**queryOptions를 사용하는 이유:**

```tsx
// ❌ UseQueryOptions 직접 사용
const getTaskQueryOptions = (id: string): UseQueryOptions<Task> => ({
  queryKey: ['tasks', id],
  queryFn: () => getTask(id),
  select: (data) => data.task,  // TData 타입 추론 불가
});

// ✅ queryOptions 사용
const getTaskQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['tasks', id],
    queryFn: () => getTask(id),
    select: (data) => data.task,  // TData 자동 추론
  });
```

**장점:**

| 구분 | UseQueryOptions | queryOptions |
|------|----------------|--------------|
| 타입 추론 | select 타입 수동 지정 | select에서 TData 자동 추론 |
| 관심사 분리 | 정의/실행 혼재 | 정의와 실행 분리 |
| 재사용성 | 낮음 | 높음 |

---

### Query Factory 패턴

```tsx
// queries/task.query.ts
import { queryOptions } from '@tanstack/react-query';

export const taskQueries = {
  all: () => ['tasks'] as const,
  lists: () => [...taskQueries.all(), 'list'] as const,
  list: (filters: TaskFilters) =>
    queryOptions({
      queryKey: [...taskQueries.lists(), filters],
      queryFn: () => getTaskList(filters),
    }),
  details: () => [...taskQueries.all(), 'detail'] as const,
  detail: (id: string) =>
    queryOptions({
      queryKey: [...taskQueries.details(), id],
      queryFn: () => getTaskDetail(id),
    }),
};

// 사용
const { data } = useQuery(taskQueries.detail('123'));
```

**Query Key 계층 구조:**

```tsx
['tasks']                           // 모든 task 쿼리
['tasks', 'list']                   // 모든 task 리스트
['tasks', 'list', { status: 'TODO' }]  // 필터링된 리스트
['tasks', 'detail']                 // 모든 task 상세
['tasks', 'detail', '123']          // 특정 task
```

**무효화 전략:**

```tsx
// 모든 task 쿼리 무효화
queryClient.invalidateQueries({ queryKey: taskQueries.all() });

// task 리스트만 무효화
queryClient.invalidateQueries({ queryKey: taskQueries.lists() });

// 특정 task만 무효화
queryClient.invalidateQueries({ queryKey: taskQueries.detail('123') });
```

---

## 2. Hydration/Dehydration (SSR)

### 문제: 서버/클라이언트 중복 요청

```tsx
// ❌ 중복 요청 발생
// Server Component
export default async function Page() {
  const todos = await getTodos();  // 1. 서버에서 요청
  return <TodoListView initialData={todos} />;
}

// Client Component
function TodoListView({ initialData }) {
  const { data } = useQuery({
    queryKey: ['todos'],
    queryFn: getTodos,  // 2. 클라이언트에서 또 요청
  });
}
```

---

### 해결: Hydration으로 서버 데이터 재사용

```tsx
// app/todos/page.tsx (Server Component)
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { TodoListView } from './TodoListView';

export default async function TodosPage() {
  const queryClient = getQueryClient();

  // 1. 서버에서 prefetch
  await queryClient.prefetchQuery({
    queryKey: ['todos'],
    queryFn: getTodos,
  });

  // 2. dehydrate로 서버 데이터 직렬화
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TodoListView />
    </HydrationBoundary>
  );
}
```

```tsx
// TodoListView.tsx (Client Component)
'use client';

export function TodoListView() {
  // 3. 서버 데이터를 클라이언트에서 재사용 (중복 요청 없음)
  const { data } = useQuery({
    queryKey: ['todos'],
    queryFn: getTodos,
    staleTime: Infinity,        // 자동 refetch 방지
    gcTime: 60 * 60 * 1000,     // 1시간 캐시 유지
  });

  return <TodoList todos={data} />;
}
```

**흐름:**
1. 서버에서 `prefetchQuery` → 데이터 가져오기
2. `dehydrate` → 직렬화
3. `HydrationBoundary` → 클라이언트로 전달
4. 클라이언트에서 캐시된 데이터 사용 (중복 요청 없음)

---

### staleTime vs gcTime

```tsx
queryOptions({
  queryKey: ['todos'],
  queryFn: getTodos,
  staleTime: 5 * 60 * 1000,   // 5분: 이 시간 내엔 fresh, refetch 안 함
  gcTime: 10 * 60 * 1000,      // 10분: 메모리에서 캐시 유지 시간
});
```

| 옵션 | 역할 | 예시 |
|------|------|------|
| staleTime | 데이터 신선도 기준 | `0`이면 항상 stale → 즉시 refetch |
| gcTime | 메모리 캐시 유지 시간 | 컴포넌트 unmount 후에도 캐시 유지 |

---

## 3. Error Handling

### QueryClient 전역 설정

```tsx
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // 401 인증 에러는 재시도하지 않음
        if (isApiError(error) && error.statusCode === 401) {
          return false;
        }
        // 나머지는 최대 2회 재시도
        return failureCount < 2;
      },
      throwOnError: true,  // ErrorBoundary로 에러 전파
    },
    mutations: {
      retry: (failureCount, error) => {
        if (isApiError(error) && error.statusCode === 401) {
          return false;
        }
        return failureCount < 2;
      },
      onError: async (error) => {
        // 401은 Sentry 제외 (민감 정보)
        if (isApiError(error) && error.statusCode === 401) {
          return;
        }
        const message = getApiErrorMessage(error);
        Sentry.captureException(error, { extra: { message } });
      },
    },
  },
});
```

**재시도 전략:**
- 401 (인증 실패): 재시도 없음
- 나머지 에러: 최대 2회 재시도
- Sentry: 401 제외하고 모두 전송

---

### 쿼리별 에러 핸들링

```tsx
// 전역 설정 무시하고 쿼리별 처리
const { data } = useQuery({
  ...taskQueries.detail(id),
  retry: false,  // 재시도 비활성화
  throwOnError: (error) => {
    // 특정 에러만 ErrorBoundary로 전파
    return isApiError(error) && error.statusCode >= 500;
  },
});
```

---

## 4. Mutation 패턴

### UseMutationOptions 타입 패턴

```tsx
// mutations/contract.mutation.ts
import { UseMutationOptions } from '@tanstack/react-query';

type CreateContractPayload = { title: string; amount: number };
type Contract = { id: string; title: string };

// mutationFn 제외하고 나머지 옵션 허용
type Options = Omit<
  UseMutationOptions<Contract, Error, CreateContractPayload>,
  'mutationFn'
>;

export function useCreateContractMutation(options?: Options) {
  return useMutation({
    mutationFn: createContractAPI,
    ...options,  // 호출하는 곳에서 onSuccess, onError 등 추가 가능
  });
}
```

```tsx
// 사용
const { mutate } = useCreateContractMutation({
  onSuccess: (data) => {
    toast.success(`계약서 ${data.id} 생성 완료`);
    queryClient.invalidateQueries({ queryKey: contractQueries.lists() });
  },
  onError: (error) => {
    toast.error('계약서 생성 실패');
  },
});
```

**장점:**
- 컴포넌트에서 onSuccess/onError 커스터마이징 가능
- 타입 안전성 유지

---

### 낙관적 업데이트

```tsx
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskInput }) =>
      updateTask(id, data),

    onMutate: async ({ id, data }) => {
      // 1. 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: taskQueries.detail(id) });

      // 2. 이전 데이터 백업
      const previousTask = queryClient.getQueryData(taskQueries.detail(id).queryKey);

      // 3. 낙관적 업데이트
      queryClient.setQueryData(taskQueries.detail(id).queryKey, (old: Task) => ({
        ...old,
        ...data,
      }));

      return { previousTask };
    },

    onError: (err, variables, context) => {
      // 4. 에러 시 롤백
      if (context?.previousTask) {
        queryClient.setQueryData(
          taskQueries.detail(variables.id).queryKey,
          context.previousTask
        );
      }
    },

    onSettled: (_, __, variables) => {
      // 5. 성공/실패 상관없이 리패치
      queryClient.invalidateQueries({ queryKey: taskQueries.detail(variables.id) });
    },
  });
}
```

---

## 5. 페이지네이션

### Offset 기반

```tsx
function TaskListPage() {
  const [page, setPage] = useState(1);

  const { data } = useQuery(
    taskQueries.list({ page, perPage: 20 })
  );

  return (
    <>
      <TaskList tasks={data?.items} />
      <Pagination
        current={page}
        total={data?.total}
        onChange={setPage}
      />
    </>
  );
}
```

---

### Cursor 기반 (무한 스크롤)

```tsx
export const taskQueries = {
  infinite: (filters: TaskFilters) =>
    infiniteQueryOptions({
      queryKey: [...taskQueries.lists(), 'infinite', filters],
      queryFn: ({ pageParam }) => getTaskList({ ...filters, cursor: pageParam }),
      initialPageParam: null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
};

function TaskInfiniteList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(taskQueries.infinite({}));

  return (
    <>
      {data?.pages.map((page) =>
        page.items.map((task) => <TaskItem key={task.id} task={task} />)
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? '로딩 중...' : '더보기'}
        </button>
      )}
    </>
  );
}
```

---

## 6. 실전 패턴

### 의존적 쿼리

```tsx
function TaskDetailPage({ taskId }: { taskId: string }) {
  const { data: task } = useQuery(taskQueries.detail(taskId));

  // task가 있을 때만 실행
  const { data: assignee } = useQuery({
    ...userQueries.detail(task?.assigneeId),
    enabled: !!task?.assigneeId,
  });

  return (
    <div>
      <h1>{task?.title}</h1>
      <p>담당자: {assignee?.name}</p>
    </div>
  );
}
```

---

### Prefetch로 UX 개선

```tsx
function TaskList() {
  const queryClient = useQueryClient();
  const { data: tasks } = useQuery(taskQueries.list({}));

  const handleMouseEnter = (taskId: string) => {
    // 마우스 호버 시 미리 가져오기
    queryClient.prefetchQuery(taskQueries.detail(taskId));
  };

  return (
    <>
      {tasks?.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onMouseEnter={() => handleMouseEnter(task.id)}
        />
      ))}
    </>
  );
}
```

---

### normalizeFilters 패턴

Query Key에 필터를 포함할 때, 필요한 필터만 추출해서 캐시 미스를 방지합니다.

```tsx
// utils/filter.ts
export function normalizeFilters<T extends Record<string, any>>(
  filters: T,
  keys: (keyof T)[]
): Partial<T> {
  return keys.reduce((acc, key) => {
    if (filters[key] !== undefined) {
      acc[key] = filters[key];
    }
    return acc;
  }, {} as Partial<T>);
}
```

```tsx
// queries/task.query.ts
export const taskQueries = {
  list: (filters: TaskFilters) =>
    queryOptions({
      // search는 Query Key에서 제외 (캐싱 범위 최소화)
      queryKey: ['tasks', 'list', normalizeFilters(filters, ['status', 'assignee'])],
      queryFn: () => getTaskList(filters),
    }),
};

// filters가 { status: 'TODO', assignee: '1', search: 'test' }일 때
// → queryKey: ['tasks', 'list', { status: 'TODO', assignee: '1' }]
```

**효과:**
- 불필요한 필터로 인한 캐시 미스 방지
- Query Key 일관성 유지

---

## 7. 폴더 구조

```tsx
src/
├── queries/              # Query 정의
│   ├── task.query.ts
│   └── user.query.ts
├── mutations/            # Mutation 정의
│   ├── task.mutation.ts
│   └── user.mutation.ts
└── remotes/              # API 함수
    ├── task.ts
    └── user.ts
```

---

## 정리

### 핵심 패턴

- **queryOptions**: UseQueryOptions보다 타입 추론 우수
- **Query Factory**: 일관된 Query Key 관리
- **Hydration/Dehydration**: SSR 중복 요청 방지
- **전역 Error Handling**: 재시도 전략 및 Sentry 연동
- **Mutation 타입 패턴**: UseMutationOptions로 유연한 옵션 제공
- **낙관적 업데이트**: 즉각적인 UX 제공

### 적용 효과

- 서버 상태 관리 단순화
- 타입 안전성 향상
- SSR 성능 최적화
- 일관된 에러 처리
