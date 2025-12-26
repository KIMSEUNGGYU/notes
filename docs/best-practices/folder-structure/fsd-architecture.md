---
title: FSD 아키텍처
description: 
draft: true
todo: 
 - 1차 초안 완성 (글 가독성 신경쓰기)
 - 글 다듬기?
---

# FSD 아키텍처

## 들어가며

프로젝트가 성장하면서 기존의 폴더 구조로는 복잡도를 관리하기 어려워질 때가 있습니다. **FSD(Feature-Sliced Design)**는 이런 문제를 해결하기 위한 체계적인 아키텍처 패턴입니다.

저는 FSD를 실제 프로젝트에 적용하면서 장단점을 모두 경험했습니다. 이 글에서는 FSD가 무엇인지, 왜 필요한지, 그리고 실무에서 어떻게 적용했는지 공유하겠습니다.

## FSD가 필요한 이유

### 역할 중심 구조의 한계

이전에 저는 역할 중심 구조를 사용했습니다:

```tsx
src/
├── components/
│   ├── auth/          # 100개 파일
│   ├── dashboard/     # 150개 파일
│   ├── settings/      # 80개 파일
│   └── ...
├── hooks/
├── utils/
└── types/
```

프로젝트가 커질수록 각 폴더가 엄청나게 비대해졌습니다. `components/dashboard/`에만 150개 파일이 있으니, 원하는 파일을 찾는 것도 일이었습니다.

더 큰 문제는 **함께 수정되는 파일들이 흩어져 있다는 것**이었습니다. 대시보드 기능을 수정하려면 `components/dashboard/`, `hooks/`, `utils/`, `types/` 등 여러 폴더를 오가며 작업해야 했습니다.

### 기능 중심으로의 전환

FSD는 이런 문제를 해결하기 위해 **기능(Feature) 중심**으로 코드를 구조화합니다.

> 함께 수정되는 소스 파일을 하나의 디렉토리에 배치하면 코드의 의존 관계를 명확하게 드러낼 수 있어요. 그래서 참조하면 안 되는 파일을 함부로 참조하는 것을 막고, 연관된 파일들을 한 번에 삭제할 수 있어요.

저는 이 원칙이 마음에 들었습니다. 관련된 코드가 한 곳에 모여 있으면 변경이 훨씬 쉬워지니까요.

## FSD의 핵심 개념

### Layer - Slice - Segment

FSD는 세 가지 축으로 코드를 구조화합니다:

```tsx
src/
├── app/              # Layer 1
├── pages/            # Layer 2
├── widgets/          # Layer 3
├── features/         # Layer 4
├── entities/         # Layer 5
└── shared/           # Layer 6
    └── ui/           # Segment
        └── button/   # Slice
```

**Layer**: 프로젝트 기능적 역할에 따른 수직적 분리  
**Slice**: 비즈니스 도메인별 분리  
**Segment**: 기술적 관심사 분리

### 계층별 의존성 규칙

FSD의 핵심 규칙은 **상위 레이어만 하위 레이어를 사용할 수 있다**는 것입니다:

```tsx
// ✅ 허용: 상위가 하위를 import
// pages (상위)
import { Button } from '@/shared/ui/button'; // shared (하위)

// ❌ 금지: 하위가 상위를 import
// shared/ui/button (하위)
import { UserProfile } from '@/features/user'; // features (상위)

// ❌ 금지: 동일 레벨끼리 import
// features/auth (동일 레벨)
import { TaskList } from '@/features/task'; // features/task (동일 레벨)
```

처음에는 이 규칙이 불편했습니다. 하지만 사용하면서 장점을 깨달았습니다. **순환 의존성을 원천적으로 방지**하고, **각 레이어의 책임이 명확**해집니다.

## 7개 레이어 이해하기

### App - 앱 실행 설정

앱의 전역 설정을 담당합니다:

```tsx
src/app/
├── providers/        # React Query, Router 등
│   ├── QueryProvider.tsx
│   └── RouterProvider.tsx
├── styles/
│   └── globals.css
└── router/
    └── index.tsx
```

저는 여기에 다음과 같은 것들을 둡니다:
- React Query 설정
- 라우터 설정
- 전역 스타일
- 에러 바운더리

