---
title: 프론트엔드 코드 철학
description: 우리가 코드를 짤 때 공유하는 사고방식 — 변경에 용이한 코드
outline: [2, 3]
---

# 프론트엔드 코드 철학

여기 나오는 원칙들은 서로 연결되어 있고, 때로는 충돌합니다. 응집도를 높이려다 SRP를 위반할 수 있고, 추상화를 하려다 가독성이 떨어질 수 있죠. 그래서 우리는 원칙들이 충돌할 때 **"변경에 용이한가?"** 를 판단 기준으로 삼습니다.

## 이 문서 읽는 법

주제별로 묶었습니다. 한 원칙 안에 "개념 + 코드 예제 + do/don't"가 함께 있고, 위에서 아래로 읽으면 됩니다.


| 파트           | 무엇               | 언제 보나           |
| ------------ | ---------------- | --------------- |
| **0. 개요**    | 핵심 요약 (TL;DR)    | 5분 안에 요점만       |
| **1. 큰 그림**  | "좋은 코드란?" 토대     | 왜 이렇게 짜야 하는지    |
| **2. 핵심 원칙** | 실제로 따르는 원칙들      | 코드 짜고 리뷰할 때     |
| **3. 실전**    | 원칙을 한 흐름에 적용한 예제 | 손으로 따라가 보고 싶을 때 |
| **부록**       | 범용 레퍼런스·리뷰 패턴    | 더 깊이            |


---



## 0. 개요

- **좋은 코드 = 변경에 용이한 코드.** 소프트웨어는 계속 바뀌니, 같은 변경이 **한 곳에서 끝나는(수정 표면적 = 1)** 코드가 좋습니다.
- **그 핵심 도구는 추상화** — 복잡한 세부(How)를 숨기고 "무엇을 하는지(What)"만 드러내기. 코드가 복잡한 건 라이브러리를 몰라서가 아니라 충분히 추상화하지 못해서입니다.


| 복잡할 때 ❌ 이렇게 묻지 말고          | ✅ 이렇게 물어라          |
| -------------------------- | ------------------ |
| 복잡해... TanStack Query 써볼까? | 복잡해... 고객 언어로 읽히나? |
| 복잡해... Zustand 도입할까?       | 복잡해... 요구사항이 보이나?  |
| 복잡해... 디자인 패턴 추가할까?        | 복잡해... What이 드러나나? |


**추상화를 잘하는 4가지 방법 (태도)** — 하나의 태도(Bottom-up으로 본질 찾기)의 네 측면입니다.


| 방법             | 의미        | 한 줄                         |
| -------------- | --------- | --------------------------- |
| **안에서 밖으로**    | Bottom-up | 리프(가장 작은 단위)부터 점진적으로 확장     |
| **리프부터**       | 태도의 출발점   | 가장 작은 것부터 보고, 연관되면 뭉친다      |
| **UI와 1:1 대응** | 코드 = 기획서  | 화면에 보이는 덩어리가 코드에서도 한 덩어리    |
| **분리하지 마**     | 섣부른 분리 금지 | 시점이동 비용이 크다. 본질이 드러날 때까지 참기 |


**5가지 핵심 인사이트**

1. **복잡함의 진짜 원인** — 툴을 몰라서가 아니라 고객 언어로 추상화하지 못해서입니다.
2. **본질 찾기** — leaf node부터 what을 하나씩 추상화하면 전체 본질은 자연스럽게 드러납니다.
3. **인터페이스의 의미** — props는 데이터 통로(❌)가 아니라 함수의 역할을 드러내는 인터페이스(✅)입니다.
4. **분리의 비용** — 분리는 정말 큰 비용입니다. 무지성 커스텀 훅은 책임 없는 쾌락입니다.
5. **훈련 vs 구매** — 필요한 건 "훈련"이지 "구매"가 아닙니다. Just Do It.

---



## 1. 큰 그림 — 좋은 코드란?

소프트웨어는 계속 변합니다. 기획이 바뀌고, 요구사항이 추가되고, 버그를 수정하죠. 그래서 우리는 **좋은 코드는 변경에 용이한 코드**라고 봅니다. SOLID·SRP·디자인 패턴 같은 원칙과 방법론이 등장한 것도 전부 이 "변경 용이성"을 위해서입니다.

구체적으로는 **같은 변경이 한 파일(한 모듈)에서 끝나는 것** 입니다 — 수정 표면적 = 1. 같은 정보가 여러 곳에 흩어지면 하나가 바뀔 때 그 모두를 찾아 고쳐야 하고, 하나라도 놓치면 버그가 됩니다.

- 변경의 단위를 누가 정하나? 개발자가 아니라 **비즈니스/UI** 가 정합니다.
- 기획서의 "이것만 바꿔주세요"의 "이것"이 코드에서도 하나의 단위여야 합니다.

