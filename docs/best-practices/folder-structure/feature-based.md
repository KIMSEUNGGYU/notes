---
title: Feature 기반 폴더 구조
description: 
draft: true
todo: 
 - 1차 초안 완성 (글 가독성 신경쓰기)
 - 글 다듬기?
---

> TODO: Feature 기반 + 지역성 원칙(Page First) 가 핵심 

# Feature 기반 폴더 구조

## 들어가며

프로젝트가 커질수록 "이 파일을 어디에 둬야 하지?"라는 고민이 늘어납니다. 저는 Next.js 기반 프로젝트를 주로 다루면서, 역할 중심과 Page First를 조합한 구조를 사용하고 있습니다.

이 글에서는 실무에서 사용하는 구체적인 폴더 구조와 함께, 왜 이렇게 구성했는지, 어떤 점이 좋았는지 공유하려고 합니다.

## 전체 디렉토리 구조

### 최상위 구조

제가 사용하는 기본 구조입니다:

```tsx
project/
├── pages/              # Next.js 페이지 라우팅
│   ├── _app.tsx
│   ├── index.tsx
│   ├── auth/
│   └── task/
│
└── src/
    ├── components/     # 전역 공통 UI (도메인 모름)
    ├── hooks/          # 전역 공통 훅
    ├── utils/          # 전역 유틸 함수
    ├── lib/            # 라이브러리 설정
    ├── modules/        # 기능 패키지 (도메인 모름)
    │
    └── pages/          # 페이지별 로컬 리소스
        ├── index/
        ├── auth/
        └── task/
```

여기서 중요한 점은 **두 개의 `pages` 폴더**입니다:
- `/pages`: Next.js 라우팅을 위한 폴더 (프레임워크 요구사항)
- `/src/pages`: 페이지별 컴포넌트, 훅, 로직 등을 관리하는 폴더

Next.js의 `/pages` 폴더는 라우팅만 담당하고, 실제 페이지 로직은 `/src/pages`에서 관리합니다.

### 세 가지 레벨의 공유 범위

저는 파일을 세 가지 레벨로 구분합니다:

```tsx
src/
├── components/        # Level 1: 전역 (프로젝트 전체)
├── modules/           # Level 2: 모듈 (여러 페이지)
└── pages/             # Level 3: 로컬 (단일 페이지)
```

**Level 1 - 전역**: 도메인을 모르는 범용 UI/유틸
- Button, Modal, Input 등
- date 포맷터, debounce 등

**Level 2 - 모듈**: 도메인은 모르지만 특정 기능을 제공
- 단계형 폼 렌더러
- 이미지 업로더
- 차트 래퍼

**Level 3 - 로컬**: 특정 페이지 전용
- 페이지별 컴포넌트
- 페이지별 훅과 로직

이 구분의 핵심은 **도메인 지식의 유무**입니다. 상위로 갈수록 도메인에 대해 모르고, 하위로 갈수록 도메인 지식이 들어갑니다.

## 페이지 단위 폴더 구조

### 기본 구조

페이지 폴더 안에서 저는 역할별로 폴더를 나눕니다:

```tsx
src/pages/task-detail/
├── components/          # UI 컴포넌트
│   ├── TaskHeader.tsx
│   ├── CommentList.tsx
│   └── StatusBadge.tsx
│
├── hooks/              # 커스텀 훅
│   ├── useTaskDetail.ts
│   └── useComments.ts
│
├── queries/            # React Query 쿼리
│   └── task.query.ts
│
├── mutations/          # React Query 뮤테이션
│   └── task.mutation.ts
│
├── remotes/            # API 호출 함수
│   └── task.ts
│
├── models/             # 서버 데이터 모델
│   └── task.schema.ts
│
├── types/              # 클라이언트 타입
│   └── task.type.ts
│
├── utils/              # 페이지 전용 유틸
│   └── formatTaskDate.ts
│
├── constants/          # 상수
│   └── STATUS_OPTIONS.ts
│
└── TaskDetailPage.tsx  # 페이지 컴포넌트
```

각 폴더의 역할이 명확하고, 관련 파일을 찾기 쉽습니다.

### 실제 사용 예시

실제로 업무 상세 페이지를 만들 때의 흐름입니다:

```tsx
// 1. API 호출 함수 정의 (remotes/)
// remotes/task.ts
export async function fetchTask(taskId: string) {
  const response = await client.get(`/tasks/${taskId}`);
  return response.data;
}

// 2. 데이터 모델 정의 (models/)
// models/task.schema.ts
import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  assignee: z.string(),
  createdAt: z.string(),
});

export type Task = z.infer<typeof TaskSchema>;

// 3. React Query 쿼리 정의 (queries/)
// queries/task.query.ts
import { queryOptions } from '@tanstack/react-query';
import { fetchTask } from '../remotes/task';
import { TaskSchema } from '../models/task.schema';

export const taskDetailQuery = (taskId: string) =>
  queryOptions({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const data = await fetchTask(taskId);
      return TaskSchema.parse(data); // 런타임 검증
    },
  });

// 4. 훅으로 감싸기 (hooks/)
// hooks/useTaskDetail.ts
import { useSuspenseQuery } from '@tanstack/react-query';
import { taskDetailQuery } from '../queries/task.query';

export function useTaskDetail(taskId: string) {
  return useSuspenseQuery(taskDetailQuery(taskId));
}

// 5. 컴포넌트에서 사용 (components/)
// components/TaskHeader.tsx
import { useTaskDetail } from '../hooks/useTaskDetail';

export function TaskHeader({ taskId }: { taskId: string }) {
  const { data: task } = useTaskDetail(taskId);
  
  return (
    <header>
      <h1>{task.title}</h1>
      <span>{task.status}</span>
    </header>
  );
}
```