### Pages - 페이지 컴포넌트

실제 사용자와 상호작용하는 페이지입니다:

```tsx
src/pages/
└── task-list/
    ├── ui/
    │   └── TaskListPage.tsx
    └── model/
        └── useTaskListFilter.ts
```

저는 페이지를 **조립하는 역할**로만 사용합니다. 실제 비즈니스 로직은 하위 레이어에 두고, 페이지에서는 그것들을 조합만 합니다.

### Widgets - 독립적인 UI 블록

재사용 가능한 복잡한 UI 블록입니다:

```tsx
src/widgets/
└── header/
    ├── ui/
    │   ├── Header.tsx
    │   └── UserMenu.tsx
    └── model/
        └── useAuth.ts
```

제가 widgets에 두는 것들:
- 헤더, 푸터 같은 레이아웃 컴포넌트
- 검색 필터 위젯
- 댓글 위젯

widgets는 **자체적으로 완결된 기능**을 제공하지만, 여러 곳에서 재사용됩니다.

### Features - 비즈니스 기능

사용자에게 실질적인 가치를 제공하는 기능 단위입니다:

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

저는 features를 **사용자 액션 중심**으로 생각합니다:
- 업무 생성하기
- 업무 완료하기
- 좋아요 누르기
- 댓글 작성하기

각 feature는 독립적이어야 하므로, feature끼리는 import하지 않습니다.

### Entities - 비즈니스 엔티티

프로젝트의 핵심 비즈니스 엔티티입니다:

```tsx
src/entities/
└── task/
    ├── api/
    │   └── index.ts     # axios 기반 CRUD
    ├── model/
    │   └── task.type.ts
    └── ui/
        └── TaskCard.tsx
```

저는 entities를 **서버 도메인 모델**로 생각합니다. 서버 API와 직접 통신하는 계층입니다.

**entities vs features 구분**:
- **entities**: 서버에서 정의한 도메인 (User, Task, Product)
- **features**: 사용자 관점의 기능 (로그인, 업무 생성, 장바구니 담기)

예를 들어:
```tsx
// entities/user - 서버 도메인
export type User = {
  id: string;
  name: string;
  email: string;
};

// features/user-profile - 사용자 기능
// User 엔티티를 사용하지만, "프로필 편집" 기능을 제공
```

### Shared - 재사용 가능한 기반

도메인과 무관한 범용 코드입니다:

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

shared는 **프로젝트를 바꿔도 재사용 가능**해야 합니다. 업무 관리 앱이든, 쇼핑몰이든 똑같이 쓸 수 있는 것들입니다.

## Segments 이해하기

각 slice 안에서 기술적 관심사로 분리합니다:

### ui - UI 컴포넌트

```tsx
src/features/task-create/
└── ui/
    ├── TaskCreateButton.tsx
    └── TaskCreateModal.tsx
```

순수하게 UI만 담당합니다.

### api - 백엔드 통신

```tsx
src/entities/task/
└── api/
    └── index.ts
```

저는 주로 entities 레벨에서 사용합니다. axios로 실제 HTTP 호출을 담당하죠.

features나 pages에서는 React Query를 사용하므로, api segment를 따로 두지 않습니다.

### model - 데이터 모델과 비즈니스 로직

```tsx
src/features/task-create/
└── model/
    ├── task-form.schema.ts  # zod 스키마
    └── useCreateTask.ts     # 비즈니스 로직
```

여기가 핵심입니다. 저는 다음과 같은 것들을 model에 둡니다:
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

순수 함수이지만 해당 도메인에 특화된 헬퍼 함수입니다.

**model vs lib 구분**:
- **model**: 비즈니스 로직 포함, 상태나 부수효과 있음
- **lib**: 순수 함수, 입출력만 있고 부수효과 없음

## NextJS에서 FSD 적용하기

### pages 폴더 충돌 문제

Next.js는 `/pages` 폴더를 라우팅에 사용합니다. FSD도 pages 레이어가 있어서 충돌이 발생합니다.

저는 FSD의 pages를 **views**로 이름을 바꿨습니다:

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

저는 다음과 같이 네이밍합니다:

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

