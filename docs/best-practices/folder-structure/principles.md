---
title: 폴더 구조의 핵심 원칙
description: 
draft: true
todo: 
 - 1차 초안 완성 (글 가독성 신경쓰기)
 - 글 다듬기?
---

# 폴더 구조의 핵심 원칙

## 들어가며

프로젝트 초기에는 폴더 구조가 크게 중요하지 않습니다. 파일이 적고 기능이 단순할 때는 어떻게 구성하든 찾기 쉽고 수정하기도 편합니다. 하지만 프로젝트가 성장하면서 상황이 달라집니다.

저는 여러 프로젝트를 경험하면서 폴더 구조가 단순히 "파일 정리"의 문제가 아니라는 것을 깨달았습니다. 폴더 구조는 **코드의 변경 가능성**과 직결되어 있습니다. 잘 설계된 폴더 구조는 변경의 영향 범위를 명확하게 보여주고, 코드 수정을 안전하게 만들어줍니다.

이 글에서는 폴더 구조에 대한 제 생각과 보편적으로 적용할 수 있는 핵심 원칙들을 공유합니다. 역할 중심, 기능 중심 같은 다양한 접근법이 있지만, 그 근간이 되는 원칙은 동일합니다.

## 왜 폴더 구조가 중요한가

### 변경 영향 범위를 파악하기 어려운 경험

초기 프로젝트에서 저는 컴포넌트를 수정할 때마다 불안했습니다. 이 컴포넌트가 어디서 사용되는지 정확히 알 수 없었기 때문입니다.

```tsx
// 이 컴포넌트를 수정하면 어디까지 영향을 줄까?
src/
├── components/
│   ├── UserProfile.tsx    // 전체 프로젝트에서 사용? 특정 페이지만?
│   ├── Button.tsx
│   └── Modal.tsx
```

`UserProfile.tsx`를 수정해야 할 때, 이것이 전체 프로젝트에서 공통으로 사용되는 컴포넌트인지, 아니면 특정 페이지에서만 사용되는 컴포넌트인지 파일 위치만으로는 알 수 없었습니다. 결국 IDE의 "Find Usages"로 일일이 확인해야 했고, 이는 개발 속도를 느리게 만들었습니다.

### 정의된 곳과 사용하는 곳의 거리

더 큰 문제는 컴포넌트가 정의된 곳과 실제로 사용되는 곳이 멀리 떨어져 있다는 점이었습니다.

```tsx
// 사용하는 곳 (pages/user/dashboard/DashboardPage.tsx)
import { UserStatsCard } from '@/components/UserStatsCard';

// 정의된 곳 (components/UserStatsCard.tsx)
// 실제로는 dashboard 페이지에서만 사용하는 컴포넌트인데
// components 최상위에 위치
```

`UserStatsCard`는 실제로 대시보드 페이지에서만 사용하는 컴포넌트였지만, `components/` 최상위에 있었습니다. 이런 구조에서는:

- 컴포넌트의 **사용 범위를 직관적으로 알 수 없습니다**
- 페이지를 삭제할 때 **관련 컴포넌트를 함께 지우기 어렵습니다**
- 코드 리뷰 시 **변경의 영향 범위를 판단하기 어렵습니다**

이런 경험을 통해 저는 폴더 구조가 단순한 정리의 문제가 아니라, **코드의 유지보수성과 변경 용이성에 직접적인 영향을 준다**는 것을 깨달았습니다.

## 핵심 원칙 1: 지역성(Locality)

### 사용하는 곳과 가장 가깝게

지역성 원칙은 간단합니다. **파일을 실제로 사용하는 곳과 가장 가까운 위치에 둡니다.**

```tsx
// ❌ 안 좋은 예: 모든 것을 최상위에
src/
├── components/
│   ├── DashboardStats.tsx      // dashboard에서만 사용
│   ├── UserProfile.tsx         // user 페이지에서만 사용
│   └── Button.tsx              // 전역에서 사용
└── pages/
    ├── dashboard/
    └── user/

// ✅ 좋은 예: 사용처 가까이
src/
├── components/
│   └── Button.tsx              // 전역 공통 컴포넌트만
└── pages/
    ├── dashboard/
    │   └── components/
    │       └── DashboardStats.tsx    // dashboard에서만 사용
    └── user/
        └── components/
            └── UserProfile.tsx       // user 페이지에서만 사용
```