이 목표를 이루는 두 축이 아래 **인지 부하 낮추기(1.1)** 와 **추상화(1.2)** 이고, 그걸 코드로 실천하는 구체 원칙이 2장입니다.

### 1.1 인지 부하를 낮춰라

사람이 동시에 다룰 수 있는 정보 폭은 **7±2**로 제한됩니다(밀러의 법칙). 좋은 코드는 인지 부하를 최소화해 **글처럼 위에서 아래로 읽히는** 코드입니다.

코드를 읽을 때마다 머릿속에 담아야 할 맥락이 적을수록 좋습니다. 한 화면에서 이해되고, 다른 파일로 점프(시점 이동)하지 않아도 흐름이 보여야 합니다.


| 제한     | 기준             |
| ------ | -------------- |
| 함수 길이  | ≤ 30줄          |
| 파라미터 수 | ≤ 3개 (넘으면 객체로) |
| 분기 깊이  | ≤ 3단계          |




### 1.2 추상화 = 본질만 남기기

**정의.** 추상화 = 복잡한 세부(How)를 숨기고 **"무엇을 하는지(What)"만 드러내는 것.** 변수명·함수명·컴포넌트 등 코드 모든 곳에서 일어납니다.


| 구분  | 설명            | 예시                           |
| --- | ------------- | ---------------------------- |
| 구체화 | How — 어떻게 구현  | `min < value && value < max` |
| 추상화 | What — 무엇을 표현 | `isInRange(value, min, max)` |


> 달을 가리키는 손가락이 아니라 달을 보세요. 세부(손가락)가 아니라 본질(달)을 남기는 것.

**왜 중요한가.** 잘 된 추상화는 **좋은 인터페이스로 드러납니다** — 내부 구현을 안 읽어도 이름·props·인자만 보고 "무엇을 하는지" 짐작되죠. 세부를 몰라도 되니 인지할 내용이 줄고, 인지 부하(1.1)가 낮아집니다.

#### 추상화하는 법: 안에서 밖으로 (Bottom-up)

리프(가장 작은 단위)부터 시작해 점진적으로 확장합니다. 밖에서 안으로(구조 먼저 정하고 끼워맞추기)가 아니라, **본질을 중심에 두고 부가적인 것을 밖으로 넓혀갑니다(안 → 밖).** 말로 "무엇을 하는지" 설명되면 그게 추상화 포인트입니다.

1. **펼치기** — 이래도 되나 싶을 정도로 펼칩니다. 패턴을 알기 전에 분리하면 궁극의 추상화에 못 갑니다.
2. **관찰 & 응집도** — 복잡한 부분을 더 바라보고, 응집도를 높여 의도를 파악하면 도메인끼리 자연스럽게 뭉칩니다.
3. **본질 찾기** — "누구냐 넌?" (참기름의 본질은 → **고소함**). leaf부터 what을 하나씩 추상화하면 전체 본질은 자연히 드러납니다.
4. **What 중심 표현** — 어떻게 구현할지(How)가 아니라 기획문서의 문장(What)으로 표현합니다. 거대 함수는 **명명된 단계**로 쪼개 선언적 흐름으로.

```tsx
// Before — 하나의 함수에 로직 과밀
async function settle(productId: string) {
  const p = await fetchProduct(productId);
  const price = calcPrice(p);
  const withDiscount = applyDiscount(price, p.tags);
  await saveDB({ id: p.id, price: withDiscount });
  return withDiscount;
}

// After — 단계가 이름으로 드러나는 선언적 파이프라인
export async function settle(id: string) {
  const p = await load(id);
  const total = applyDiscount(price(p), p.tags);
  await persist(p, total);
  return total;  // 위→아래로 자연스럽게 읽힘
}

const load = (id: string) => fetchProduct(id);
const price = (p: Product) => calculatePrice(p);
const persist = (p: Product, total: number) => saveDB({ id: p.id, price: total });
```

> **분리하지 마! 300번 말해도 분리한다. 분리하면 200원!** 흩어져 있으면 인지 부하 — 뭉치고, 정말 필요할 때만 나눕니다.



#### 얼마나 추상화할까 (레벨/추상화 계층)

> 소를 그리고 점점 디테일을 지우며, 남기고 싶은 개념만 남깁니다. 정답은 없습니다.

```jsx
// Level 0 — 제로부터 디테일하게
<Button onClick={showConfirm}>전송</Button>
{isShowConfirm && <Confirm onClick={() => showMessage("성공")} />}

// Level 1
<ConfirmButton onConfirm={() => showMessage("성공")}>전송</ConfirmButton>

// Level 2
<ConfirmButton message="성공">전송</ConfirmButton>

// Level 3 — 모든 기능을 이름 아래 추상화
<ConfirmButton />
```

