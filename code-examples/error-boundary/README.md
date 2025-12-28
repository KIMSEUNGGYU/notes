# Error Boundary 패턴 - 전체 코드

React에서 에러와 로딩을 선언적으로 처리하는 컴포넌트들입니다.

## 파일 구조

```
error-boundary/
├── AsyncBoundary.tsx      # Suspense + ErrorBoundary + QueryErrorResetBoundary 통합
└── ErrorFallback.tsx      # 에러 폴백 UI 예시
```

## AsyncBoundary

Suspense, ErrorBoundary, QueryErrorResetBoundary를 하나로 결합한 컴포넌트.

**핵심 기능:**
- `Suspense`: 로딩 상태 처리 (pendingFallback)
- `ErrorBoundary`: 에러 상태 처리 (rejectedFallback)
- `QueryErrorResetBoundary`: React Query 에러 리셋

**왜 필요한가:**
- Suspense와 ErrorBoundary를 매번 중첩해서 쓰는 보일러플레이트 제거
- React Query 사용 시 에러 리셋을 자동으로 연결
- 로딩/에러 처리를 한 곳에서 관리

**사용 예시:**

```tsx
<AsyncBoundary
  pendingFallback={<Loading />}
  rejectedFallback={({ error, reset }) => (
    <ErrorFallback error={error} reset={reset} />
  )}
>
  <SuspenseQuery {...userQueryOptions()}>
    {({ data }) => <UserProfile user={data} />}
  </SuspenseQuery>
</AsyncBoundary>
```

**동작 흐름:**
1. 로딩 중 → `pendingFallback` 표시
2. 에러 발생 → `rejectedFallback` 표시
3. 재시도 버튼 클릭 → `onReset` 호출 → React Query 쿼리도 함께 리셋

## ErrorFallback

에러 발생 시 표시할 폴백 UI 예시.

**기능:**
- 에러 메시지 표시
- 재시도 버튼 (reset 호출)
- 홈으로 이동 버튼

**커스터마이징:**
- 프로젝트별 디자인 시스템에 맞게 수정
- 에러 종류별 다른 UI 표시 가능
- Sentry 연동, 로깅 추가 가능

## 관련 문서

전체 설명은 [에러 핸들링 문서](../../docs/best-practices/error-handling/index.md)를 참고하세요.

## 의존성

```json
{
  "@suspensive/react": "^2.x",
  "@tanstack/react-query": "^5.x",
  "react-router": "^6.x"
}
```
