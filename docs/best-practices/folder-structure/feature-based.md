---
title: Feature 기반 폴더 구조
description: 지역성과 Page First 원칙 기반 실무 가이드
outline: deep
---

# Feature 기반 폴더 구조

## 개요

프로젝트가 커지면서 "이 파일을 어디에 둬야 하지?"라는 고민이 늘어납니다. Feature 기반 폴더 구조는 **지역성(Locality)** 과 **Page First** 원칙을 바탕으로 변경에 강한 구조를 만듭니다.

---

## 1. 핵심 개념

### 문제 인식

역할 중심 구조는 작은 프로젝트에는 편리하지만, 프로젝트가 커질수록 문제가 발생합니다.

```tsx
// 역할 중심 구조
src/
├── components/
│   ├── auth/          # 100개 파일
│   ├── dashboard/     # 150개 파일
│   └── settings/      # 80개 파일
├── hooks/
├── utils/
└── types/
```

**문제:**
- 파일 찾기 어려움
- 관련 파일이 여러 폴더에 흩어짐
- 삭제 시 연관 파일 찾는 비용 증가
- 변경 영향 범위 파악 어려움

---

### 지역성 원칙 (Locality)

**사용하는 곳과 가장 가까운 위치에 파일을 배치합니다.**

```tsx
// ❌ 모든 컴포넌트를 최상위에
src/
├── components/
│   ├── DashboardStats.tsx      // dashboard에서만 사용
│   ├── UserProfile.tsx         // user 페이지에서만 사용
│   └── Button.tsx              // 전역에서 사용
└── pages/
    ├── dashboard/
    └── user/
```

```tsx
// ✅ 사용처 가까이
src/
├── components/
│   └── Button.tsx              // 전역 공통만
└── pages/
    ├── dashboard/
    │   └── components/
    │       └── DashboardStats.tsx    // dashboard 전용
    └── user/
        └── components/
            └── UserProfile.tsx       // user 전용
```

**효과:**
- 폴더 위치가 사용 범위를 보장
- 변경 영향 범위가 명확
- 페이지 삭제 시 폴더만 제거하면 됨

---

### Page First 원칙

**처음엔 로컬에, 재사용이 필요하면 상위로 이동합니다.**

```tsx
// 1단계: 페이지 로컬에 생성
src/pages/product-detail/
├── components/
│   └── PriceSection.tsx    // 여기서 시작
└── ProductDetailPage.tsx

// 2단계: 실제 재사용 필요 시 상위로
src/
├── components/
│   └── PriceSection.tsx    // 두 번째 사용처 생기면 이동
└── pages/
    ├── product-detail/
    └── checkout/           // 여기서도 사용
```

**상위로 올릴 때 확인:**
1. 실제로 두 곳 이상에서 사용?
2. 도메인 지식 제거 가능?
3. API(props) 명확?

**지역성 vs Page First:**
- **지역성**: "어디에" 둘 것인가 (위치)
- **Page First**: "언제" 상위로 올릴 것인가 (시점)

---

### 전체 구조

실무에서 사용하는 구조입니다 (Next.js Pages Router 기준).

#### 프로젝트 최상위

```tsx
pages/             # Next.js 페이지 라우팅
├── _app.tsx       # 앱 설정
├── _document.tsx  # HTML 문서 설정
├── index.tsx      # 홈페이지
├── auth/          # 인증 관련
├── task/          # 업무 관련
└── my-page.tsx    # 마이페이지

src/
├── components/    # 공통 컴포넌트
├── constants/     # 공통 상수값
├── contexts/      # 공통 context
├── hooks/         # 공통 커스텀 훅
├── lib/           # 공통 라이브러리 설정 (queryClient, auth 등)
├── models/        # 공통 서버 타입 정의
├── modules/       # 공통 기능 단위 (최후의 수단)
├── mutations/     # 공통 React Query 뮤테이션
├── pages/         # 페이지별 리소스
├── queries/       # 공통 React Query 쿼리
├── remotes/       # API 클라이언트 및 공통 API
├── stores/        # 공용 상태
├── types/         # 공용 클라이언트 타입
└── utils/         # 헬퍼 함수
```

**두 개의 pages:**
- `/pages`: Next.js 라우팅 (프레임워크 요구)
- `/src/pages`: 페이지별 컴포넌트, 훅, 로직


---