- 너무 많이 추상화하면 내부를 열어야 이해됩니다. 컴포넌트와 props가 함께 있어야 이해가 쉽다면 그 수준이 낫습니다.
- **추상화 수준이 섞이면 파악이 어렵습니다.** 비슷한 수준으로 맞추세요.
- **과한 추상화 주의(YAGNI)**: 패턴이 명확하지 않은데 "나중을 위해" 미리 추상화하면 복잡도만 늘어납니다. 2~3번 반복되고 변경 지점이 분명해졌을 때 하세요.

> **컴포넌트 정의 순서** — 파일 첫 화면에 ① import ② hook ③ 데이터 패칭 ④ return(JSX) 순으로 둡니다.

---



## 2. 핵심 원칙

실제로 코드를 짜고 리뷰할 때 따르는 원칙입니다.

### 2.1 분리하지 마 · 뭉쳐라

> **분리는 정말 큰 비용입니다.** 파일을 열고(물리적), 컨텍스트를 복구하고(인지적), 함수가 뭘 반환하는지 확인하는(탐색) **시점이동 비용**이 듭니다. 분리 그 자체는 아무것도 해결하지 않습니다.

관련된 파일들이 여러 폴더에 흩어지면, 하나를 수정하려고 `components/`, `hooks/`, `types/`, `constants/`를 계속 왔다갔다 해야 합니다. 이 "시점 이동(컨텍스트 스위칭)"이 많아질수록 이해하고 수정하는 데 더 오래 걸립니다.

**분리해도 되는 기준**: (1) 재사용되거나 (2) 복잡한 로직이 추상화되어 읽기 쉬워질 때. 그 외에는 인라인이 낫습니다.

#### 함께 바뀌는 것끼리 가까이 (응집도 ↑ 결합도 ↓)

> **ABAB → AABB.** 서로 다른 관심사(A·B)가 번갈아 흩어지면(ABAB), 같은 것끼리 붙여 모읍니다(AABB).

```tsx
// ❌ ABAB — 월 선택(A)과 조회(B)가 번갈아 흩어짐
const [month, setMonth] = useState(new Date());   // A: 월 선택
const { data } = useQuery(monthQuery(month));      // B: 조회
const goPrevMonth = () => setMonth(prev(month));   // A: 월 선택
const isError = !!data?.error;                     // B: 조회

// ✅ AABB — A 다 모으고 B 다 모음. 관심사 경계가 눈에 보임
const [month, setMonth] = useState(new Date());   // A
const goPrevMonth = () => setMonth(prev(month));   // A
const { data } = useQuery(monthQuery(month));      // B
const isError = !!data?.error;                     // B
```



#### 무지성 커스텀 훅 = 분리일 뿐 추상화가 아님

> 기능을 다 구현한 뒤 "코드가 지저분하네" 하며 로직을 훅으로 빼지만, **사용처만 깔끔해질 뿐 훅 내부의 복잡함은 그대로**입니다. 복잡함을 없앤 게 아니라 다른 파일로 옮긴 것뿐이죠. 게다가 사용처에선 동작이 안 보이고, 수정하려면 훅 파일을 열어야 합니다(시점 이동).

```tsx
// ✅ 인라인 — 사용처에서 바로 보임
function OrderTabContent({ orderNo }: Props) {
  const urgentMutation = useMutation(funnelDetailMutations.urgent());
  const handleUrgentToggle = async () => {
    overlay.open(({ isOpen, close }) => (
      <AlertDialog onConfirm={async () => { await urgentMutation.mutateAsync(...); close(); }} />
    ));
  };
  return <Table.Toggle onChange={handleUrgentToggle} />;
}

// ❌ 커스텀 훅으로 추출 — 로직·UI가 숨겨짐
function useUrgentToggle(orderNo: string) {
  const mutation = useMutation(...);
  const handleToggle = async () => { overlay.open(...) };
  return { handleUrgentToggle: handleToggle };
}
```



#### 이른 추출 3종 (지금 당장 재사용되는가? → 아니면 추출하지 마)

- **이른 파일 추출**: 한 곳에서만 쓰는 함수/상수를 별도 파일로 (X) → 재사용 전까지 같은 파일 (O) *— 응집도를 지키는 것*
- **이른 추상화**: 2~3곳 비슷하다고 바로 공통화 (X) → **"항상 함께 바뀌는가?" NO면 보류** (O)
  - 재사용 자체가 목표가 아닙니다. 지금 UI·로직이 같아 보여도 **기획 의도가 달라 따로 바뀔 수 있으면** 따로 정의해 두는 게 변경에 유리합니다.
- **성급한 상수 추출**: 하드코딩을 즉시 constants/로 (X) → 실제 재사용 시점까지 사용처에 (O)
  - 단, **의미를 알 수 없는 매직 넘버는 상수로** (`if (n > 3)` → `if (n > 최대_퀴즈_개수)`)