이렇게 계층을 나누면 각 레이어의 책임이 명확해집니다:
- `remotes`: 순수한 HTTP 통신
- `models`: 데이터 검증과 타입
- `queries`: React Query 캐싱 로직
- `hooks`: 비즈니스 로직
- `components`: UI 렌더링

## 공통 폴더 컨벤션

### 폴더별 역할 정리

제가 사용하는 폴더들과 각각의 명확한 역할입니다:

| 폴더 | 역할 | 예시 |
|------|------|------|
| `components/` | UI 컴포넌트 | `TaskList.tsx`, `StatusBadge.tsx` |
| `contexts/` | Context API | `TaskFilterContext.tsx` |
| `hooks/` | 커스텀 훅 | `useTaskList.ts`, `useFilter.ts` |
| `queries/` | React Query 쿼리 | `task.query.ts` |
| `mutations/` | React Query 뮤테이션 | `task.mutation.ts` |
| `remotes/` | API 호출 함수 | `task.ts` |
| `models/` | 서버 데이터 모델 (zod) | `task.schema.ts` |
| `types/` | 클라이언트 타입 | `filter.type.ts` |
| `utils/` | 유틸 함수 | `formatDate.ts` |
| `constants/` | 상수 | `STATUS_OPTIONS.ts` |

### models vs types

처음에는 이 둘의 구분이 헷갈렸습니다. 저는 다음과 같이 구분합니다:

```tsx
// models/ - 서버에서 오는 데이터의 런타임 검증
// models/task.schema.ts
import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
});

export type Task = z.infer<typeof TaskSchema>;

// types/ - 클라이언트에서만 사용하는 타입
// types/filter.type.ts
export type TaskFilter = {
  status: Task['status'] | 'ALL';
  searchQuery: string;
  sortBy: 'date' | 'title';
};

export type TaskListViewMode = 'list' | 'grid';
```