- Next.js 파일: `[...]Page`
- FSD views: `[...]View`

이렇게 구분하면 어느 레이어의 코드인지 명확합니다.

## index.ts로 공개 API 관리하기

### 캡슐화의 중요성

FSD에서 각 slice는 `index.ts`로 공개 API를 정의합니다. 저는 이 패턴을 매우 유용하게 사용하고 있습니다.

```tsx
src/entities/task/
├── api/
│   └── index.ts
├── model/
│   └── task.type.ts
└── index.ts          # 공개 API
```

### 실제 사례

```tsx
// entities/task/api/index.ts
import { client } from '@/shared/lib/http';

const MAP_SORTING_KEY = {
  'patient-info': 'name',
  'screened-date': 'alert.date',
  sbp: 'screening_data[0].value',
};

const MAP_SORTING_ORDER = {
  asc: '',
  desc: '-',
};

export async function getTaskList({ page, perPage, sorting }) {
  const sort = sorting
    ? `${MAP_SORTING_ORDER[sorting.desc ? 'desc' : 'asc']}${
        MAP_SORTING_KEY[sorting.id]
      }`
    : undefined;

  const response = await client.get('/tasks', {
    params: { _page: page, _per_page: perPage, _sort: sort },
  });

  return response.data;
}

// entities/task/model/task.type.ts
export type Task = {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  assignee: string;
  createdAt: string;
};

// entities/task/index.ts - 공개 API만 export
export type { Task } from './model/task.type';
export { getTaskList } from './api';
```

외부에서는 오직 `index.ts`를 통해서만 접근합니다:

```tsx
// ✅ 좋은 예
import { Task, getTaskList } from '@/entities/task';

// ❌ 나쁜 예 - 내부 구현 직접 접근
import { Task } from '@/entities/task/model/task.type';
```

### 장점

1. **내부 구현 변경 자유로움**: MAP_SORTING_KEY 같은 내부 상수는 외부에 노출되지 않음
2. **인터페이스 명확**: 무엇을 사용할 수 있는지 index.ts만 보면 됨
3. **리팩토링 안전**: 내부 파일 구조를 바꿔도 외부에 영향 없음

## 실전 경험 공유

### 자산 관리 앱 사례

제가 만든 자산 관리 앱의 구조입니다:

```tsx
src/
├── app/
│   ├── router/
│   ├── globals.css
│   └── query-provider.tsx
│
├── entities/
│   ├── asset/
│   │   └── api/
│   │       └── index.ts      # CRUD
│   └── liabilities/
│       └── api/
│           └── index.ts      # CRUD
│
├── features/
│   └── asset-form/
│       ├── config/
│       │   └── constants.ts
│       ├── model/
│       │   └── asset-form.schema.ts
│       └── ui/
│           ├── AssetForm.tsx
│           ├── CategoryDrawer.tsx
│           └── InputNumber.tsx
│
├── views/
│   └── assets/
│       ├── detail/
│       ├── edit/          # asset-form 재사용
│       ├── enroll/        # asset-form 재사용
│       └── home/
│
└── shared/
    └── api.ts
```

**핵심 포인트**:
- `asset-form`은 feature로 추출 (edit과 enroll에서 재사용)
- entities에서 순수 CRUD만 제공
- 각 view에서 필요한 것들을 조합

### 본인인증 기능 사례

Passport 기반 본인인증을 구현할 때:

```tsx
// entities/authentication/api/get-certification.ts
export async function getCertification(payload: { imp_uid: string }) {
  const response = await certificationClient.post(
    `/iamport_sms_certification_log`,
    payload
  );
  return response.data;
}

// features/authentication/hooks/usePersonalAuthentication.ts
import { getCertification } from '@/entities/authentication';

export function usePersonalAuthentication() {
  useEffect(() => {
    if (!window.IMP) return;
    window.IMP.init('imp23574201');
  }, []);

  const onAuthenticationByPass = (callback) => {
    window.IMP.certification(
      { merchant_uid: 'merchant_' + new Date().getTime() },
      async (response) => {
        if (response.success) {
          const cert = await getCertification({ imp_uid: response.imp_uid });
          callback?.(cert);
        }
      }
    );
  };

  return { onAuthenticationByPass };
}
```