#### 1회용 + 이름이 필요할 때 → 기명 IIFE

한 번만 쓰는 로직이라도 이름이 필요하면, 파일 하단 함수로 빼지 말고 사용처에 기명 IIFE로 둡니다. 코드가 길어 시점 이동이 생기는 것보다, **사용처에 같이 두면 바로 읽히고** 가독성·인지 비용이 좋아집니다.

```tsx
// ✅ 인라인이면서 이름으로 의도 문서화
const viewState = (function getAttachmentViewState() {
  if (isDocumentAttachmentExpired) return '폐기';
  return match(documentTaskStatus)
    .with('진행중', '보완 요청', () => '편집_가능' as const)
    .otherwise(() => '조회_전용' as const);
})();

// ❌ 파일 하단에 함수 추출 — 1회 사용인데 시점이동 유발
const viewState = getAttachmentViewState(isDocumentAttachmentExpired, documentTaskStatus);
// ... 200줄 후 ... function getAttachmentViewState(...) { ... }
```

> 나중에 합치는 건 쉽고, 꼬인 걸 푸는 건 어렵습니다. 의심되면 합치지 말고 두세요.



### 2.2 인터페이스로 말하기

> **좋은 코드는 이름·props만 보고 동작을 짐작할 수 있어야 합니다.** 내부를 다 읽어야 이해된다면 인터페이스가 약한 것 — 짐작이 틀릴 때만 내부를 열게 만드는 게 목표입니다. (가독성 = 짐작 가능성.)



#### props = 역할을 드러내는 인터페이스 (데이터 통로가 아님)

```tsx
// ✅ 상위에서 행동 주입 — props가 역할을 드러냄
<SettlementTableRow
  settlementContent={content}
  onViewSheetClick={() => overlay.open(({ isOpen, close }) => (
    <SettlementSheetViewer contents={data.contents!} initialIndex={index} isOpen={isOpen} close={close} />
  ))}
/>

// ❌ 내부에서 쓸 데이터를 통째로 전달 — props가 데이터 파이프로 전락
<SettlementTableRow
  settlementContent={content}
  contents={data.contents!}   // 왜 전체 contents가 필요한지 안 보임
  index={index}               // 왜 index가 필요한지 안 보임
/>
```

파라미터만 봐도 뭘 하는지 짐작 가능해야 하고, 인자 순서가 의미를 못 주면 객체로 묶고, 반환값도 이름과 일치해야 합니다.

#### 뻔한 인터페이스 (최소 놀람의 원칙)

인터페이스가 뻔하면, 따로 인지할 것 없이 동작이 예상됩니다. HTML 네이티브에 가까울수록 놀랄 일이 없습니다.

```tsx
// ✅ HTML <select>와 동일한 멘탈 모델
<MonthSelector value={month} onChange={setMonth} />

// ❌ 처음 보는 인터페이스 — Props를 열어봐야 동작 파악
<NavigationSection currentMonth={month} setCurrentMonth={setMonth} goPrevMonth={...} goNextMonth={...} />
```

```tsx
// ✅ 호출처에 독립적 — "값이 변했음"만 전달
<DatePicker value={date} onChange={handleDateChange} />

// ❌ 호출처의 구현이 새어나옴 — "외부에 date 상태가 있다"가 노출
<DatePicker date={date} setDate={setDate} />
```

- HTML 네이티브 속성(`value`, `onChange`, `checked`, `disabled`)처럼 누구나 아는 패턴을 따릅니다.
- Primitive의 본래 인터페이스를 **유지한 채 도메인을 곱하는 것** 이지, 도메인으로 Primitive를 덮어씌우는 게 아닙니다.

> **모든 UI는 7개 HTML Primitive(button, input, select, form, a, textarea, label)의 조합입니다.** 요구사항은 발명이 아니라 primitive의 곱으로 환원됩니다.



#### UI와 코드 1:1 대응

코드와 UI가 1:1로 대응해야 합니다. **변경 단위 = UI 단위 = 코드 단위.**

```tsx
// ✅ 디자이너 사고방식 = 변경 단위. "카드만 버튼 추가" → CardConsumptionRow만 수정
<CardConsumptionRow />
<AccountConsumptionRow />
<EtcConsumptionRow />

// ❌ 천재적 추상화 — "카드만 버튼 추가" 시 분기 복잡도 증가
<StyledTextRow isExcluded={...} category={...} />
```

```tsx
// ✅ 요구사항이 코드에 그대로 보임. "일자별로 그루핑해서 출력"
const 일자별_그루핑 = groupByDate(consumptions);

// ❌ 요구사항이 로직에 묻힘
data.map(i => ({ date: new Date(i.ts).toISOString().split('T')[0], ...i })).reduce(...)
```

