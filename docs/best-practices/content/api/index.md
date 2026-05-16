---
title: API 함수 작성 패턴
description: 실무에서 사용하는 API 계층 구성 — models / remotes / queries / mutations
outline: deep
---

# API 함수 작성 패턴

## Overview

API 계층을 어떻게 구성하고 사용하고 있는지 공유하는 문서입니다. 핵심 원칙과 전체 흐름을 다루며, 세부 케이스는 부록을 참고합니다.

**원칙**

- API 호출은 **순수 네트워크 호출만** — 비즈니스 로직/UI 피드백 금지
- 함수 시그니처는 **객체 파라미터(`params`)로 통일** — 파라미터 추가에도 호출처 변경 없음
- queryKey는 **팩토리 객체로 중앙 관리** — invalidate 시 키 불일치 방지
- 데이터 변환(폼 → DTO)은 **컴포넌트에서**, mutationFn은 remote 직접 전달

## 폴더 구조

```
src/
├── models/        # DTO 타입 정의 (서버 응답 모양)
├── remotes/       # API 함수 (httpClient 호출)
├── queries/       # queryOptions 팩토리 (조회)
├── mutations/     # mutationOptions 팩토리 (변경)
└── types/         # 클라이언트 타입 + Zod 스키마
```

**개발 순서**

```
1. models/    → DTO 타입 정의 (Request/Response)
2. remotes/   → API 함수 정의
3. queries/   → queryOptions (조회)
   mutations/ → mutationOptions (변경)
4. types/     → 클라이언트 타입 + Zod 스키마 (필요 시)
```

## 1. 네이밍 컨벤션

### 함수명 — HTTP 메서드별 Prefix

| Prefix   | HTTP Method | 예시                  |
| -------- | ----------- | --------------------- |
| `fetch`  | GET         | `fetchMerchantDetail` |
| `post`   | POST        | `postMerchant`        |
| `update` | PUT/PATCH   | `updateMerchant`      |
| `delete` | DELETE      | `deleteMerchant`      |

함수명만 봐도 HTTP 메서드 파악 가능. IDE에서 `fetch` 입력으로 모든 조회 API 자동완성.

### 타입명

| 용도        | 패턴            | 예시                                 |
| ----------- | --------------- | ------------------------------------ |
| 조회 요청   | `Fetch*Params`  | `FetchMerchantDetailParams`          |
| POST        | `Post*Params`   | `PostMerchantParams`                 |
| PUT/PATCH   | `Update*Params` | `UpdateMerchantParams`               |
| DELETE      | `Delete*Params` | `DeleteMerchantParams`               |
| 응답        | `*Response`     | `MerchantListResponse`               |
| 엔티티      | 명사            | `MerchantDetail`, `MerchantListItem` |

## 2. Remote 함수

```typescript
// remotes/merchant.ts

// GET — searchParams로 쿼리 전달
export const fetchMerchantList = (params: FetchMerchantListParams) => {
  const { filters, cursor } = params;
  const searchParams = new SearchParamsBuilder()
    .append('search', filters.search ?? '')
    .appendArray('van', filters.van)
    .append('cursor', cursor?.toString() ?? '')
    .build();

  return httpClient.get<MerchantListResponse>('merchants', { searchParams });
};

// POST — json body
export const postMerchant = (params: PostMerchantParams) =>
  httpClient.post('merchants', { json: params });

// PATCH — path param 분리 + json body
export const updateMerchant = (params: UpdateMerchantParams) => {
  const { merchantId, ...payload } = params;
  return httpClient.patch(`merchants/${merchantId}`, { json: payload });
};

// DELETE — path param만
export const deleteMerchant = (params: DeleteMerchantParams) =>
  httpClient.delete(`merchants/${params.merchantId}`);
```

**원칙**

- 제네릭으로 응답 타입 지정 (`httpClient.get<T>()`) — 캐스팅 금지
- 파라미터는 객체로 받기 — 개별 인자 금지
- 제네릭에 인라인 타입 금지 — DTO에서 정의

```typescript
// ❌ 캐스팅 — 타입 안전성 없음
const data = await httpClient.get('employees');
return data as unknown as FetchEmployeesResponse;

// ❌ 개별 인자 — 파라미터 추가 시 시그니처 전부 변경
export const fetchMerchantDetail = (merchantId: string) => { ... };

// ❌ 제네릭에 인라인 타입
httpClient.get<{ items: Merchant[] }>(...);
```

