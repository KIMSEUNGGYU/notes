---
title: 지역성 기반 폴더 구조
description: 지역성과 Page First 원칙 기반 실무 가이드
outline: deep
---

# 지역성 기반 폴더 구조

## Overview

프로젝트가 커지면서 "이 파일을 어디에 둬야 하지?"라는 고민이 늘어납니다. Feature 기반 폴더 구조는 지역성(Locality)과 Page First 원칙을 바탕으로 변경에 강하고 명확한 구조를 만듭니다.

이 글에서는 제가 실무에서 사용하고 있는 구조를 공유합니다. 정답은 아니지만, 파일 위치만으로 사용 범위를 파악할 수 있고, 페이지 삭제 시 관련 파일을 한 번에 제거할 수 있어서 유용합니다.

Next.js Pages Router 기준으로 설명하며, 다른 프레임워크에도 동일하게 적용 가능합니다.

## 1. 문제 인식

흔히 사용하는 역할 중심 구조는 프로젝트가 커질수록 문제가 발생합니다.

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

| 문제 | 설명 |
|------|------|
| 파일 찾기 어려움 | 관련 파일이 components, hooks, types에 흩어짐 |
| 삭제 비용 증가 | 페이지 삭제 시 연관 파일을 하나씩 찾아야 함 |
| 영향 범위 불명확 | 이 컴포넌트를 수정하면 어디까지 영향을 주는지 파악 어려움 |

이 문제를 해결하기 위해 지역성 원칙과 Page First 원칙을 적용합니다.

## 2. 핵심 원칙

### 지역성 (Locality)

**사용하는 곳과 가장 가까운 위치에 파일을 배치합니다.**

```tsx
// ❌ Bad: 모든 컴포넌트를 최상위에
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
// ✅ Good: 사용처 가까이
src/
├── components/
│   └── Button.tsx              // 전역 공통만
└── pages/
    ├── dashboard/
    │   └── components/
    │       └── DashboardStats.tsx
    └── user/
        └── components/
            └── UserProfile.tsx
```

**효과:**
- 폴더 위치가 사용 범위를 보장
- 변경 영향 범위가 명확
- 페이지 삭제 시 폴더만 제거하면 됨

### Page First

**처음엔 페이지 로컬에 생성하고, 재사용이 필요할 때 상위로 이동합니다.**

```tsx
// 1단계: 페이지 로컬에 생성
src/pages/product-detail/
├── components/
│   └── PriceSection.tsx    // 여기서 시작
└── ProductDetailPage.tsx

// 2단계: 두 번째 사용처가 생기면 상위로 이동
src/
├── components/
│   └── PriceSection.tsx    // 공통으로 이동
└── pages/
    ├── product-detail/
    └── checkout/           // 여기서도 사용
```

**상위로 올릴 때 확인:**
1. 실제로 두 곳 이상에서 사용하는가?
2. 도메인 지식을 제거할 수 있는가?
3. props 인터페이스가 명확한가?

| 원칙 | 역할 |
|------|------|
| 지역성 | "어디에" 둘 것인가 (위치) |
| Page First | "언제" 상위로 올릴 것인가 (시점) |

## 3. 전체 구조

위 원칙을 적용한 구조입니다.

```tsx
pages/                 # Next.js 라우팅
├── _app.tsx
├── _document.tsx
├── index.tsx
├── auth/
└── task/

src/
├── components/        # 전역 공통 UI
├── hooks/             # 전역 커스텀 훅
├── utils/             # 전역 순수 유틸
├── lib/               # 전역 인프라 (queryClient, auth 등)
├── constants/         # 전역 상수
├── contexts/          # 전역 context
├── models/            # 전역 서버 타입 정의
├── types/             # 전역 클라이언트 타입 정의
├── queries/           # 전역 React Query 쿼리
├── mutations/         # 전역 React Query 뮤테이션
├── remotes/           # API 클라이언트 및 공통 API
├── stores/            # 전역 상태
├── modules/           # 기능 패키지
└── pages/             # 페이지별 리소스
    └── {page}/
        ├── components/
        ├── hooks/
        ├── queries/
        ├── mutations/
        ├── remotes/
        ├── models/
        ├── types/
        ├── utils/
        ├── constants/
        └── {Page}.tsx
```