**models/**:
- 서버 API 응답/요청의 형태
- zod로 런타임 검증 가능
- 서버와의 계약(contract)

**types/**:
- 클라이언트 상태나 UI를 위한 타입
- 런타임 코드 없음
- 내부 구현 디테일

### queries vs mutations

React Query를 사용할 때 저는 파일을 분리합니다:

```tsx
// queries/ - 데이터 조회
// queries/task.query.ts
export const taskListQuery = (filter: TaskFilter) =>
  queryOptions({
    queryKey: ['tasks', filter],
    queryFn: () => fetchTasks(filter),
  });

export const taskDetailQuery = (taskId: string) =>
  queryOptions({
    queryKey: ['task', taskId],
    queryFn: () => fetchTask(taskId),
  });

// mutations/ - 데이터 변경
// mutations/task.mutation.ts
export const updateTaskMutation = () =>
  mutationOptions({
    mutationFn: (params: { id: string; data: Partial<Task> }) =>
      updateTask(params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
```

이렇게 분리하면:
- 조회와 변경의 책임이 명확
- 캐시 무효화 로직을 한 곳에서 관리
- 파일명만 봐도 읽기/쓰기 구분 가능

또한 `queryOptions`/`mutationOptions`로 정의하는 이유는 정의와 사용처를 구분해서 활용할 수 있어 관리에 용이하기 때문입니다.

## modules 활용하기

### modules의 개념

`modules/`는 여러 페이지에서 재사용되지만 **도메인을 모르는 기능 패키지**를 여기에 둡니다. 저는 실제로 잘 사용하지 않는 편이고, 지역성과 전역 공통 사이에 애매한 경우에만 사용합니다.

```tsx
src/modules/
├── step-renderer/       # 단계형 UI 렌더러
│   ├── StepRenderer.tsx
│   ├── useStep.ts
│   ├── types.ts
│   └── index.ts
│
└── image-uploader/      # 이미지 업로드 기능
    ├── ImageUploader.tsx
    ├── useImageUpload.ts
    ├── utils.ts
    └── index.ts
```

### 실제 사례: step-renderer

저는 여러 페이지에서 단계형 폼을 사용합니다. 회원가입, 업무 생성, 설정 마법사 등에서요. 각 페이지의 단계 내용은 다르지만, **단계를 관리하는 로직은 동일**합니다.

```tsx
// modules/step-renderer/StepRenderer.tsx
type Step = {
  id: string;
  component: React.ComponentType<{ onNext: () => void }>;
};

type StepRendererProps = {
  steps: Step[];
  onComplete: () => void;
};

export function StepRenderer({ steps, onComplete }: StepRendererProps) {
  const { currentStep, next, prev } = useStep(steps.length);
  
  const CurrentStepComponent = steps[currentStep].component;
  
  return (
    <div>
      <CurrentStepComponent 
        onNext={currentStep === steps.length - 1 ? onComplete : next} 
      />
    </div>
  );
}

// pages/signup/SignupPage.tsx
import { StepRenderer } from '@/modules/step-renderer';
import { PersonalInfo, AccountInfo, Complete } from './components';

export function SignupPage() {
  const steps = [
    { id: 'personal', component: PersonalInfo },
    { id: 'account', component: AccountInfo },
    { id: 'complete', component: Complete },
  ];
  
  return <StepRenderer steps={steps} onComplete={handleSignup} />;
}
```

`StepRenderer`는 "회원가입", "업무" 같은 도메인을 전혀 모릅니다. 단지 **단계를 관리하는 기능**만 제공합니다.

### modules vs components 구분

처음에는 이 둘을 구분하기 어려웠습니다. 제 기준은:

```tsx
// components/ - 순수 UI, props만 받아서 렌더링
export function Button({ onClick, children }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// modules/ - UI + 로직 + 상태를 패키징
export function ImageUploader({ onUpload }: ImageUploaderProps) {
  const { upload, preview, isUploading } = useImageUpload();
  // 내부에 상태와 로직이 있음
  
  return (
    <div>
      {preview && <img src={preview} />}
      <input type="file" onChange={upload} />
      {isUploading && <Spinner />}
    </div>
  );
}
```

**components/**는 stateless에 가깝고, **modules/**는 stateful한 기능 단위입니다.

## 파일 네이밍 규칙

### 디렉토리와 파일

저는 다음 규칙을 따릅니다:

```tsx
src/pages/
├── task-detail/           # 디렉토리: kebab-case
│   ├── components/
│   │   ├── TaskHeader.tsx       # 컴포넌트: PascalCase
│   │   └── CommentList.tsx
│   ├── hooks/
│   │   └── useTaskDetail.ts     # 훅: camelCase (use 접두사)
│   ├── queries/
│   │   └── task.query.ts        # 쿼리: 접미사 .query
│   ├── mutations/
│   │   └── task.mutation.ts     # 뮤테이션: 접미사 .mutation
│   └── TaskDetailPage.tsx       # 페이지: PascalCase + Page
```

### 배럴 파일 (index.ts)

모듈에서는 배럴 파일로 public API를 명시합니다:

```tsx
// modules/step-renderer/index.ts
export { StepRenderer } from './StepRenderer';
export { useStep } from './useStep';
export type { Step, StepRendererProps } from './types';

// 내부 구현은 export 하지 않음
// - helpers.ts
// - constants.ts
```

이렇게 하면:
- 외부에서 사용할 API만 노출
- 내부 구현 변경이 자유로움
- 모듈의 인터페이스가 명확

## 실전 팁

### 1. 처음부터 완벽하게 나누지 않기

저는 처음에 모든 파일을 한 곳에 두고 시작합니다:

```tsx
// 초기
src/pages/task-detail/
├── TaskDetailPage.tsx    # 여기에 모든 로직

// 점진적으로 분리
src/pages/task-detail/
├── components/
│   └── TaskHeader.tsx    # UI가 복잡해지면 분리
├── hooks/
│   └── useTaskDetail.ts  # 로직이 복잡해지면 분리
└── TaskDetailPage.tsx
```

**필요가 생겼을 때** 분리하는 것이 과도한 추상화를 막습니다.

### 2. 파일은 작게, 폴더는 얕게

저는 다음을 선호합니다:

```tsx
// ✅ 여러 작은 파일
components/
├── TaskHeader.tsx        # 50줄
├── TaskBody.tsx          # 60줄
└── TaskFooter.tsx        # 40줄

// ❌ 하나의 큰 파일
components/
└── TaskDetail.tsx        # 300줄
```

하지만 폴더는 너무 깊게 만들지 않습니다:

```tsx
// ❌ 너무 깊은 구조
components/task/detail/header/title/

// ✅ 적당한 깊이
components/
└── task/
    ├── TaskHeader.tsx
    └── TaskTitle.tsx
```

### 3. 컨벤션은 팀과 함께

폴더 구조는 팀의 합의가 중요합니다. 저희 팀은:

1. **README에 구조 문서화**
2. **ESLint로 import 규칙 강제**
3. **코드 리뷰에서 위치 검토**

이렇게 세 가지로 컨벤션을 유지합니다.

## 마치며

Feature 기반 폴더 구조의 핵심은:

- **페이지 단위로 역할별 폴더** 구성
- **세 가지 레벨의 공유 범위** (전역/모듈/로컬)
- **점진적인 추상화**

저는 이 구조를 사용하면서 파일을 찾는 시간이 크게 줄었고, 코드 수정의 영향 범위를 쉽게 파악할 수 있게 되었습니다. 각 레이어의 책임이 명확해지니 새로운 기능을 추가하거나 기존 코드를 수정할 때도 훨씬 자신감 있게 작업할 수 있었습니다.