이렇게 구성하면 **폴더 구조만 봐도 컴포넌트의 사용 범위를 즉시 파악**할 수 있습니다.

### 변경의 영향 범위가 명확해집니다

지역성을 지키면 코드 변경이 훨씬 안전해집니다.

```tsx
src/pages/dashboard/
├── components/
│   ├── DashboardStats.tsx
│   └── ActivityChart.tsx
├── hooks/
│   └── useDashboardData.ts
└── DashboardPage.tsx
```

`DashboardStats.tsx`를 수정할 때, 저는 이제 확신을 가질 수 있습니다. 이 컴포넌트는 `dashboard` 페이지 내에서만 사용되므로, **영향 범위가 dashboard 페이지로 제한**된다는 것을 폴더 구조가 보장해줍니다.

만약 dashboard 페이지 전체를 삭제해야 한다면? `pages/dashboard/` 폴더만 지우면 됩니다. 관련된 모든 파일이 한 곳에 모여 있기 때문입니다.

## 핵심 원칙 2: Page First

### 먼저 로컬에, 필요하면 상위로

Page First 규칙은 저의 개발 프로세스를 바꿨습니다. 이전에는 "이 컴포넌트가 재사용될 것 같은데?"라는 추측으로 처음부터 공통 폴더에 파일을 만들었습니다. 하지만 이는 종종 과도한 추상화로 이어졌습니다.

이제 저는 다음과 같은 순서로 작업합니다:

```tsx
// 1단계: 페이지 로컬에 먼저 만든다
src/pages/product-detail/
├── components/
│   └── PriceSection.tsx    // 여기서 시작
└── ProductDetailPage.tsx

// 2단계: 다른 페이지에서도 필요하면 그때 상위로 올린다
src/
├── components/
│   └── PriceSection.tsx    // 재사용이 확정되면 이동
└── pages/
    ├── product-detail/
    └── checkout/           // 여기서도 사용
```

### 실제 필요가 증명된 후에 추상화

저는 **실제로 두 번째 사용처가 생겼을 때** 공통 컴포넌트로 올립니다. 추측이 아닌 실제 필요를 기반으로 하는 것입니다.

이 접근법의 장점:
- **YAGNI 원칙**: "필요하지 않을 것 같으면 만들지 않는다"
- **과도한 추상화 방지**: 실제 사용 사례 없이 범용 컴포넌트를 만들지 않음
- **변경이 쉬움**: 로컬 컴포넌트는 해당 페이지만 고려하면 됨

## 역할 중심 vs 기능 중심

### 역할 중심의 한계

전통적인 역할 중심 구조는 간단하고 직관적입니다:

```tsx
src/
├── components/
├── hooks/
├── utils/
└── types/
```

하지만 프로젝트가 커지면서 저는 이 구조의 한계를 느꼈습니다:

```tsx
src/
├── components/
│   ├── auth/              // 100개 파일
│   ├── dashboard/         // 150개 파일
│   ├── settings/          // 80개 파일
│   └── ...               // 계속 늘어남
├── hooks/
│   ├── useAuth.ts
│   ├── useDashboard.ts
│   └── ...               // 관련 훅이 다른 폴더에
```

인증 관련 기능을 수정하려면 `components/auth/`, `hooks/`, `types/`, `utils/` 등 여러 폴더를 오가며 작업해야 했습니다.

### Page First 방식의 역할 중심

저는 역할 중심 구조를 완전히 버리지 않았습니다. 대신 **페이지 단위로 역할 중심 구조를 적용**합니다:

```tsx
src/pages/dashboard/
├── components/       // 역할별 분류 (페이지 레벨)
│   ├── Stats.tsx
│   └── Chart.tsx
├── hooks/           // 역할별 분류 (페이지 레벨)
│   └── useDashboardData.ts
├── types/           // 역할별 분류 (페이지 레벨)
│   └── dashboard.types.ts
└── DashboardPage.tsx
```

이렇게 하면:
- 관련 파일들이 **한 곳에 모여 있어** 찾기 쉽습니다
- 각 폴더의 크기가 **관리 가능한 수준**으로 유지됩니다
- 페이지 단위로 **독립적인 개발**이 가능합니다

## 기본 디렉토리 컨벤션

### 전역 vs 로컬

저는 다음과 같은 기준으로 파일 위치를 결정합니다:

```tsx
src/
├── components/       // 전역: 도메인 모르는 범용 UI
│   ├── Button/
│   ├── Modal/
│   └── Input/
│
├── utils/           // 전역: 도메인 모르는 순수 함수
│   ├── date.ts
│   └── format.ts
│
└── pages/           // 로컬: 페이지별 모든 것
    └── dashboard/
        ├── components/    // 이 페이지 전용 UI
        ├── hooks/         // 이 페이지 전용 로직
        ├── types/         // 이 페이지 전용 타입
        └── utils/         // 이 페이지 전용 헬퍼
```

**전역 폴더의 기준**:
- **도메인을 모르는** 범용 컴포넌트/유틸
- Button, Modal 같은 컴포넌트는 "사용자", "상품" 같은 도메인 개념을 모름
- `formatDate`, `debounce` 같은 함수는 비즈니스 로직을 모름

**로컬 폴더의 기준**:
- 특정 페이지나 기능에서만 사용
- 도메인 지식이 들어간 컴포넌트/로직

### 모노레포 환경

모노레포를 사용한다면 한 단계 더 올라갑니다:

```tsx
pnpm-workspace/
├── packages/          // 서비스 간 공통
│   └── ui/           // 공통 UI 컴포넌트
│       ├── Button/
│       └── Modal/
│
└── services/
    ├── admin/
    │   └── src/
    │       ├── components/    // admin 서비스 전역
    │       └── pages/         // 페이지 로컬
    │
    └── agency/
        └── src/
            ├── components/    // agency 서비스 전역
            └── pages/         // 페이지 로컬
```

저는 실제로 이런 구조를 운영하면서:
- `packages/`에는 **여러 서비스에서 공유**하는 것만
- 각 서비스의 `components/`에는 **해당 서비스 전역**에서 사용
- `pages/`에는 **해당 페이지만** 사용

이렇게 세 단계로 범위를 나눕니다.

## 실전 적용 예시

### 새 페이지 개발하기

실제로 새 페이지를 만들 때 저의 작업 흐름입니다:

```tsx
// 1단계: 페이지 폴더 생성
src/pages/order-history/
└── OrderHistoryPage.tsx

// 2단계: 필요한 컴포넌트를 로컬에 만들기
src/pages/order-history/
├── components/
│   ├── OrderList.tsx
│   └── OrderItem.tsx
└── OrderHistoryPage.tsx

// 3단계: 훅이나 유틸이 필요하면 추가
src/pages/order-history/
├── components/
│   ├── OrderList.tsx
│   └── OrderItem.tsx
├── hooks/
│   └── useOrderHistory.ts
└── OrderHistoryPage.tsx

// 4단계: 다른 페이지에서 재사용이 필요하면 그때 상위로
src/
├── components/
│   └── OrderItem.tsx        // 여러 곳에서 사용해서 이동
└── pages/
    ├── order-history/
    │   ├── components/
    │   │   └── OrderList.tsx
    │   └── hooks/
    │       └── useOrderHistory.ts
    └── order-detail/         // 여기서도 OrderItem 사용
```

### 컴포넌트를 상위로 올릴 때

컴포넌트를 상위로 올릴 때 제가 확인하는 것들:

1. **실제로 두 곳 이상에서 사용되는가?** (추측이 아닌 실제)
2. **도메인 지식을 제거할 수 있는가?** (범용적으로 만들 수 있는가)
3. **API가 명확한가?** (props가 잘 정의되어 있는가)

이 세 가지 중 하나라도 확실하지 않으면, 저는 아직 올리지 않습니다.

## 마치며

폴더 구조의 핵심 원칙은 결국 **변경을 쉽게 만드는 것**입니다. 

- **지역성**: 사용하는 곳과 가깝게 두어 영향 범위를 명확히
- **Page First**: 먼저 로컬에, 필요하면 상위로
- **역할 중심을 페이지 단위로**: 관리 가능한 크기 유지

저는 이 원칙들을 따르면서 코드 수정이 훨씬 자신감 있어졌습니다. 파일의 위치가 그 자체로 사용 범위를 설명해주기 때문입니다.

이런 원칙들을 바탕으로 다양한 구조적 접근법이 있습니다. **역할 중심과 Page First를 조합한 Feature 기반 구조**, 또는 **레이어 기반으로 더 체계화한 FSD(Feature-Sliced Design)** 같은 방법론들이 있죠. 중요한 것은 원칙을 이해하고, 프로젝트에 맞는 방법을 선택하는 것입니다.