> **점검 3가지**: (1) 뻔한 Primitive 조립인가 (2) 고객 언어로 읽히는가 (3) 화면과 코드가 1:1인가. 비슷해 보여도 **변경 이유가 다르면 합치지 마세요** — 겉모습이 아니라 변경 단위로 나눕니다.



### 2.3 선언적으로 짜라

> "어떻게(How)"보다 "무엇을(What)"에 초점. 핵심 데이터만 전달받고 세부 구현은 뭉쳐 숨깁니다. **도구 사용 여부가 아니라 사고 방식입니다** — map/filter/JSX를 썼다고 자동으로 선언적인 건 아닙니다.

- **절차적**: "먼저 이걸 하고, 그 다음 저걸" — 시간 흐름·상태 변화에 집중
- **선언적**: "입력 → 출력", "이 관계가 있다" — 동작 간의 관계에 집중

```tsx
// 절차적
function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    if (item.quantity > 0) {
      let price = item.price * item.quantity;
      if (item.discount) price = price * (1 - item.discount);
      total += price;
    }
  }
  return total;
}

// 선언적
const calculateTotal = items =>
  items.filter(i => i.quantity > 0)
       .map(i => i.price * i.quantity * (1 - (i.discount || 0)))
       .reduce((a, b) => a + b, 0);
```

- **수학적 관점**: `f(x) = 2x + 1`은 'x와 f(x)의 관계'를 선언한 것이지 실행 명령이 아닙니다.
- **절대 구분은 아닙니다**: 비즈니스 로직은 선언적으로 쓰되, 저수준 인프라는 절차적이어도 괜찮습니다.



#### 로딩·에러는 위임하라 (What 선언, How 위임)

```tsx
// ✅ 선언적: 로딩·에러를 위임, 데이터만 처리
<ErrorBoundary fallback={<ErrorMessage />}>
  <Suspense fallback={<Spinner />}>
    <UserProfile />
  </Suspense>
</ErrorBoundary>
function UserProfile() {
  const { data } = useSuspenseQuery(...);
  return <div>{data.name}</div>;
}

// ❌ 절차적: 로딩·에러를 직접 처리
function UserProfile() {
  const { data, isLoading, error } = useQuery(...);
  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage />;
  return <div>{data.name}</div>;
}
```

로딩은 Suspense에, 에러는 ErrorBoundary에 위임하면 컴포넌트는 자신의 책임(상태→뷰 매핑)만 지므로 SRP를 지키고 명확성도 올라갑니다.

#### 상태와 값의 관계를 타입으로 선언하라 — 판별 유니온 ⭐

> **"이 상태에선 이 값이 있다"는 관계를** `if`**(런타임)가 아니라 타입(컴파일타임)으로 선언합니다.** boolean 여러 개(`isLoading`·`data`·`error`)로 표현하면 2³=8가지 조합이 생기고 다수는 **불가능한 모순 조합**(로딩 중인데 data도 error도 있음)이지만, 실제로 가능한 상태만 판별 유니온으로 열거하면 불가능한 조합은 아예 표현할 수 없고 각 상태를 빠짐없이 처리하게 됩니다.

```typescript
// ❌ 플래그 조합 — 모순 조합이 타입상 가능. if로 매번 수동 해석
{ data, isLoading, error }

// ✅ 판별 유니온 — status 판별자로 '실제 가능한 상태'만 열거
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Data }
  | { status: 'error'; error: Error };
// "성공이면 data가 반드시 있다"가 타입에 박힘. switch(status)로 분기, never로 누락 방지.
```



### 2.4 한 곳에서 정의하라 (SSOT · SRP)

> 정의는 한 곳, 사용처는 import/파생으로. **변경이 한 곳에서 끝나게(수정 표면적 = 1)** 하는 가장 직접적인 수단입니다.

같은 정보를 여러 곳에서 각자 정의하면, 변경 시 그 모두를 찾아 고쳐야 하고 코드가 커질수록 휴먼 에러가 납니다. 그래서 **정의는 한 곳(정의처)에서 하고, 사용처는 그것을 가져다 씁니다.** 그러면 사용처가 몇 개든 변경은 정의처 한 곳에서 끝납니다.

#### SSOT — 정의는 한 곳 (Single Source of Truth)

Props는 백엔드 응답(DTO) 타입에서 추출하고, 폼 타입은 Zod 스키마에서 `z.infer<>`로 파생합니다. 그러면 **백엔드가 바뀌면 타입 에러로 즉시 드러납니다.**

```typescript
// ✅ DTO(응답 타입)에서 직접 추출 → DTO만 수정하면 됨. 백엔드 변경을 컴파일 타임에 인지
interface Props {
  van: Van;
  vanSettings: NonNullable<MerchantDetail['vanSettings']>;
}

// ❌ Props 타입을 손으로 다시 정의 → DTO 변경 시 이 타입도 따로 찾아 고쳐야 함
interface Props {
  id: number;
  name: string;
  vanSettings: VanSetting[];
}
```



