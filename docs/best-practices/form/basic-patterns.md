---
title: react-hook-form + Zod 기본 패턴
description: react-hook-form과 Zod를 사용하면서 자주 마주치는 상황과 해결법
outline: 2
---

# react-hook-form + Zod 기본 패턴

## 서론

react-hook-form과 Zod 조합은 React 폼 관리의 정석처럼 쓰이고 있습니다.

하지만 막상 실무에서 사용하다 보면 "어? 이건 어떻게 하지?" 싶은 순간들이 있습니다. 빈 문자열이 `undefined`로 안 바뀌거나, 저장값과 표시값이 달라서 헷갈리거나, 타입이 안 좁혀져서 고민되는 경우들이요.

이 글에서는 제가 실무에서 자주 마주쳤던 패턴들과 해결법을 정리합니다.

---

## 1. 왜 react-hook-form + Zod 조합인가

### 개념

각자의 역할에 집중하고, 연결은 resolver로 합니다.

### 핵심

저는 이 조합이 좋은 이유가 **단일 책임 원칙**에 있다고 생각합니다.

- react-hook-form: 폼 상태 관리 (Uncontrolled + Controlled 지원)
- Zod: 검증 & 스키마 정의

`@hookform/resolvers`의 `zodResolver`로 연결하면 **스키마 하나로 검증 + 타입 + 에러 메시지**를 모두 처리할 수 있습니다.

스키마를 정의하면 타입이 자동으로 추론되고, 검증 로직과 에러 메시지도 한 곳에서 관리됩니다. 변경이 필요할 때 스키마 한 곳만 수정하면 되는 거죠.

### 예시

```tsx
const schema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  age: z.number().min(1, '나이를 입력해주세요'),
});

type FormData = z.infer<typeof schema>; // 타입 자동 추론

const form = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

---

## 2. Optional 필드 처리

### 개념

빈 문자열 `''`과 `undefined`는 다릅니다.

### 핵심

서버에서는 optional 필드인데, 클라이언트에서 빈 문자열이 전송되는 경우가 있습니다.

Zod의 `.optional()`은 `undefined`만 허용하는데, HTML input의 빈 값은 `''`입니다. 이 차이 때문에 검증이 실패하거나, API에 불필요한 빈 문자열이 전송됩니다.

저는 이런 경우 `setValueAs`를 사용해서 빈 문자열을 `undefined`로 변환합니다. 그러면 Zod 검증도 통과하고, API에도 해당 필드가 제외됩니다.

### 예시

```tsx
// ❌ 빈 값이 ''로 전송됨
<input {...register('businessNumber')} />
// API payload: { businessNumber: '' }

// ✅ 빈 값을 undefined로 변환
<input
  {...register('businessNumber', {
    setValueAs: value => (value === '' ? undefined : value),
  })}
/>
// API payload: { } (필드 자체가 제외)
```

**참고**
- [react-hook-form Discussion #6980](https://github.com/orgs/react-hook-form/discussions/6980)
- [Chris Jarling 블로그](https://chrisjarling.com/posts/zod-rhf-optional-number)

---

## 3. Value와 Format 분리

### 개념

저장하는 값과 표시하는 값을 분리합니다.

### 핵심

전화번호를 예로 들면, 저장은 `01012345678`로 하고 표시는 `010-1234-5678`로 해야 하는 경우가 있습니다.

저는 이런 경우 두 가지 방법을 사용합니다.

**기본적으로 `register`의 `setValueAs`와 `onChange`를 조합합니다.** `setValueAs`로 저장값을 변환하고, `onChange`로 표시값을 포맷팅하는 거죠. 변환 로직이 복잡해도 이 방식으로 충분합니다.

**`Controller`는 ref를 받지 못하는 컴포넌트에서 사용합니다.** 라이브러리 UI 컴포넌트나 커스텀 컴포넌트가 `ref`를 지원하지 않을 때, 또는 값이 바뀔 때마다 즉시 리렌더가 필요한 controlled 방식이 필요할 때 사용합니다.

### 예시

**register + setValueAs + onChange**

```tsx
<input
  {...register('phone', {
    setValueAs: value => value.replace(/-/g, ''), // 저장: 숫자만
    onChange: e => {
      e.target.value = formatPhone(e.target.value); // 표시: 하이픈 포함
    },
  })}