## 3. DTO 파생

```typescript
// ✅ 스키마 겹침 → Pick/Omit/NonNullable로 파생
type MerchantListItem = Pick<MerchantDetail, 'id' | 'name' | 'van'>;
type VanSetting = NonNullable<MerchantDetail['vanSettings']>[number];

// ✅ 스키마 다름 → 독립 정의
interface MerchantListItem { ... }   // List API 전용 필드
interface MerchantDetail { ... }     // Detail API 전용 필드
```

List/Detail이 필드를 공유하면 `Pick`/`Omit`/`NonNullable`로 파생. 스키마가 다르면 독립 정의. 판단 기준: 실제 서버 응답 구조가 같은가.

## 4. Query (조회)

### queryKey 팩토리 + queryOptions 조합

```typescript
// queries/merchant.query.ts

const merchantKeys = {
  all: ['merchant'] as const,
  list: (filters: MerchantFilters) =>
    [...merchantKeys.all, 'list', normalizeFilters(filters, ['van', 'status'])] as const,
  infinite: (filters: MerchantFilters) =>
    [...merchantKeys.all, 'infinite', normalizeFilters(filters, ['van', 'status'])] as const,
  detail: (merchantId: string) => [...merchantKeys.all, 'detail', merchantId] as const,
};

export const merchantQuery = {
  // 일반 조회 — remote Params 객체를 그대로 받음
  list: (params: FetchMerchantListParams) => {
    const { filters } = params;
    return queryOptions({
      queryKey: merchantKeys.list(filters),
      queryFn: () => fetchMerchantList({ filters }),
    });
  },

  // 무한 스크롤
  infinite: (params: FetchMerchantListParams) => {
    const { filters } = params;
    return infiniteQueryOptions({
      queryKey: merchantKeys.infinite(filters),
      queryFn: ({ pageParam }) => fetchMerchantList({ filters, cursor: pageParam }),
      initialPageParam: undefined as number | undefined,
      getNextPageParam: lastPage => lastPage?.cursor,
    });
  },

  // 상세
  detail: (params: FetchMerchantDetailParams) =>
    queryOptions({
      queryKey: merchantKeys.detail(params.merchantId),
      queryFn: () => fetchMerchantDetail(params),
    }),
};
```

**원칙**

- queryKey 팩토리(`*Keys`) 객체로 중앙 관리, `as const`로 타입 보존
- 계층 구조: `['domain', 'action', params]`
- `*Keys.all`로 도메인 전체 invalidate
- list/infinite는 queryKey 분리 → 독립 invalidate
- queryOptions 시그니처는 remote(`Fetch*Params`)와 동일한 **객체 wrapping**
- `normalizeFilters`는 `*Keys` 팩토리 내부에 — 어디서 호출하든 정규화 보장

```typescript
// ❌ queryKey 문자열 하드코딩
useQuery({ queryKey: 'merchantList', ... });

// ❌ queryKey 인라인 — invalidate 시 키 불일치 위험
queryOptions({ queryKey: ['merchant', 'list', filters] as const, ... });

// ❌ filters만 단일 인자로 받기 — remote와 시그니처 불일치
infinite: (filters: MerchantFilters) => infiniteQueryOptions({ ... });
```

### normalizeFilters — 배열 필터 정렬

배열 타입 필터는 사용자가 고른 순서에 따라 값이 달라진다. 같은 조합인데도 다른 캐시 키가 되어 캐시 히트율이 떨어지는 문제를 막기 위해 정렬한다.

```typescript
// ✅ 정렬 → 순서 무관하게 같은 캐시 키
normalizeFilters(filters, ['taskStatus']);
// { search: 'hello', taskStatus: ['cancelled', 'pending'] }  ← 항상 정렬됨

// ❌ 정규화 없음 → ['pending', 'cancelled']과 ['cancelled', 'pending']이 다른 캐시
queryKey: ['tasks', filters];
```

호출은 **`*Keys` 팩토리 내부**에 둔다. 어디서 Keys를 부르든(invalidateQueries 등) 정규화가 보장된다.

