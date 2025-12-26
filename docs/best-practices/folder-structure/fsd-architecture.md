---
title: FSD 아키텍처
description: Layer 기반 체계적인 폴더 구조
outline: deep
draft: true
todo: 
 - 초안은 완성, 하지만 좀 더 정리하기
---

# FSD 아키텍처

## 개요

**FSD(Feature-Sliced Design)** 는 대규모 프로젝트를 위한 체계적인 아키텍처 패턴입니다. Layer 기반 의존성 규칙으로 순환 참조를 방지하고, 명확한 책임 분리를 제공합니다.



## 1. 핵심 개념

::: tip 배경
역할 중심 구조의 한계와 문제점은 [Feature 기반 폴더 구조 - 문제 인식](/folder-structure/feature-based#문제-인식)을 참고하세요.
:::

### Layer - Slice - Segment

FSD는 세 가지 축으로 코드를 구조화합니다.

```tsx
src/
├── app/              # Layer 1: 앱 실행 설정
├── pages/            # Layer 2: 페이지 컴포넌트
├── widgets/          # Layer 3: 독립적인 UI 블록
├── features/         # Layer 4: 비즈니스 기능
├── entities/         # Layer 5: 비즈니스 엔티티
└── shared/           # Layer 6: 공통 기반
    └── ui/           # Segment (기술적 분리)
        └── button/   # Slice (도메인 분리)
```

**핵심 구조:**
- **Layer**: 기능적 역할에 따른 수직적 분리
- **Slice**: 비즈니스 도메인별 분리
- **Segment**: 기술적 관심사 분리 (ui, api, model, lib)

### 의존성 규칙

**상위 레이어만 하위 레이어를 import할 수 있습니다.**

```tsx
// ✅ 허용: 상위 → 하위
import { Button } from '@/shared/ui/button';  // pages → shared

// ❌ 금지: 하위 → 상위
import { UserProfile } from '@/features/user'; // shared → features

// ❌ 금지: 동일 레벨 간
import { TaskList } from '@/features/task';    // features/auth → features/task
```

**효과:**
- 순환 의존성 원천 차단
- 레이어별 책임 명확
- 리팩토링 영향 범위 예측 가능


## 2. 7개 레이어

### App - 앱 실행 설정

```tsx
src/app/
├── providers/        # React Query, Router 설정
│   ├── QueryProvider.tsx
│   └── RouterProvider.tsx
├── styles/
│   └── globals.css
└── router/
    └── index.tsx
```

전역 설정과 프로바이더를 관리합니다.


### Pages - 페이지 컴포넌트

```tsx
src/pages/
└── task-list/
    ├── ui/
    │   └── TaskListPage.tsx
    └── model/
        └── useTaskListFilter.ts
```

하위 레이어를 조합하는 역할만 수행합니다.


### Widgets - 독립적인 UI 블록

```tsx
src/widgets/
└── header/
    ├── ui/
    │   ├── Header.tsx
    │   └── UserMenu.tsx
    └── model/
        └── useAuth.ts
```

자체적으로 완결된 재사용 가능한 UI 블록입니다.

**예시:** 헤더, 푸터, 검색 필터 위젯


### Features - 비즈니스 기능

```tsx
src/features/
├── task-create/
│   ├── ui/
│   │   └── TaskCreateButton.tsx
│   └── model/
│       └── useCreateTask.ts
└── task-complete/
    ├── ui/
    │   └── CompleteButton.tsx
    └── model/
        └── useCompleteTask.ts
```

**사용자 액션 중심 기능:**
- 업무 생성하기
- 업무 완료하기
- 좋아요 누르기

**중요:** Feature끼리는 서로 import 금지

### Entities - 비즈니스 엔티티

```tsx
src/entities/
└── task/
    ├── api/
    │   └── index.ts         # CRUD
    ├── model/
    │   └── task.type.ts
    └── ui/
        └── TaskCard.tsx
```

서버 도메인 모델과 직접 통신하는 계층입니다.

**Entities vs Features:**

| 구분 | Entities | Features |
|------|----------|----------|
| 관점 | 서버 도메인 | 사용자 기능 |
| 예시 | User, Task, Product | 로그인, 업무 생성, 장바구니 |
| 역할 | 데이터 CRUD | 비즈니스 로직 |

### Shared - 재사용 가능한 기반

```tsx
src/shared/
├── ui/           # 공통 UI 컴포넌트
│   ├── button/
│   └── modal/
├── lib/          # 라이브러리 래퍼
│   └── http/
└── utils/        # 유틸 함수
    └── date.ts
```

**기준:** 프로젝트를 바꿔도 재사용 가능한 코드

## 3. Segments

각 slice 내부를 기술적 관심사로 분리합니다.

### ui - UI 컴포넌트

```tsx
src/features/task-create/
└── ui/
    ├── TaskCreateButton.tsx
    └── TaskCreateModal.tsx
```

순수 UI만 담당합니다.

### api - 백엔드 통신

```tsx
src/entities/task/
└── api/
    └── index.ts
```

주로 entities 레벨에서 사용합니다. axios로 HTTP 호출을 담당합니다.

### model - 데이터 모델 및 로직

```tsx
src/features/task-create/
└── model/
    ├── task-form.schema.ts  # zod 스키마
    └── useCreateTask.ts     # 비즈니스 로직
```

**포함하는 것:**
- zod 스키마 (데이터 검증)
- 상태 관리 (zustand, jotai)
- 커스텀 훅 (비즈니스 로직)
- React Query 훅

### lib - 도메인 특화 헬퍼

```tsx
src/entities/task/
└── lib/
    └── formatTaskStatus.ts
```

**Model vs Lib:**
- **model**: 비즈니스 로직, 상태/부수효과 있음
- **lib**: 순수 함수, 부수효과 없음

## 4. Next.js 적용

### pages 폴더 충돌 해결

Next.js의 `/pages`와 FSD의 `pages` 레이어가 충돌합니다.

**해결 방법: FSD pages를 views로 변경**

```tsx
/
├── app/              # Next.js App Router (또는 pages/)
└── src/
    ├── app/          # FSD App 레이어
    ├── views/        # FSD Pages 레이어 (이름 변경)
    ├── widgets/
    ├── features/
    ├── entities/
    └── shared/
```

### 페이지 컴포넌트 네이밍

```tsx
// Next.js 라우트 파일
// app/tasks/page.tsx
export default function TasksPage() {
  return <TaskListView />;
}

// FSD views 레이어
// src/views/task-list/ui/TaskListView.tsx
export function TaskListView() {
  // 실제 페이지 구현
}
```

**네이밍 규칙:**
- Next.js 파일: `[...]Page`
- FSD views: `[...]View`

## 5. index.ts 패턴

각 slice는 `index.ts`로 외부에 노출할 API를 정의합니다.

```tsx
src/entities/task/
├── api/
│   └── index.ts
├── model/
│   └── task.type.ts
└── index.ts          # 공개 API
```

**사용 예시:**

```tsx
// entities/task/index.ts - 공개 API만 export
export type { Task } from './model/task.type';
export { getTaskList } from './api';

// ✅ 좋은 예: index.ts를 통한 접근
import { Task, getTaskList } from '@/entities/task';

// ❌ 나쁜 예: 내부 구현 직접 접근
import { Task } from '@/entities/task/model/task.type';
```

**장점:**
- 내부 구현 변경 자유로움
- 인터페이스 명확
- 리팩토링 안전

## 6. 실전 가이드

### Page First 원칙

저는 FSD에서도 **먼저 로컬에, 재사용 필요 시 상위로** 원칙을 적용하는 것을 선호합니다.

```tsx
// 1단계: views(페이지) 로컬에서 시작
src/views/asset-enroll/
├── ui/
│   ├── AssetEnrollView.tsx
│   └── AssetForm.tsx       # 여기서 시작
└── model/
    └── asset-form.schema.ts

// 2단계: 재사용 필요 시 features로 이동
src/
├── features/
│   └── asset-form/         # edit과 enroll에서 모두 사용
│       ├── ui/
│       │   └── AssetForm.tsx
│       └── model/
│           └── asset-form.schema.ts
└── views/
    ├── asset-enroll/
    └── asset-edit/         # 여기서도 사용
```

### Entity vs Feature 구분

**Entity로 두는 경우:**
- 서버 API와 1:1 대응
- 다른 feature에서 공통으로 사용
- 데이터 중심 (CRUD 위주)

**Feature로 두는 경우:**
- 사용자 액션 중심
- 특정 비즈니스 규칙 포함
- 여러 entity를 조합

```tsx
// entities/user - 서버 도메인
export async function getUser(id: string) { ... }
export async function updateUser(id: string, data) { ... }

// features/user-profile-edit - 비즈니스 기능
export function useProfileEdit() {
  // 검증 로직, 에러 핸들링, 성공 후 처리 등
}
```

### Widgets 사용 기준

대부분의 경우:
- 여러 feature 조합 → pages에서 처리
- 단순 UI 조합 → 컴포넌트로 처리

**Widgets는 자체 완결되고 재사용되는 블록일 때만 사용합니다.**

### 점진적 레이어 추가

작은 프로젝트는 일부 레이어만 사용:

```tsx
// 작은 프로젝트
src/
├── app/
├── pages/
├── features/
└── shared/
```

프로젝트 규모에 따라 필요한 레이어를 점진적으로 추가합니다.

---

## 정리

### FSD 핵심

- **Layer 기반 의존성**: 순환 참조 방지
- **Slice 기반 도메인 분리**: 비즈니스 단위 독립
- **Segment 기반 기술 분리**: 관심사 명확화
- **공개 API 캡슐화**: index.ts로 인터페이스 관리
- **Page First 원칙**: 로컬 먼저, 필요 시 상위로

### 적용 효과

- 명확한 구조와 책임 분리
- 의존성 관리 자동화
- 팀 협업 효율 향상
- 확장성 및 리팩토링 안전성