## 2. 폴더별 역할
```
src/
├── components/    # 공통 컴포넌트
├── constants/     # 공통 상수값
├── contexts/      # 공통 context
├── hooks/         # 공통 커스텀 훅
├── lib/           # 공통 라이브러리 설정 (queryClient, auth 등)
├── models/        # 공통 (서버용)타입 정의
├── modules/       # 공통 기능 단위 정의 
├── mutations/     # 공통 React Query 뮤테이션
├── pages/         # 페이지별 컴포넌트
├── queries/       # 공통 React Query 쿼리
├── remotes/       # API 클라이언트 및 공통 API 정의 
├── stores/        # 공용 상태 
├── types/         # 공용 클라이언트 타입 정의
└── utils/         # 헬퍼 함수
```

### models/ vs types/
- **models/**: 서버 타입 (API 통신용)
- **types/**: 클라이언트 타입 (form, 파생 타입)

```tsx
// models/task.schema.ts
import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
});

export type Task = z.infer<typeof TaskSchema>;
```

```tsx
// types/task.type.ts
export type TaskFilter = {
  status: Task['status'] | 'ALL';
  searchQuery: string;
  sortBy: 'date' | 'title';
};

export type TaskListViewMode = 'list' | 'grid';
```

**구분 기준:**
- **models**: 서버와 통신하는 타입, 런타임 검증
- **types**: 클라이언트 내부에서만 사용하는 타입


### 파일/폴더 네이밍 컨벤션

| 대상 | 규칙 | 예시 |
|------|------|------|
| 디렉토리 | kebab-case | `task-detail/` |
| 컴포넌트 | PascalCase | `TaskHeader.tsx` |
| 페이지 | PascalCase + Page | `TaskDetailPage.tsx` |
| 훅 | use + camelCase | `useTaskDetail.ts` |
| 쿼리 | .query 접미사 | `task.query.ts` |
| 뮤테이션 | .mutation 접미사 | `task.mutation.ts` |
| 모델 | .dto 접미사 | `task.dto.ts` |
| 타입 | .type 접미사 | `task.type.ts` |

---

### modules/ (최후의 수단)

여러 페이지에서 재사용되지만 **도메인을 모르는 기능 패키지**입니다.

최대한 사용하지 않다가, 어쩔 수 없을 때만 사용합니다.

```tsx
src/modules/
├── step-renderer/       # 단계형 UI
│   ├── StepRenderer.tsx
│   ├── useStep.ts
│   └── index.ts
│
└── image-uploader/      # 이미지 업로드
    ├── ImageUploader.tsx
    ├── useImageUpload.ts
    └── index.ts
```

**modules vs components:**
- **components**: 순수 UI (stateless)
- **modules**: UI + 로직 + 상태 (stateful)

```tsx
// components/ - 순수 UI
export function Button({ onClick, children }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// modules/ - UI + 로직 + 상태
export function ImageUploader({ onUpload }: ImageUploaderProps) {
  const { upload, preview, isUploading } = useImageUpload();

  return (
    <div>
      {preview && <img src={preview} />}
      <input type="file" onChange={upload} />
      {isUploading && <Spinner />}
    </div>
  );
}
```

---

## 3. 실전 가이드

### 개발 흐름

**1. 페이지 단위부터 시작**

```tsx
src/pages/order-history/
├── components/
│   ├── OrderList.tsx
│   └── OrderItem.tsx
├── hooks/
│   └── useOrderHistory.ts
└── OrderHistoryPage.tsx
```

페이지 내에서 필요한 컴포넌트, 훅, 타입을 모두 로컬에 만듭니다.

**2. 재사용 필요 시 상위로**

```tsx
src/
├── components/
│   └── OrderItem.tsx        # 두 번째 사용처 생기면 이동
└── pages/
    ├── order-history/
    │   ├── components/
    │   │   └── OrderList.tsx
    │   └── hooks/
    │       └── useOrderHistory.ts
    └── order-detail/         # 여기서도 OrderItem 사용
```

실제로 다른 페이지에서도 사용할 때 공통 폴더로 올립니다.

---

## 정리

### 핵심 원칙

- **지역성**: 사용처와 가깝게 (위치)
- **Page First**: 로컬 먼저, 필요 시 상위로 (시점)
- **점진적 추상화**: 실제 필요 확인 후 추상화

### 적용 효과

- 파일 찾는 시간 감소
- 변경 영향 범위 명확
- 페이지 단위 독립적 개발 가능
