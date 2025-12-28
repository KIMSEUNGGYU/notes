# Utils - 범용 유틸리티 모음

프로젝트에서 자주 사용하는 헬퍼 함수들입니다.

## 파일 구조

```
utils/
├── format.ts          # 포맷팅 함수들
├── input.ts           # 입력값 처리
├── searchParams.ts    # URLSearchParams 빌더
├── filter.ts          # React Query 필터 정규화
├── parser.ts          # URL 파라미터 파서
└── toast.tsx          # Toast 헬퍼
```

---

## format.ts

### formatDate

날짜를 원하는 형식으로 포맷팅합니다.

```typescript
formatDate('2024-12-28T10:00:00', 'yyyy-MM-dd')
// → '2024-12-28'

formatDate('2024-12-28T10:00:00', 'yyyy년 MM월 dd일')
// → '2024년 12월 28일'
```

**의존성**: `@tossteam/t2-date`

### formatBusinessNumber

사업자등록번호를 `000-00-00000` 형식으로 포맷팅합니다.

```typescript
formatBusinessNumber('1234567890')
// → '123-45-67890'

formatBusinessNumber('123456')
// → '123-45-6'
```

**특징**:
- 숫자만 추출 (하이픈 자동 제거)
- 10자리 제한
- 입력 중에도 실시간 포맷팅 가능

---

## input.ts

### onlyNumbers

문자열에서 숫자만 추출합니다.

```typescript
onlyNumbers('abc123def456')
// → '123456'

onlyNumbers('010-1234-5678')
// → '01012345678'
```

**용도**: 전화번호, 사업자번호 등 입력 시 숫자만 필터링

---

## searchParams.ts

### SearchParamsBuilder

URLSearchParams를 빌더 패턴으로 편리하게 생성합니다.

```typescript
const params = new SearchParamsBuilder()
  .append('status', 'active')
  .appendArray('tags', ['react', 'typescript'])
  .appendDate('startDate', new Date('2024-01-01'))
  .appendPageOffset(2, 20)
  .build();

// → status=active&tags=react&tags=typescript&startDate=2024-01-01&offset=20&pageSize=20
```

**메서드**:
- `append(name, value)`: 단일 값 추가 (빈 문자열은 무시)
- `appendArray(name, values)`: 배열 추가 (빈 배열은 무시)
- `appendDate(name, date, format)`: 날짜 추가 (null/undefined는 무시)
- `appendPageOffset(page, pageSize)`: 페이지네이션용 offset 계산

**장점**:
- Falsy 값 자동 제거 (if 체크 불필요)
- 메서드 체이닝으로 가독성 향상
- 페이지네이션 offset 자동 계산

---

## filter.ts

### normalizeFilters

React Query queryKey 정규화를 위해 필터 객체의 배열을 정렬합니다.

```typescript
const filters = {
  status: 'active',
  tags: ['react', 'typescript', 'nextjs'],
};

// tags 배열 순서가 달라도 같은 queryKey 생성
normalizeFilters(filters, ['tags']);
// → { status: 'active', tags: ['nextjs', 'react', 'typescript'] }
```

**문제 해결**:
- TanStack Query는 배열 요소 순서를 구분함
- `['react', 'typescript']`와 `['typescript', 'react']`를 다른 키로 인식
- 같은 필터인데 불필요한 리페치 발생

**사용 시나리오**:

```typescript
function useTaskListQuery(filters: TaskFilters) {
  // 배열 필드들을 정규화하여 queryKey 생성
  const normalized = normalizeFilters(filters, ['tags', 'assignees']);

  return useQuery({
    queryKey: ['tasks', normalized],
    queryFn: () => fetchTasks(normalized),
  });
}
```

**의존성**: `@tossteam/is`

---

## parser.ts

### parseAsDate

nuqs와 함께 사용하는 Date 파라미터 파서입니다.

```typescript
// URL 파라미터 정의
const [startDate, setStartDate] = useQueryState(
  'startDate',
  parseAsDate.withDefault(new Date())
);

// URL: ?startDate=2024-12-28
// → startDate: Date 객체

// setStartDate(new Date('2024-01-01'))
// → URL: ?startDate=2024-01-01
```

**동작**:
- `parse`: URL 문자열 → Date 객체
- `serialize`: Date 객체 → URL 문자열 (`yyyy-MM-dd` 형식)

**장점**:
- nuqs의 타입 안전성과 함께 사용
- formatDate와 일관된 날짜 형식
- falsy 값 자동 처리

**의존성**:
- `nuqs`: URL 상태 관리
- `@tossteam/is`: 타입 체크
- `./format`: formatDate 재사용

---

## toast.tsx

### Toast 헬퍼 함수들

Toast 메시지를 간편하게 표시합니다.

```typescript
// API 에러 Toast
try {
  await fetchData();
} catch (error) {
  showApiErrorToast(error);
}

// 성공 Toast
showSuccessToast('저장되었습니다');

// 경고 Toast
showWarningToast('입력값을 확인해주세요');
```

**함수**:
- `showApiErrorToast(error)`: API 에러 메시지 표시
- `showSuccessToast(message)`: 성공 메시지 (체크 아이콘)
- `showWarningToast(message)`: 경고 메시지 (느낌표 아이콘)

**의존성**:
- `@tds/desktop`: Toast 컴포넌트
- `overlay-kit`: 오버레이 관리
- `remotes`: isApiError 타입 가드

---

## 의존성

```json
{
  "@tossteam/t2-date": "날짜 포맷팅",
  "@tossteam/is": "타입 체크",
  "@tds/desktop": "Toast UI",
  "overlay-kit": "오버레이 관리"
}
```

---

## 사용 팁

### SearchParamsBuilder를 React Query와 함께

```typescript
function useTaskListQuery(filters: TaskFilters) {
  const params = new SearchParamsBuilder()
    .append('status', filters.status)
    .appendArray('tags', filters.tags)
    .appendDate('startDate', filters.startDate)
    .appendPageOffset(filters.page, 20)
    .build();

  return useQuery({
    queryKey: ['tasks', params.toString()],
    queryFn: () => fetchTasks(params),
  });
}
```

### Toast와 Mutation 조합

```typescript
const mutation = useMutation({
  mutationFn: createTask,
  onSuccess: () => {
    showSuccessToast('작업이 생성되었습니다');
  },
  onError: (error) => {
    showApiErrorToast(error);
  },
});
```