**계층 분리**:
- entities: 순수 API 호출
- features: 비즈니스 로직 (IMP 초기화, 인증 플로우)

이렇게 하니 API는 다른 곳에서도 재사용 가능하고, 인증 플로우는 feature로서 독립적입니다.

## 실전 팁

### 1. Entity vs Feature 구분 기준

처음에는 이 둘을 구분하기 어려웠습니다. 제 기준:

**Entity로 두는 경우**:
- 서버 API와 1:1 대응
- 다른 feature에서 공통으로 사용
- 데이터 중심 (CRUD 위주)

**Feature로 두는 경우**:
- 사용자 액션 중심
- 특정 비즈니스 규칙 포함
- 여러 entity를 조합

예시:
```tsx
// entities/user - 서버 도메인
export async function getUser(id: string) { ... }
export async function updateUser(id: string, data) { ... }

// features/user-profile-edit - 비즈니스 기능
export function useProfileEdit() {
  // 검증 로직, 에러 핸들링, 성공 후 처리 등
}
```

### 2. Widgets는 조심스럽게

저는 widgets를 많이 쓰지 않습니다. 대부분의 경우:
- 여러 feature를 조합 → pages에서 처리
- 단순 UI 조합 → 그냥 컴포넌트로

widgets는 정말 **자체적으로 완결되고 재사용되는 블록**일 때만 사용합니다.

### 3. 모든 레이어를 다 쓸 필요 없음

작은 프로젝트라면 일부 레이어만 사용해도 됩니다:

```tsx
// 작은 프로젝트
src/
├── app/
├── pages/
├── features/
└── shared/
```

저는 프로젝트 규모에 따라 레이어를 점진적으로 추가합니다.

### 4. adaptor 함수의 위치

서버 응답을 클라이언트 형태로 변환하는 adaptor 함수가 필요할 때가 있습니다.

처음에는 model에 따로 두었는데, 이제는 **사용하는 곳에 가깝게** 둡니다:

```tsx
// api/index.ts에서 바로 변환
export async function getTaskList() {
  const response = await client.get('/tasks');
  
  // adaptor를 여기서 바로 적용
  return response.data.map(task => ({
    ...task,
    createdAt: new Date(task.created_at),
  }));
}
```

응집도를 위해 한 파일에서 처리하는 게 더 읽기 좋습니다.

## FSD를 적용하며 느낀 점

### 장점

1. **명확한 구조**: 어디에 뭘 둬야 할지 고민이 줄었습니다
2. **의존성 관리**: 순환 의존성 걱정이 사라졌습니다
3. **팀 협업**: 다른 사람 코드를 찾기 쉬워졌습니다
4. **확장성**: 새 기능 추가가 기존 코드에 영향을 덜 줍니다

### 단점

1. **학습 곡선**: 팀원들이 개념을 이해하는 데 시간 필요
2. **초기 오버헤드**: 작은 기능에도 여러 레이어를 거쳐야 함
3. **엄격한 규칙**: 때로는 유연성이 필요한데 규칙에 막힘

저는 FSD를 **대규모 프로젝트나 장기 프로젝트**에 추천합니다. 작은 프로젝트는 더 간단한 Feature 기반 구조로도 충분합니다.

## 마치며

FSD는 폴더 구조를 넘어 **아키텍처 사고방식**입니다. 핵심은:

- **Layer 기반 의존성 관리**
- **Slice 기반 도메인 분리**
- **Segment 기반 기술 분리**
- **공개 API를 통한 캡슐화**

저는 FSD를 통해 "어디에 뭘 둬야 하지?"라는 고민을 덜 하게 되었습니다. 구조 자체가 답을 제시해주니까요. 특히 대규모 프로젝트나 장기 프로젝트에서 FSD의 명확한 규칙이 큰 힘을 발휘했습니다.

폴더 구조는 정답이 없습니다. 중요한 것은 **팀이 합의한 일관된 기준**이고, 그 기준이 **변경을 쉽게 만드는지**입니다. FSD는 그런 기준을 만드는 데 좋은 참고점이 될 수 있습니다.