```typescript
const merchantKeys = {
  list: (filters: MerchantFilters) =>
    // ✅ 팩토리 안에서 호출 — 호출처마다 신경 쓸 필요 없음
    [...merchantKeys.all, 'list', normalizeFilters(filters, ['van', 'status'])] as const,
};
```

### staleTime / gcTime

```typescript
// ✅ 유틸 함수로 가독성 확보
queryOptions({
  queryKey: merchantKeys.statusList(),
  queryFn: fetchMerchantStatusList,
  staleTime: days(1),
});

// ❌ 매직 넘버
staleTime: 24 * 60 * 60 * 1000,
```

| 옵션      | 역할                       | 기본값        |
| --------- | -------------------------- | ------------- |
| staleTime | 이 시간 내엔 refetch 안 함 | 0 (항상 stale) |
| gcTime    | unmount 후 캐시 유지 시간  | 5분           |

셀렉트 옵션, 코드 목록 등 정적 데이터에 staleTime 설정. 동적 데이터는 기본값(0) 유지.

## 5. Mutation (변경)

```typescript
// mutations/merchant.mutation.ts

export const merchantMutation = {
  create: () =>
    mutationOptions({
      mutationFn: postMerchant,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: merchantKeys.all });
      },
    }),

  update: () =>
    mutationOptions({
      mutationFn: updateMerchant,
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: merchantKeys.detail(variables.merchantId) });
      },
    }),
};
```

**컴포넌트에서 사용**

```typescript
const { mutateAsync: createMerchant } = useMutation(merchantMutation.create());

const handleSubmit = async (formData: CreateMerchantFormData) => {
  try {
    await createMerchant(formData);
    showSuccessToast('등록 완료');
  } catch (error) {
    showApiErrorToast(error);
  }
};
```

**원칙**

- `mutationFn`은 **remote 직접 전달** — 데이터 변환(폼 → DTO)은 컴포넌트에서
- `invalidateQueries`는 **onSuccess에서**, UI 피드백(toast)은 컴포넌트에서
- `mutateAsync` + try-catch 선호 (mutate + 콜백 패턴 지양)

```typescript
// ❌ mutationFn 안에서 데이터 변환
mutationFn: async (data: EmployeeForm) => {
  const params = { name: data.name, email: data.googleAccount };
  return postEmployee(params);
},

// ❌ mutate 콜백 패턴 — 가독성 저하
mutate(data, { onSuccess: () => {}, onError: () => {} });
```

## 6. 컴포넌트에서 사용

### useSuspenseQuery 기본

```tsx
// ✅ 기본: useSuspenseQuery — 데이터 존재 보장
function Content() {
  const { data } = useSuspenseQuery(merchantQuery.detail({ merchantId }));
  return <div>{data.name}</div>; // data는 항상 존재
}

<ErrorBoundary fallback={<ErrorView />}>
  <Suspense fallback={<Loading />}>
    <Content />
  </Suspense>
</ErrorBoundary>
```

**useQuery가 필요한 경우**

| 케이스                            | 이유                                                  |
| --------------------------------- | ----------------------------------------------------- |
| `placeholderData: keepPreviousData` | 필터 전환 시 깜빡임 방지                              |
| 무한 스크롤                       | `isFetchingNextPage`로 부분 로딩 표시                 |
| 조건부 쿼리 (`enabled`)           | 값이 있을 때만 호출 (검색 autocomplete 등)            |

### `<SuspenseQuery>` vs `useSuspenseQuery`

```tsx
// ✅ <SuspenseQuery>: JSX inline 전달 — 컴포넌트 추출 없이 데이터 스코프 시각화
<SuspenseQuery {...merchantQuery.detail({ merchantId })}>
  {({ data: detail }) => (
    <>
      <TaskInfo subscription={detail.subscription} />
      <DocumentInfo document={detail.document} />
    </>
  )}
</SuspenseQuery>

// ✅ useSuspenseQuery: 이미 추출된 컴포넌트, 내부 로직이 data와 결합
export function DocumentAttachment({ ... }: Props) {
  const { data } = useSuspenseQuery(detailQuery);
  const viewState = getAttachmentViewState(data.isExpired, data.subscription.taskStatus);
}
```