**두 개의 pages:**
- `/pages`: Next.js 라우팅 (프레임워크 요구)
- `/src/pages`: 페이지별 컴포넌트, 훅, 로직

핵심은 전역과 로컬(페이지)로 나뉜다는 점입니다. `src/` 바로 아래에 있는 폴더들은 전역이고, `src/pages/{page}/` 아래에 있는 폴더들은 해당 페이지 전용입니다. 같은 이름의 폴더(components, hooks 등)가 양쪽에 있을 수 있습니다.

대부분의 폴더는 역할 중심 구조와 동일하지만, models, types, modules는 헷갈릴 수 있어서 아래에서 설명합니다.

## 4. 헷갈리기 쉬운 폴더

### models vs types

서버와 통신하려면 서버의 요청/응답 타입을 알아야 합니다. 이 타입을 models에 정의합니다. 개발하다 보면 서버와 상관없이 클라이언트에서만 필요한 타입이 생깁니다. 이런 타입은 types에 정의합니다.

| 구분 | 용도 | 예시 |
|------|------|------|
| models | 서버 요청/응답 타입 (DTO) | 사용자 정보, 태스크 목록 |
| types | 클라이언트 내부 타입 | form 상태, UI 상태, 필터 조건 |

```tsx
// models/task.schema.ts - 서버에서 내려주는 타입
import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
});

export type Task = z.infer<typeof TaskSchema>;
```

```tsx
// types/task.type.ts - 클라이언트에서만 쓰는 타입
export type TaskFilter = {
  status: Task['status'] | 'ALL';
  searchQuery: string;
  sortBy: 'date' | 'title';
};

export type TaskListViewMode = 'list' | 'grid';
```

### modules

개발하다 보면 로컬(페이지)에 만들었지만, 다른 페이지에서도 같은 기능이 필요한 경우가 생깁니다. UI만 필요하면 components로 올리면 되는데, UI와 로직, API 호출까지 함께 필요한 경우가 있습니다. 이럴 때 modules를 사용합니다.

```tsx
src/modules/
├── step-renderer/       # 단계형 UI + 상태 관리
│   ├── StepRenderer.tsx
│   ├── useStep.ts
│   └── index.ts
└── image-uploader/      # 이미지 업로드 UI + 로직
    ├── ImageUploader.tsx
    ├── useImageUpload.ts
    └── index.ts
```

| 구분 | components | modules |
|------|------------|---------|
| 상태 | stateless | stateful |
| 포함 | 순수 UI만 | UI + 로직 + 상태 |

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

modules는 최대한 사용하지 않다가 어쩔 수 없을 때만 사용합니다.

## 5. 네이밍 컨벤션

### 파일/폴더

| 대상 | 규칙 | 예시 |
|------|------|------|
| 디렉토리 | kebab-case | `task-detail/` |
| 컴포넌트 | PascalCase | `TaskHeader.tsx` |
| 페이지 | PascalCase + Page | `TaskDetailPage.tsx` |
| 훅 | use + camelCase | `useTaskDetail.ts` |

### 접미사 규칙

| 접미사 | 용도 | 위치 |
|--------|------|------|
| .query.ts | React Query 쿼리 | queries/ |
| .mutation.ts | React Query 뮤테이션 | mutations/ |
| .schema.ts | zod 스키마 | models/ |
| .type.ts | 타입 정의 | types/ |
| .store.ts | 상태 저장소 | stores/ |

## 6. 개발 흐름

**1단계: 페이지 로컬에서 시작**

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

**2단계: 재사용 필요 시 상위로 이동**

```tsx
src/
├── components/
│   └── OrderItem.tsx        # 공통으로 이동
└── pages/
    ├── order-history/
    │   ├── components/
    │   │   └── OrderList.tsx
    │   └── hooks/
    │       └── useOrderHistory.ts
    └── order-detail/         # 여기서도 OrderItem 사용
```

실제로 다른 페이지에서 사용할 때 공통 폴더로 올립니다.

## 정리

| 원칙 | 설명 |
|------|------|
| 지역성 | 사용처와 가깝게 (위치) |
| Page First | 로컬 먼저, 필요 시 상위로 (시점) |
| 점진적 추상화 | 실제 필요 확인 후 추상화 |
