---
title: React Query 패턴
description: 실무 중심 React Query 사용 패턴
outline: deep
todo:
 - 초안은 완성, 하지만 좀 더 정리하기
---

# React Query 패턴

## 개요

React Query는 서버 상태 관리를 단순화하고 캐싱, 동기화, 에러 처리를 자동으로 처리합니다.

## 1. queryOptions

### queryOptions를 사용하는 이유

**문제: 쿼리 정의와 사용이 섞이면 관리 어려움**

```tsx
// ❌ 컴포넌트마다 쿼리 정의 반복
function TaskDetail({ id }) {
  const { data } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => getTaskDetail(id),
  });
}

function TaskEdit({ id }) {
  const { data } = useQuery({
    queryKey: ['tasks', id],  // 중복!
    queryFn: () => getTaskDetail(id),  // 중복!
  });
}
```

**해결: queryOptions로 query 를 정의하고 사용처를 분리**

```tsx
// queries/task.query.ts - 쿼리 정의만 관리
export const taskQueryOptions = {
  detail: (id: string) =>
    queryOptions({
      queryKey: ['tasks', id],
      queryFn: () => getTaskDetail(id),
    }),
};

// 여러 곳에서 재사용
function TaskDetail({ id }) {
  const { data } = useQuery(taskQueryOptions.detail(id));
}

function TaskEdit({ id }) {
  const { data } = useSuspenseQuery(taskQueryOptions.detail(id));
}
```

**장점:**
- 정의와 사용 분리 → 관리 용이
- 여러 곳에서 재사용 (useQuery, useSuspenseQuery, prefetch 등)
- 타입 추론 자동 (select 사용 시)

### 기본 패턴

```tsx
// queries/task.query.ts
import { queryOptions } from '@tanstack/react-query';

export const taskQueryOptions = {
  // 단일 조회
  detail: (id: string) =>
    queryOptions({
      queryKey: ['tasks', id],
      queryFn: () => getTaskDetail(id),
    }),

  // 리스트 조회
  list: () =>
    queryOptions({
      queryKey: ['tasks', 'list'],
      queryFn: getTaskList,
    }),
};

// 사용
const { data } = useQuery(taskQueryOptions.detail('123'));
const { data: tasks } = useQuery(taskQueryOptions.list());
```

### staleTime 설정

**문제: staleTime을 모르면 불필요한 refetch 발생**

```tsx
// ❌ staleTime 없음 (기본값 0)
// → 포커스 이동할 때마다 refetch (불필요)
queryOptions({
  queryKey: ['tasks'],
  queryFn: getTasks,
  // staleTime: 0 (기본값)
});

// ✅ staleTime 설정
// → 지정된 시간 내엔 fresh 상태 유지, refetch 안 함
queryOptions({
  queryKey: ['task-status-list'],
  queryFn: fetchTaskStatusList,
  staleTime: days(1),  // 1일간 fresh
});
```

**staleTime vs gcTime:**

```tsx
queryOptions({
  queryKey: ['todos'],
  queryFn: getTodos,
  staleTime: 5 * 60 * 1000,   // 5분: 이 시간 내엔 fresh, refetch 안 함
  gcTime: 10 * 60 * 1000,     // 10분: 메모리에서 캐시 유지 시간
});
```

| 옵션 | 역할 | 예시 |
|------|------|------|
| staleTime | 데이터 신선도 기준 | `0`이면 항상 stale → refetch |
| gcTime | 메모리 캐시 유지 | unmount 후에도 캐시 유지 |

### 활용 패턴

#### 무한 스크롤

```tsx
// queries/document-task.query.ts
import { infiniteQueryOptions } from '@tanstack/react-query';

export const documentTaskQueryOptions = {
  infinite: (params: DocumentTaskListParams) =>
    infiniteQueryOptions({
      queryKey: ['document-task-infinite', params.filters],
      queryFn: ({ pageParam }) => fetchDocumentTasks({ filters: params.filters, cursor: pageParam }),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage?.cursor,
    }),
};

// 사용
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(
  documentTaskQueryOptions.infinite(params)
);
```

#### 필터 관리 (normalizeFilters)

**문제 1: 불필요한 필터로 인한 캐시 미스**

```tsx
// ❌ search는 Query Key에 불필요 (매번 다른 캐시 생성)
const filters = { status: 'TODO', assignee: '1', search: 'react' };
queryKey: ['tasks', filters]  // search 때문에 캐시 미스
```

**문제 2: 배열 순서 차이로 인한 중복 캐시**

```tsx
// ❌ 같은 데이터인데 다른 캐시
const filters1 = { status: ['TODO', 'DONE'] };
const filters2 = { status: ['DONE', 'TODO'] };

queryKey: ['tasks', filters1]  // ['tasks', { status: ['TODO', 'DONE'] }]
queryKey: ['tasks', filters2]  // ['tasks', { status: ['DONE', 'TODO'] }]
// → 같은 필터인데 순서만 다름!
```