#### SRP — 변경 이유 하나 (Single Responsibility)

모듈은 한 가지 변경 이유만 가집니다. SRP는 먼저 **"책임이 하나인가?"** 로 보고, 추가로 **"변경 지점이 한 곳인가?"** 로도 봅니다. 여러 이유로 이 코드를 수정해야 한다면 여러 책임을 가진 것입니다.

**판단법: 이름·인자·반환만 보고 무엇을 하는지 짐작되면 책임이 하나입니다**(2.2 뻔한 인터페이스). 짐작이 안 되면 책임이 섞인 신호입니다.

```typescript
// ✅ 이름 = 책임 (각 훅이 하나의 관심사만) — 이름만으로 무엇을 하는지 보임
const { filters } = useSavingFilters();
const { selectedProduct, handleSelect } = useProductSelection();

// ❌ 이름은 "상품"인데 선택·필터까지 반환 — 이름만으론 뭘 하는지 예측 불가 = 책임 섞임
const { selectedProduct, handleSelectProduct, filterSavingsProducts } =
  useSavingsProducts(savingsProducts, monthlyPayment, term);
```



### 2.5 읽히게 짜라 (가독성)

많은 사람이 가독성을 "깔끔함"이나 "짧은 코드"로 생각하지만, 우리는 다르게 봅니다. 가독성 좋은 코드란 **의도가 명확하고 원하는 로직을 빠르게 찾을 수 있는 코드**입니다.

짧다고 무조건 좋은 게 아닙니다. 변수명·함수명이 의도를 드러내고, 위에서 아래로 자연스럽게 흐름이 읽히는 것이 중요합니다. 예외 케이스를 조기 반환(early return)으로 먼저 처리하면 핵심 로직에 집중할 수 있습니다.

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

> **우선순위 한 줄** — 원칙이 충돌하면 이 순서로 판단합니다.
> **변경 용이성 > 한 곳 정의(SSOT) > 분리하지 마 > 인터페이스 > UI 1:1 > 선언적.**

---



## 3. 실전 — 적금 계산기 리팩토링

