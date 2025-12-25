---
title: 코드 철학
description: 변경에 용이한 코드 작성을 위한 코드 철학
outline: 2
draft: true
todo: 
 - 1차 초안 완성 (글 가독성 신경쓰기)
 - 글 다듬기?
---

# 변경에 용이한 프론트엔드 코드

## 서론

소프트웨어는 계속 변합니다.  
기획이 바뀌고, 요구사항이 추가되고, 버그를 수정합니다.

그래서 저는 좋은 코드는 변경에 용이한 코드라고 생각하고, **유지보수가 좋은 코드란 변경에 용이한 코드**라고 생각합니다.

그리고 변경에 용이한 코드를 만들기 위해 SOLID, SRP, 디자인 패턴과 같은 소프트웨어 개발 원칙과 방법론이 등장했다고 봅니다.

## 1. 변경 용이성 (최상위 원칙)

### 개념

한 가지 변경은 한 곳에서만

### 핵심

코드를 작성하다 보면 같은 정보가 여러 곳에 흩어지는 경우가 많습니다. 예를 들어 API URL이 `/user/detail/:id`에서 `/users/:id`로 변경된다면, 이 URL을 사용하는 모든 곳을 찾아서 수정해야 합니다.

만약 3곳에서 사용했다면 3곳을 모두 수정해야 하고, 하나라도 놓치면 버그가 발생하죠.

저는 좋은 코드는 **한 가지 변경 사항이 한 곳에서만 수정되면 끝나야 한다**고 생각합니다. 즉, 동일한 변경은 한 파일(혹은 한 모듈)에서 완료되어야 합니다.

### 예시

```tsx
// ❌ URL 변경 시 3곳 모두 수정
<Link to="/user/detail/123">상세보기</Link>
<Link to="/user/detail/456">편집</Link>
navigate(`/user/detail/${id}`)

// ✅ routes/paths.ts 한 곳만 수정
// routes/paths.ts
export const ROUTES = {
  userDetail: (id: string) => `/user/detail/${id}`,
}

<Link to={ROUTES.userDetail('123')}>상세보기</Link>
<Link to={ROUTES.userDetail('456')}>편집</Link>
navigate(ROUTES.userDetail(id))
```

---

## 2. SSOT (Single Source of Truth)

### 개념

정보의 단일 출처. 정의는 한 곳, 사용은 여러 곳.

### 핵심

유지보수가 좋은 것은 "변경에 용이한 코드"라고 생각하고, 변경에 용이하기 위해 단일 진실 원천을 사용한다고 생각합니다.

왜냐하면 변경이 필요할 때 여러 곳을 수정해야 하면 해당 부분을 찾아서 변경해야 하는데, 코드가 커지면 커질수록 복잡해지고 휴먼 에러가 발생할 수 있기 때문이죠.

저는 이런 관점을 "정의하는 부분"과 "사용처"로 보고 있습니다.

즉, 여러 사용처에서 정의해서 사용하는 것보다 정의는 한 곳에서 하고 사용처에서 정의한 것을 가져다 쓰는 거죠! 그럼 변경이 일어났을 때 정의한 곳만 변경하면, 사용처가 몇 개가 됐든 한 곳만 수정할 수 있습니다.

그럼 이는 단일 책임 원칙과 같은 룰도 지킬 수 있습니다.

단일 책임 원칙을 '하나의 책임을 하도록 한다'라고 생각할 수도 있는데, 이 하나의 책임이 구현할 때마다 애매해서, 저는 단일 책임 원칙을 '변경할 곳이 한 곳'이다 라는 관점도 추가적으로 생각합니다.

**적용 대상:** routes, tokens, queryKeys, schema, API 엔드포인트 등을 중앙화하고, 사용처는 읽기 전용으로 유지합니다.

### 예시

```tsx
// ❌ API 엔드포인트가 여러 곳에 흩어짐
fetch('/api/users')
fetch('/api/users')
axios.get('/api/users')

// ✅ API 정의를 한 곳에서 관리
// api/endpoints.ts
export const API = {
  users: {
    list: () => '/api/users',
    detail: (id: string) => `/api/users/${id}`,
  },
}

// 사용처
fetch(API.users.list())
fetch(API.users.list())
axios.get(API.users.detail('123'))
```

---

## 3. SRP (단일 책임 원칙)

### 개념

Single Responsibility Principle. 모듈은 한 가지 변경 이유만 갖는다.

### 핵심

컴포넌트나 함수를 작성하다 보면 여러 기능이 한 곳에 섞이는 경우가 많습니다. 예를 들어 한 컴포넌트에서 데이터를 가져오고, 로딩을 처리하고, UI를 렌더링하는 경우죠.

이렇게 되면 변경 이유가 3가지가 됩니다:
- 데이터 페칭 로직이 바뀌면?
- 로딩 UI가 바뀌면?
- 화면 레이아웃이 바뀌면?

각각의 변경이 모두 이 컴포넌트를 수정하게 만듭니다.