**해결: normalizeFilters**

```tsx
// utils/filter.ts
export function normalizeFilters<T extends Record<string, any>>(
  filters: T,
  keys: (keyof T)[]
): Partial<T> {
  return keys.reduce((acc, key) => {
    if (filters[key] !== undefined) {
      // 배열이면 정렬해서 일관성 유지
      const value = Array.isArray(filters[key])
        ? [...filters[key]].sort()
        : filters[key];
      acc[key] = value;
    }
    return acc;
  }, {} as Partial<T>);
}
```

```tsx
// queries/task.query.ts
export const taskQueryOptions = {
  list: (filters: TaskFilters) =>
    queryOptions({
      // search 제외, 배열 자동 정렬
      queryKey: ['tasks', 'list', normalizeFilters(filters, ['status', 'assignee'])],
      queryFn: () => getTaskList(filters),
    }),
};

// 사용 예시
const filters1 = { status: ['TODO', 'DONE'], assignee: '1', search: 'react' };
const filters2 = { status: ['DONE', 'TODO'], assignee: '1', search: 'query' };

// 두 쿼리 모두 같은 캐시 사용!
// → queryKey: ['tasks', 'list', { status: ['DONE', 'TODO'], assignee: '1' }]
```

**효과:**
- 불필요한 필터 제외로 캐시 효율 향상
- 배열 정렬로 중복 캐시 방지

#### Query 무효화

**Mutation 후 캐시 동기화**

```tsx
// Mutation 성공 → 관련 쿼리 무효화로 최신 데이터 반영
const { mutate } = useMutation({
  mutationFn: createTask,
  onSuccess: () => {
    // 전체 무효화
    queryClient.invalidateQueries({ queryKey: ['tasks'] });

    // 또는 특정 필터만
    queryClient.invalidateQueries({
      queryKey: ['tasks', { status: 'TODO' }],
    });
  },
});
```

## 2. Error Handling

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

### 쿼리별 에러 핸들링

```tsx
// 전역 설정 무시하고 쿼리별 처리
const { data } = useQuery({
  ...taskQueryOptions.detail(id),
  retry: false,  // 재시도 비활성화
  throwOnError: (error) => {
    // 특정 에러만 ErrorBoundary로 전파
    return isApiError(error) && error.statusCode >= 500;
  },
});
```

## 3. Mutation 패턴

### mutationOptions 패턴

> 요즘에는 mutationOptions 패턴을 활용 

```tsx
// mutations/document-task.mutation.ts
import { mutationOptions } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

export const documentTaskMutationOptions = {
  updateAssignee: () => {
    return mutationOptions({
      mutationFn: (params: UpdateAssigneeParams) => updateAssignee(params),
      onSuccess: () => {
        // 관련된 무한 스크롤 쿼리 무효화
        queryClient.invalidateQueries({
          queryKey: ['document-task-infinite'],
        });
      },
    });
  },
};

// 사용
const { mutate } = useMutation(documentTaskMutationOptions.updateAssignee());
```

### UseMutationOptions 타입 패턴

> 옜날에 사용했던 패턴? 

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
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
  },
  onError: (error) => {
    toast.error('계약서 생성 실패');
  },
});
```

**장점:**
- 컴포넌트에서 onSuccess/onError 커스터마이징 가능
- 타입 안전성 유지

## 4. Suspense 패턴

### 기본 사용법

ErrorBoundary와 Suspense를 조합하여 로딩/에러 처리를 컴포넌트 외부로 위임합니다.

```tsx
// app/tasks/[id]/page.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Suspense } from 'react';

export default function TaskPage({ params }: { params: { id: string } }) {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<TaskDetailSkeleton />}>
        <TaskDetail taskId={params.id} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

```tsx
// components/TaskDetail.tsx
import { useSuspenseQuery } from '@tanstack/react-query';

export function TaskDetail({ taskId }: { taskId: string }) {
  // data는 항상 존재 (undefined 불가)
  const { data } = useSuspenseQuery(taskQueryOptions.detail(taskId));

  return (
    <div>
      <h1>{data.title}</h1>
      <p>{data.description}</p>
    </div>
  );
}
```

**핵심:**
- API 요청, 로딩, 에러를 React Query + Suspense에 위임
- 컴포넌트는 데이터 존재를 보장받고 UI에만 집중

### Q&A

**Q. useSuspenseQuery vs useQuery 언제 사용?**

**핵심: 명령형 vs 선언형, 책임 분리**

