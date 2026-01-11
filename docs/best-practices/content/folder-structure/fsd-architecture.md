---
title: FSD 아키텍처
description: Layer 기반 체계적인 폴더 구조
outline: deep
---

# FSD 아키텍처

## Overview

프로젝트 규모가 커지면 폴더 구조만으로는 의존성 관리가 어려워집니다. FSD(Feature-Sliced Design)는 Layer 기반 의존성 규칙으로 순환 참조를 방지하고, 명확한 책임 분리를 제공합니다.

FSD는 해석이 개발자마다 다양합니다. 이 글에서는 제가 이해하고 적용해본 방식을 공유합니다.

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
| 순환 참조 발생 | A → B → C → A 같은 의존성 순환이 생김 |
| 영향 범위 불명확 | 이 파일을 수정하면 어디까지 영향을 주는지 파악 어려움 |

FSD는 레이어 간 의존성 규칙을 강제해서 이 문제를 해결합니다.

## 2. 핵심 개념

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

| 개념 | 역할 | 예시 |
|------|------|------|
| Layer | 기능적 역할에 따른 수직적 분리 | app, pages, features |
| Slice | 비즈니스 도메인별 분리 | user, task, payment |
| Segment | 기술적 관심사 분리 | ui, api, model, lib |

### 의존성 규칙

**상위 레이어만 하위 레이어를 import할 수 있습니다.**

```tsx
// ✅ 허용: 상위 → 하위
import { Button } from '@/shared/ui/button';    // pages → shared
import { User } from '@/entities/user';         // features → entities

// ❌ 금지: 하위 → 상위
import { UserProfile } from '@/features/user';  // shared → features

// ❌ 금지: 동일 레벨 간
import { TaskList } from '@/features/task';     // features/auth → features/task
```

**효과:**
- 순환 의존성 원천 차단
- 레이어별 책임 명확
- 리팩토링 영향 범위 예측 가능

## 3. 6개 레이어

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

자체적으로 완결된 재사용 가능한 UI 블록입니다. 헤더, 사이드바, 검색 필터 위젯 등이 해당합니다.

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

사용자 액션 중심 기능입니다. 업무 생성하기, 업무 완료하기, 좋아요 누르기 등이 해당합니다.

**주의:** Feature끼리는 서로 import 금지

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

프로젝트를 바꿔도 재사용 가능한 코드입니다.

## 4. Segments

각 Slice 내부를 기술적 관심사로 분리합니다.

| Segment | 역할 | 포함 내용 |
|---------|------|----------|
| ui | UI 컴포넌트 | 순수 UI만 담당 |
| api | 백엔드 통신 | axios, fetch 호출 |
| model | 데이터 모델 및 로직 | zod 스키마, 상태 관리, 커스텀 훅 |
| lib | 도메인 특화 헬퍼 | 순수 함수, 부수효과 없음 |
| config | 설정 | 상수, 설정 값 |

**model vs lib:**
- model: 비즈니스 로직, 상태/부수효과 있음
- lib: 순수 함수, 부수효과 없음

## 5. Next.js 적용

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

| 위치 | 네이밍 규칙 |
|------|------------|
| Next.js 파일 | `[...]Page` |
| FSD views | `[...]View` |

## 6. index.ts 패턴

각 Slice는 `index.ts`로 외부에 노출할 API를 정의합니다.

```tsx
src/entities/task/
├── api/
│   └── index.ts
├── model/
│   └── task.type.ts
└── index.ts          # 공개 API
```

```tsx
// entities/task/index.ts - 공개 API만 export
export type { Task } from './model/task.type';
export { getTaskList } from './api';

// ✅ Good: index.ts를 통한 접근
import { Task, getTaskList } from '@/entities/task';

// ❌ Bad: 내부 구현 직접 접근
import { Task } from '@/entities/task/model/task.type';
```

**효과:**
- 내부 구현 변경 자유로움
- 인터페이스 명확
- 리팩토링 안전

## 7. 개발 흐름

### 점진적 레이어 추가

작은 프로젝트는 일부 레이어만 사용합니다.

```tsx
// 작은 프로젝트
src/
├── app/
├── pages/
├── features/
└── shared/
```

프로젝트 규모에 따라 필요한 레이어를 점진적으로 추가합니다.

### Page First 원칙

FSD에서도 먼저 로컬에, 재사용 필요 시 상위로 원칙을 적용합니다.

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

### Widgets 사용 기준

대부분의 경우:
- 여러 feature 조합 → pages에서 처리
- 단순 UI 조합 → 컴포넌트로 처리

Widgets는 자체 완결되고 재사용되는 블록일 때만 사용합니다.

## 정리

| 개념 | 설명 |
|------|------|
| Layer 기반 의존성 | 상위 → 하위만 import 가능, 순환 참조 방지 |
| Slice 기반 도메인 분리 | 비즈니스 단위 독립 |
| Segment 기반 기술 분리 | ui, api, model, lib으로 관심사 분리 |
| index.ts 캡슐화 | 공개 API만 export |
| Page First 원칙 | 로컬 먼저, 필요 시 상위로 |

### 실무 적용 후 느낀 점

FSD를 도입하면서 레이어 간 의존성 규칙이 명확해지는 장점이 있었습니다. 다만 팀에서 레이어 경계를 논의하고 결정해도, 실제 작업하면서 의문점이 계속 생겼습니다.

- "이건 feature인가 entity인가?"
- "widgets를 써야 하나, pages에서 조합하면 되나?"
- "이 로직은 model인가 lib인가?"

현재는 지역성 기반 폴더 구조를 사용하고 있습니다. "이 페이지에서만 쓰면 로컬, 여러 곳에서 쓰면 상위로"라는 규칙이 단순해서 작업 중 판단이 더 명확했습니다.