/>
```

**Controller (ref를 받지 못하는 컴포넌트)**

```tsx
<Controller
  control={control}
  name="phone"
  render={({ field: { value, onChange } }) => (
    <PhoneInput
      value={formatPhone(value)} // 표시: 포맷팅된 값
      onChange={raw => onChange(raw.replace(/-/g, ''))} // 저장: 숫자만
    />
  )}
/>
```

---

## 4. UI는 Optional, API는 Required

### 개념

서버에 전달하는 값은 **필수**인데, 클라이언트는 "아무것도 선택 안 함" 상태가 필요한 경우입니다.

### 핵심

예를 들어 가입 유형을 선택하는 경우:
- 서버: `signupType: 'student' | 'teacher' | 'parent'` (필수)
- 클라이언트: 초기에 아무것도 선택 안 된 상태 (유저가 직접 선택 유도)

```tsx
// Form 타입 정의
type SignupForm = {
  signupType: 'student' | 'teacher' | 'parent' | null;
};

// 스키마
const schema = z.object({
  signupType: z.enum(['student', 'teacher', 'parent']),
});
```

이런 경우 두 단계로 해결합니다.

### 1단계: 값 변환 (setValueAs)

```tsx
{...register('signupType', {
  setValueAs: value => value === '' ? undefined : value
})}
```

### 2단계: 타입 좁히기

zod 검증을 통과해도 Form 타입이 `T | null`로 정의되어 있으면 TypeScript는 타입을 좁혀주지 않습니다. 상황에 따라 적절한 방법을 선택합니다.

---

### 안티패턴: as

타입을 강제로 변환하는 방식은 잘못 쓰면 런타임 에러 위험이 있어 지양합니다.

```tsx
// ❌ 지양
await apiCall({ signupType: data.signupType as SignupType });
```

---

### 실용적 처리: !

non-null assertion(`!`)도 일반적으로는 안티패턴이지만, **zod 검증 통과 후 호출되는 handleSubmit에서는 non-null이 보장**되므로 실용적으로 사용할 수 있습니다.

```tsx
// ✅ 단일 필드, 간단한 경우
const handleSubmit = (data: SignupForm) => {
  await apiCall({ signupType: data.signupType! });
};
```

---

### 단순 조건문

타입체크를 안전하게 하고 싶거나 조건에 따라 **추가 로직**(에러 토스트, 로깅 등)이 필요할 때 사용합니다.

```tsx
// ✅ 추가 로직이 필요할 때
const handleSubmit = (data: SignupForm) => {
  if (!data.signupType) {
    showToast('유형을 선택해주세요');
    return;
  }
  await apiCall({ signupType: data.signupType }); // 타입 좁혀짐
};
```

---

### Type Guard

여러 필드를 한번에 검증하거나, 여러 곳에서 재사용할 때 사용할 수 있습니다.

```tsx
// 유틸리티 타입
type NonNullableFields<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};

// Type Guard
function isValidSignupForm(data: SignupForm): data is NonNullableFields<SignupForm> {
  return data.signupType !== null;
}

const handleSubmit = (data: SignupForm) => {
  if (!isValidSignupForm(data)) return;
  await apiCall({ signupType: data.signupType }); // ✅ 타입 좁혀짐
};
```

---

### 정리

| 상황 | 방법 |
|------|------|
| 단일 필드, 간단 | `!` (zod 검증 후라 OK) |
| 추가 로직 필요 | 단순 조건문 |
| 여러 필드, 재사용 | Type Guard |
| 타입 강제 변환 | `as` (지양) |

**참고**
- [formState 공식 문서](https://react-hook-form.com/docs/useform/formstate)

---

## 정리

| 상황 | 해결 |
|------|------|
| Optional 필드 빈 문자열 | `setValueAs: v => v === '' ? undefined : v` |
| Value/Format 분리 | 기본은 register, ref 미지원 컴포넌트는 Controller |
| UI optional, API required | 값 변환 + 타입 좁히기 |