저는 **SRP를 "하나의 책임"보다는 "변경 지점이 한 곳인가?"로 판단**합니다. 만약 여러 이유로 코드를 수정해야 한다면, 그것은 여러 책임을 가진 것이라고 봅니다.

### 예시

```tsx
// ❌ 3가지 변경 이유: 데이터 페칭, 로딩 처리, UI
function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch('/api/user').then(setUser);
    setLoading(false);
  }, []);
  
  if (loading) return <Spinner />;
  return <div>{user?.name}</div>;
}

// ✅ 단일 책임: UI만 담당
function UserProfile({ user }) {
  return <div>{user.name}</div>;
}

// 데이터와 로딩은 상위에서 처리
function UserProfileContainer() {
  const { data: user, isLoading } = useQuery(...);
  
  if (isLoading) return <Spinner />;
  return <UserProfile user={user} />;
}
```

---

## 4. 응집도↑ 결합도↓ + 관심사의 분리

### 개념

- **응집도(Cohesion)**: 함께 바뀌는 것끼리 얼마나 가까이 있는가
- **결합도(Coupling)**: 다른 모듈에 얼마나 의존하는가
- **SoC(Separation of Concerns)**: 서로 다른 관심사는 분리

### 핵심

코드를 작성하다 보면 관련된 파일들이 여러 폴더에 흩어지는 경우가 많습니다.

UserProfile을 수정하려면 `components/`, `hooks/`, `types/`, `constants/` 폴더를 계속 왔다갔다 해야 합니다. 이것을 "시점 이동" 또는 "컨텍스트 스위칭"이라고 하는데, 이런 시점 이동이 많아질수록 코드를 이해하고 수정하는 데 더 많은 시간이 걸립니다.

저는 **함께 바뀌는 것끼리 가까이 두고(응집도↑), 서로 다른 관심사는 분리(SoC)하며, 외부 의존을 최소화(결합도↓)** 하는 것이 중요하다고 생각합니다.

재사용되지 않거나 중복되지 않으면 같은 파일 내에 정의하는 것을 최우선으로 합니다.

**가이드**: 기능이나 변경 축을 기준으로 파일과 폴더를 묶고, 외부에 공개하는 표면은 최소화합니다.

### 예시

**폴더 구조 (응집도)**

```tsx
// ❌ 낮은 응집도: 4개 폴더를 왔다갔다
src/
  components/UserProfile.tsx
  hooks/useUser.ts
  types/user.ts
  constants/user.ts

// ✅ 높은 응집도: 한 폴더에서 완결
src/
  features/user/
    UserProfile.tsx
    hooks.ts
    types.ts
    constants.ts
```

**관심사 분리 (SoC)**

```tsx
// ❌ UI와 비즈니스 로직이 섞임
function UserProfile() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch('/api/user').then(setUser);
  }, []);
  
  const isAdult = user?.age >= 18; // 비즈니스 로직
  
  return <div>{user?.name}</div>; // UI
}

// ✅ 관심사 분리
function UserProfile({ user, isAdult }) {
  return <div>{user.name}</div>; // UI만
}

function useUserData() {
  const user = useQuery(...);
  const isAdult = user?.age >= 18; // 비즈니스 로직
  return { user, isAdult };
}
```

---

## 5. 추상화

### 개념

세부 구현을 감추고 핵심 개념만 드러냅니다.

### 핵심

함수나 모듈을 작성하다 보면 추상화 레벨이 섞이는 경우가 많습니다.

예를 들어 한 함수에서 "주문 처리"라는 높은 레벨의 개념과 "가격 * 수량"이라는 낮은 레벨의 세부 구현이 함께 있으면, 코드를 읽을 때 계속 레벨을 오르내려야 해서 이해하기 어렵습니다.

저는 **한 함수 안에는 같은 추상화 레벨만 유지하고, 세부 절차는 아래로 위임**하는 것이 중요하다고 생각합니다.

하지만 여기서 주의할 점은 **과한 추상화**입니다. 아직 패턴이 명확하지 않은데 "나중을 위해" 미리 추상화하면 오히려 복잡도만 증가합니다. 추상화는 패턴이 2-3번 반복되고 변경 지점이 명확해졌을 때 하는 것이 좋습니다.

**가이드:**
- 비즈니스 계층: What(무엇을) 중심
- 인프라 계층: How(어떻게)가 적합할 수 있음
- 경계는 필요 시 인터페이스로 추상화
- 이른 일반화 금지 (2-3번 반복 후 추상화)

### 예시

**추상화 레벨 일치**

```tsx
// ❌ 레벨 혼재: 고수준(주문)과 저수준(계산)이 섞임
async function processOrder(id) {
  const product = await fetchProduct(id);
  const price = product.price * product.quantity; // 저수준
  const discounted = price * (1 - product.discount); // 저수준
  const tax = discounted * 0.1; // 저수준
  await saveDB({ id, total: discounted + tax });
  return total;
}

// ✅ 같은 레벨 유지: 모두 고수준 단계
async function processOrder(id) {
  const product = await loadProduct(id);
  const total = calculateTotal(product);
  await saveOrder(product, total);
  return total;
}
```