```tsx
// ❌ useQuery - 명령형
// 컴포넌트가 로딩/에러/데이터 모든 상태 처리 책임
function TaskDetail({ id }) {
  const { data, isLoading, error } = useQuery(taskQueryOptions.detail(id));

  if (isLoading) return <Spinner />;      // 로딩 책임
  if (error) return <ErrorView />;        // 에러 책임
  if (!data) return null;                 // 없음 책임

  return <div>{data.title}</div>;         // 데이터 책임
}

// ✅ useSuspenseQuery - 선언형
// Suspense/ErrorBoundary가 로딩/에러 처리
// 컴포넌트는 데이터 있는 경우만 집중
function TaskDetail({ id }) {
  const { data } = useSuspenseQuery(taskQueryOptions.detail(id));

  // 데이터 있음 보장 → UI만 책임
  return <div>{data.title}</div>;
}

<ErrorBoundary fallback={<ErrorView />}>  {/* 에러 책임 */}
  <Suspense fallback={<Spinner />}>       {/* 로딩 책임 */}
    <TaskDetail id="123" />               {/* 데이터 책임 */}
  </Suspense>
</ErrorBoundary>
```

**장점:**
- 관심사 분리 (로딩/에러 vs 데이터 렌더링)
- 컴포넌트는 데이터 있는 케이스만 처리
- 선언적 코드 관리

**Q. useQuery가 필요한 경우는?**

**A. 컴포넌트 내부에서 로딩/에러를 직접 제어해야 할 때**

**사례 1: 백오피스 테이블 - 페이지 전환 시 깜빡임 방지**

```tsx
function TaskTable() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    ...taskQueryOptions.list({ page }),
    placeholderData: keepPreviousData,  // 이전 데이터 유지
  });

  return (
    <>
      <table>
        {data?.items.map((task) => (
          <TaskRow key={task.id} task={task} isStale={isLoading} />
        ))}
      </table>
      <Pagination page={page} onChange={setPage} />
    </>
  );
}
```

**이유:**
- `placeholderData: keepPreviousData` 사용으로 페이지 전환 시 이전 데이터 표시
- `isLoading`으로 stale 상태 표시 (예: 반투명 처리)
- Suspense 사용 시 매번 fallback으로 전환되어 UX 저하

**사례 2: 무한 스크롤 - 부분 로딩 표시**

```tsx
function TaskInfiniteList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(taskQueryOptions.infinite({}));

  return (
    <>
      {data?.pages.map((page) =>
        page.items.map((task) => <TaskItem key={task.id} task={task} />)
      )}
      {isFetchingNextPage && <Spinner />}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>더보기</button>
      )}
    </>
  );
}
```

**이유:**
- `isFetchingNextPage`로 다음 페이지 로딩만 표시
- Suspense 사용 시 전체 리스트가 fallback으로 교체됨

**Q. SuspenseQuery vs useSuspenseQuery 차이?**

**A. 같은 파일 내 인라인 vs 별도 컴포넌트 추출**

```tsx
// SuspenseQuery (인라인)
function TaskPage({ id }: { id: string }) {
  return (
    <ErrorBoundary fallback={<Error />}>
      <Suspense fallback={<Skeleton />}>
        <SuspenseQuery {...taskQueryOptions.detail(id)}>
          {(data) => (
            <div>
              <h1>{data.title}</h1>
              <p>{data.description}</p>
            </div>
          )}
        </SuspenseQuery>
      </Suspense>
    </ErrorBoundary>
  );
}

// useSuspenseQuery (컴포넌트 분리)
function TaskPage({ id }: { id: string }) {
  return (
    <ErrorBoundary fallback={<Error />}>
      <Suspense fallback={<Skeleton />}>
        <TaskDetail taskId={id} />
      </Suspense>
    </ErrorBoundary>
  );
}

function TaskDetail({ taskId }: { taskId: string }) {
  const { data } = useSuspenseQuery(taskQueryOptions.detail(taskId));
  return (
    <div>
      <h1>{data.title}</h1>
      <p>{data.description}</p>
    </div>
  );
}
```

**일반적으로 useSuspenseQuery 선호:**
- 컴포넌트 분리로 재사용성 향상
- 테스트 용이


## 5. SSR (Hydration/Dehydration)

<details>
<summary>SSR에서 서버/클라이언트 중복 요청 방지하기</summary>

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

</details>

## 정리

### 핵심 패턴

- **queryOptions**: UseQueryOptions보다 타입 추론 우수
- **단순 객체 패턴**: Query Factory보다 실용적이고 간결
- **전역 Error Handling**: 재시도 전략 및 Sentry 연동
- **Mutation 타입 패턴**: UseMutationOptions로 유연한 옵션 제공
- **Suspense 패턴**: 기본 useSuspenseQuery, 필요시 useQuery (placeholderData, 무한 스크롤)
- **SSR 최적화**: Hydration/Dehydration으로 중복 요청 방지

### 적용 효과

- 서버 상태 관리 단순화
- 타입 안전성 향상
- 일관된 에러 처리
- SSR 성능 최적화