| 상황                                       | 선택               |
| ------------------------------------------ | ------------------ |
| JSX inline 전달, 컴포넌트 추출 불필요      | `<SuspenseQuery>`  |
| 데이터 스코프를 JSX에서 드러내고 싶을 때   | `<SuspenseQuery>`  |
| 컴포넌트가 복잡해서 이미 추출된 경우       | `useSuspenseQuery` |
| 내부 로직이 data와 결합, inline이면 중첩 깊 | `useSuspenseQuery` |

> import: `import { SuspenseQuery } from '@suspensive/react-query';`

### Prefetch (리스트 → 상세)

```typescript
const handleRowClick = (merchantId: string) => {
  queryClient.prefetchQuery(merchantQuery.detail({ merchantId }));
  router.push(`/merchants/${merchantId}`);
};
```

리스트에서 행 클릭 시 상세 데이터를 미리 로드. 상세 페이지 진입 시 로딩 없는 전환.

## 7. .then() 체이닝

remote가 이미 Promise를 반환하므로 단순 unwrap에 `async/await`은 불필요한 Promise 래핑.

```typescript
// ✅ .then()으로 unwrap — 불필요한 Promise 래핑 없음
const fetchUser = (id: string) =>
  userRemote.fetchUser({ id }).then(res => res.data);

// ❌ async/await — 이미 Promise인데 다시 감쌈
const fetchUser = async (id: string) => {
  const res = await userRemote.fetchUser({ id });
  return res.data;
};
```

**응답에서 특정 필드만 꺼내야 할 때도 동일**

```typescript
// ✅ items만 꺼내서 반환 — 호출처가 res.items로 접근할 필요 없음
export const fetchMerchantList = (params: FetchMerchantListParams) => {
  const searchParams = buildSearchParams(params);
  return httpClient
    .get<MerchantListResponse>('merchants', { searchParams })
    .then(res => res.items);
};

// ✅ totalCount까지 함께 필요하면 그대로 반환
export const fetchMerchantList = (params: FetchMerchantListParams) =>
  httpClient.get<MerchantListResponse>('merchants', { searchParams });
```

응답 구조(`{ items, totalCount, cursor }`)를 그대로 노출할지, `.then()`으로 가공해 필요한 필드만 반환할지는 호출처가 무엇을 쓰는지에 따라 결정.

## 8. Zod 스키마 (선택)

```typescript
// types/merchant.schema.ts

export const createMerchantSchema = z.object({
  name: z.string().min(1, '필수'),
  businessNumber: z.string().length(10, '사업자번호 10자리'),
});

// ✅ 타입은 스키마에서 파생
export type CreateMerchantFormData = z.infer<typeof createMerchantSchema>;
```

`types/[domain].schema.ts`에 정의. 타입은 `z.infer<typeof schema>`로 파생 (별도 정의 금지 — 스키마와 불일치 위험).

**사용 권장 케이스**

- 외부 API 연동 (응답 형태 변경 가능성)
- 타입 안정성이 중요한 도메인 (금융, 결제)
- 데이터 무결성 검증 필요

## DO & DON'T

### ✅ DO

- remote 함수 파라미터는 항상 **객체로** 받기
- queryKey 팩토리(`*Keys`)로 중앙 관리, `as const`로 타입 보존
- mutationOptions의 `onSuccess`에서 `invalidateQueries` 처리
- `mutateAsync` + try-catch로 에러 처리
- 서버 타입(DTO)과 클라이언트 타입 분리
- 자주 안 바뀌는 데이터엔 `staleTime` 설정
- `normalizeFilters`로 캐시 효율 관리
- `useSuspenseQuery` 기본 사용

### ❌ DON'T

- remote 함수에서 개별 인자 받기
- `queryKey`를 문자열 하드코딩
- `queryKey` 인라인 정의 (팩토리 객체로 분리)
- 컴포넌트에서 직접 `queryClient.invalidateQueries` 호출
- `mutate` + `onSuccess`/`onError` 콜백 패턴
- 서버 응답 타입에 클라이언트 전용 필드 추가
- 정적 데이터에 `staleTime` 미설정

## 부록

- [API 함수 작성 패턴 (상세)](/api/api-function-pattern) — 함수명/매개변수/타입 정의 단계별 설명