**과한 추상화 주의**

```tsx
// ❌ 이른 추상화: 아직 패턴이 명확하지 않음
interface DataFetcher<T> {
  fetch(): Promise<T>;
}
class UserDataFetcher implements DataFetcher<User> { ... }
// 복잡도만 증가

// ✅ 필요할 때 추상화: 지금은 구체적으로
async function fetchUser() {
  return fetch('/api/user').then(res => res.json());
}
// 나중에 패턴이 명확해지면 그때 추상화
```

---

## 6. 선언적 프로그래밍

### 개념

What(무엇을)을 선언하고, How(어떻게)는 하위로 위임합니다.

### 핵심

절차적 프로그래밍은 시간 흐름에 따라 "어떻게 해야 하는가"에 초점이 있다면, 선언적 프로그래밍은 "무엇을 수행하는지" 관계를 정의한다고 생각합니다.

그래서 선언적 코드는 "무엇을" 수행하는지에 대한 부분만 보이고, "어떻게" 하는지는 추상화되어 있어서 가독성이 좋고 인지할 요소가 적습니다.

예를 들면 Suspense와 ErrorBoundary를 들 수 있는데, 이를 활용하지 않으면 컴포넌트 내부에서 에러 핸들링과 로딩 핸들링을 직접 처리해야 합니다.

하지만 선언적으로 작성하면 API 로딩은 Suspense에 위임하고, 에러 관련된 것은 ErrorBoundary에 위임해서 컴포넌트는 해당 컴포넌트의 책임만 질 수 있어 단일 책임 원칙을 지킬 수 있고 명확성도 올라간다고 생각합니다.

**효과**: 사람이 인지해야 할 요소가 줄어 가독성과 변경 용이성이 올라갑니다.

**참고**: 비즈니스 로직 레벨에서는 선언적일 수 있고, 인프라/저수준 구현 레벨에서는 절차적이어도 괜찮습니다.

### 예시

```tsx
// ❌ 절차적(How): 로딩/에러를 직접 처리
function UserProfile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage />;
  return <div>{user.name}</div>;
}

// ✅ 선언적(What): 데이터만 처리, 로딩/에러는 위임
function UserProfile() {
  const { data: user } = useSuspenseQuery(...);
  return <div>{user.name}</div>;
}

// 로딩은 Suspense, 에러는 ErrorBoundary, 데이터 동기화는 Query가 담당
// 컴포넌트는 "상태→뷰 매핑"에만 집중
<ErrorBoundary fallback={<ErrorMessage />}>
  <Suspense fallback={<Spinner />}>
    <UserProfile />
  </Suspense>
</ErrorBoundary>
```

---

## 7. 가독성

### 개념

코드는 읽히는 문서입니다.

### 핵심

많은 사람들이 가독성을 "깔끔함" 또는 "짧은 코드"로 생각하는데, 저는 다르게 봅니다.

저는 가독성이 좋은 코드란 **의도가 명확하고 원하는 로직을 빠르게 찾을 수 있는 코드**라고 정의합니다.

짧다고 무조건 좋은 것이 아니라, 변수명과 함수명이 의도를 드러내고, 위에서 아래로 자연스럽게 흐름이 읽히며, 조기 반환을 통해 예외 케이스를 먼저 처리하는 것이 중요합니다.

### 예시

```tsx
// ❌ 의도 불명확
function calc(u) {
  const p = u.price * u.qty;
  const d = p * 0.1;
  return p - d;
}

// ✅ 의도 명확
function calculateTotalPrice(user) {
  const basePrice = user.price * user.quantity;
  const discount = basePrice * 0.1;
  return basePrice - discount;
}
```

---

## 8. 의존성

### 개념

필요할 때만 경계를 추상화합니다.

### 핵심

의존성 역전 원칙(DIP)이나 Port-Adapter 패턴은 강력하지만, 초기부터 과하게 레이어링하면 오히려 복잡도만 증가합니다.

저는 **지금 필요한 최소한만** 추상화하고, 실제로 교체가 필요해지거나 테스트가 어려울 때 그때 경계를 추상화하는 것이 좋다고 봅니다.

**실제 경험**:

form field 안에 `useFormContext`를 주입하면 react-hook-form에 의존적이 됩니다. 따라서 해당 필드에 `onSelect` prop으로 주입해서 form에 의존적이지 않고 확장 가능하게 관리할 수 있습니다.

### 예시

```tsx
// ❌ react-hook-form에 의존적
function FormField({ name }) {
  const { register } = useFormContext();
  return <input {...register(name)} />;
}
// form 라이브러리 변경 시 모든 Field 수정 필요

// ✅ onSelect prop으로 주입: form에 의존적이지 않고 확장 가능
function FormField({ value, onSelect }) {
  return <input value={value} onChange={(e) => onSelect(e.target.value)} />;
}

function UserForm() {
  const { watch, setValue } = useFormContext();
  return (
    <FormField
      value={watch('email')}
      onSelect={(v) => setValue('email', v)}
    />
  );
}
```