> 기술 과제 예제입니다. [과제](https://github.com/toss-fe-interview/frontend-accelerator-5th-pre-course) , [미션 ,](https://tosspublic.notion.site/Growth-Track-Frontend-Developer-27c714bbfde78037a9b9e38c7870c658)  [내 풀이](https://github.com/toss-fe-interview/frontend-accelerator-5th-pre-course/pull/12)  
> **2. 핵심 원칙**(UI 1:1 · 분리의 비용 · Render Props · 펼치기→뭉치기)이 한 흐름으로 적용된 사례입니다.



### 1단계 — 페이지 구조를 UI와 1:1 대응

```tsx
// ❌ Before — 구조가 숨겨짐
<SavingFilterForm control={form.control} />                  // 입력 요소 숨김
<SavingsCalculatorContents targetAmount={...} term={...} />  // Tab 내용 숨김

// ✅ After — 입력 요소가 펼쳐져 label/placeholder로 역할이 드러남
<CurrencyTextField label="목표 금액" value={targetAmount} onChange={v => form.setValue('targetAmount', v)} />

<CurrencyTextField label="월 납입액" value={monthlyPayment} onChange={v => form.setValue('monthlyPayment', v)} />

<SelectTermField label="저축 기간" options={[{ value: 6, label: '6개월' }, { value: 12, label: '12개월' }]}
  value={term} onSelect={v => form.setValue('term', v)} />
```



### 2단계 — 입력 요소 인터페이스 설계 (펼치기 → 관찰 → 추상화)

```tsx
// CurrencyTextField — value/onChange로 제어, label/placeholder로 무엇인지 표현
type TextFieldProps = ComponentProps<typeof TextField>;
interface Props extends Omit<TextFieldProps, 'value' | 'onChange'> {
  value: number | null;
  onChange: (value: number | null) => void;
}

export function CurrencyTextField({ value, onChange, suffix = '원', ...props }: Props) {
  return (
    <TextField suffix={suffix} {...props}
      value={value ? formatCurrency(value) : ''}
      onChange={e => { const n = onlyNumbers(e.target.value); onChange(n ? Number(n) : null); }} />
  );
}
```

> 안에서 밖으로 작업하니, props가 데이터 전달용이 아닌 **UI와 1:1로 매칭하는 인터페이스** 가 됐습니다.



### 3~4단계 — 불필요한 계층 제거 + Render Props

```tsx
// ✅ Render Props — 로직은 내부에, 결과만 children으로. 페이지=What, 컴포넌트=How
<FilteredSavingsProducts savingsProducts={savingsProducts} filter={{ monthlyPayment, term }}>
  {_ => match(_)
    .with({ type: 'success' }, ({ products }) => products.map(p => <ProductItem {...p} />))
    .with({ type: 'empty' }, () => <ListRow ... top="조건에 맞는 상품이 없습니다." />)
    .exhaustive()}
</FilteredSavingsProducts>

export function FilteredSavingsProducts({ savingsProducts, filter, children }: Props) {
  const filtered = filterSavingsProducts(savingsProducts, filter);
  if (filtered.length === 0) return children({ type: 'empty' });
  return children({ type: 'success', products: filtered });
}
```



### 5단계 — 리프부터 추상화

```tsx
// 리프 — label과 금액 2개만 필요. props로 UI와 1:1 매핑
export function CalculationResultItem({ label, value }: { label: string; value: string }) {
  return (
    <ListRow contents={
      <ListRow.Texts type="2RowTypeA" top={label} bottom={value}
        bottomProps={{ fontWeight: 'bold', color: colors.blue600 }} />
    } />
  );
}
```



### 핵심 교훈

1. **펼치기** — 숨겨진 것을 펼쳐 전체를 보기
2. **UI와 1:1 매핑** — 코드를 읽으면 UI가 그려지도록
3. **안에서 밖으로** — 리프부터 점진적 확장
4. **분리하지 마** — 정말 필요한 추상화만
5. **Render Props** — What과 How의 분리

---



## 부록



### A. 범용 원칙 레퍼런스

> 아래는 검색하면 나오는 교과서 지식이라 본문에서 깊게 다루지 않았습니다. 본문 원칙과 어떻게 연결되는지만 매핑해 둡니다.



#### SOLID

**S — 단일 책임 (SRP)**: 하나의 컴포넌트/모듈은 하나의 책임(변경 이유)만. → 본문 **2.4**

```jsx
// ❌ 여러 책임 (표시 + 편집 상태 + 제출)
function UserProfile({ user, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const handleSubmit = async (data) => { await updateUserData(data); setIsEditing(false); }
  return <div>{isEditing ? <UserForm .../> : <UserInfo .../>}</div>;
}
// ✅ 책임 분리
function UserProfile({ user }) { return <UserInfo user={user} />; }
function EditableUserProfile({ user, onUpdate }) { /* 편집 상태만 담당 */ }
```

**O — 개방-폐쇄 (OCP)**: 기능을 추가할 때 기존 코드를 고치지 않는 구조가 이상적입니다. 확장(새 동작 추가)에는 열고, 수정(기존 코드 변경)에는 닫습니다. 완전히 안 고칠 순 없어도 **변경 범위를 최소화**하는 게 목표입니다.

```jsx
// ❌ variant가 늘 때마다 컴포넌트 본체(if)를 수정 (수정에 열림)
function Button({ variant, children }) {
  if (variant === 'primary') return <button className="primary">{children}</button>;
  if (variant === 'danger') return <button className="danger">{children}</button>;
  // variant 추가 = 이 함수를 또 고쳐야 함
}
// ✅ variant→스타일을 데이터로 분리 — 새 variant는 맵에 한 줄만 추가, 본체는 그대로
const VARIANT_CLASS = { primary: 'primary', danger: 'danger' } as const;
function Button({ variant, children, ...props }: ButtonProps) {
  return <button className={VARIANT_CLASS[variant]} {...props}>{children}</button>;
}
```

**L — 리스코프 치환 (LSP)**: 하위 컴포넌트는 상위가 쓰이던 모든 곳에서 문제없이 대체될 수 있어야 합니다.

```jsx
function Input({ value, onChange, ...props }) { return <input value={value} onChange={onChange} {...props} />; }
function NumericInput({ value, onChange, ...props }) {
  const handleChange = (e) => onChange(e.target.value.replace(/[^0-9]/g, ''));
  return <Input value={value} onChange={handleChange} {...props} />;  // Input 자리에 그대로 대체 가능
}
```

**I — 인터페이스 분리 (ISP)**: 컴포넌트가 자신이 쓰지 않는 props까지 받도록 강요하지 마세요. 큰 인터페이스 하나보다, 역할별로 잘게 나눈 인터페이스 여럿이 낫습니다. → 본문 **2.2**

```jsx
// ❌ 한 컴포넌트가 표시·편집·소셜 기능을 모두 받음 (UserInfo만 필요해도 onFollow까지 알아야 함)
function UserCard({ user, onEdit, onDelete, onFollow, onMessage }) { ... }
// ✅ 관심사별로 인터페이스 분리 — 필요한 것만 가져다 씀
function UserInfo({ user }) {}                       // 표시만
function UserActions({ onEdit, onDelete }) {}        // 편집만
function UserSocial({ onFollow, onMessage }) {}      // 소셜만
```

**D — 의존성 역전 (DIP)**: 고수준 모듈은 저수준 구현이 아니라 추상화(인터페이스)에 의존합니다. 재사용 컴포넌트는 라이브러리(예: react-hook-form)에 직접 묶지 말고 prop으로 주입받게 하면, 라이브러리가 바뀌어도 컴포넌트는 그대로입니다. → 본문 **2.2**

```jsx
// ❌ 직접 의존
function UserList() { useEffect(() => { fetch('/api/users').then(r=>r.json()).then(setUsers); }, []); }
// ✅ 의존성 주입
function UserList({ fetchUsers }) { useEffect(() => { fetchUsers().then(setUsers); }, [fetchUsers]); }
```

> FE 적용 팁: 5개를 평등하게 보지 말고 **S·D를 우선** 적용합니다(변경 용이성과 직접 연결). O·L·I는 상황별. 단, 초기부터 과하게 레이어링하면 복잡도만 늘어나니 **지금 필요한 최소한만** 추상화하세요.



#### DRY · KISS · YAGNI

- **DRY** (Don't Repeat Yourself) — 한 군데에서 정의 → 변경 시 한 곳만 수정. → 본문 **2.4 SSOT**
- **KISS** (Keep It Simple, Stupid) — 가독성 희생하며 줄이지 말고, 누구나 이해하게 심플하게. → 본문 **1.1**
- **YAGNI** (You Ain't Gonna Need It) — 지금 필요 없는 기능·미래 대비 복잡성 추가 금지. → 본문 **2.1 이른 추출**



#### 관심사의 분리 (SoC)

- 낮은 결합도, 높은 응집도. → 본문 **2.1**
- 흔한 실수: **모양이 같으면 같은 컴포넌트로** 묶으려 합니다 → 데이터가 다르면 UI도 결국 달라집니다.



### B. 회고 & 인사이트



#### 코드 리뷰의 본질

- 코드 레벨(구체화)이 아니라 **각 컴포넌트의 본질** 을 고민하고 피드백합니다.
- ❌ 구체화 레벨: 문법·스타일·구현 방법 / ✅ 추상화 레벨: 본질이 드러나나? 요구사항이 명확한가? 고객 언어로 읽히나?



#### 숙련으로 다가가는 방법

1. 전문가가 어떻게 하는지 본다 → 2. 내가 해본다 → 3. 피드백 받는다 (반복)
  > 필요한 건 "훈련"이지 "구매"가 아닙니다. Just Do It.



### C. 리뷰어의 질문 패턴 (메타인지 훈련)

> 코드를 보기 전에 "나라면 어떻게?"를 먼저 떠올리고 비교합니다. 리뷰 방향은 세부 코드보다 **추상화/유지보수성**, 코드 한 줄보다 **판단의 근거** 입니다.

리뷰 흐름: **오프닝(멘탈모델) → 정의 확인(용어) → 구체화(추상→구체 매핑) → 분기점 탐색 → 판단 기준(트레이드오프) → 자기 적용(메타인지)**


| 패턴        | 예시 질문                          | 의도         |
| --------- | ------------------------------ | ---------- |
| 오프닝 질문    | "추상화 관점에서 어떤 시각을 가지고 있으신가?"    | 멘탈 모델 파악   |
| 정의 질문     | "'추상화'와 '함수/컴포넌트 분리'의 다른 지점은?" | 용어 정렬      |
| 구체화 요청    | "실제 코드와 매핑해보고 싶다"              | 추상→구체 검증   |
| 판단 기준     | "그렇게 하면 무엇을 얻고 무엇을 잃나요?"       | 트레이드오프 인식  |
| 이진탐색      | "생각의 방향이 어디서부터 틀어졌는지"          | 의도-구현 갭 추적 |
| UI-코드 1:1 | "UI/기획서와 코드가 1:1 대응이 되었는지"     | 변경 단위 정렬   |
| 분리의 비용    | "분리를 통해 뭘 얻었는지가 모호"            | 분리 ≠ 해결    |
| 자기 기준 적용  | "본인 기준으로 보면 잘된/안된 부분은?"        | 메타인지 훈련    |




### D. 영향을 준 좋은 글

- [선언적 프로그래밍에 대한 착각과 오해](https://evan-moon.github.io/2025/09/07/declarative-programming-misconceptions-and-essence/)
- [상태에서 관계로: 선언적 오버레이 패턴(Declarative Overlay Pattern)](https://evan-moon.github.io/2025/10/07/declarative-overlay-pattern-with-overlay-kit/)
- [Toss Frontend Accelerator 모집안내](https://tosspublic.notion.site/Toss-Frontend-Accelerator-3-24e714bbfde78009b550c2d6a3fba041) — 좋은 코드에 대한 고민과 키워드, 후기에서 인사이트를 얻었습니다.

