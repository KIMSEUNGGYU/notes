---
title: react-hook-form 실전 팁 모음
description: useFieldArray, 폼 초기화 문제, FormProvider 활용법
outline: 2
---

# react-hook-form 실전 팁 모음

## 서론

react-hook-form과 Zod를 사용하다 보면 기본 패턴 외에도 다양한 상황을 마주칩니다.

배열 형태의 데이터를 폼으로 관리해야 하거나, `reset()`이 안 되는 문제를 겪거나, props drilling이 심해지는 경우들이요.

이 글에서는 실무에서 자주 마주치는 상황들과 해결법을 정리합니다.

---

## 1. useFieldArray - 배열 폼 데이터

### 개념

테이블이나 리스트 형태의 데이터를 폼으로 관리합니다.

### 핵심

배열의 각 항목이 폼 필드를 가지는 경우가 있습니다.

- 담당자 목록에서 각 담당자의 "가능 여부", "업무 스킬" 수정
- 장바구니에서 각 상품의 수량 변경
- 설문조사에서 동적으로 질문 추가/삭제

이런 경우 `useFieldArray`를 사용합니다.

### 예시

**기본 사용법**

```tsx
type FormValues = {
  managers: {
    name: string;
    isAvailable: boolean;
    skills: string[];
  }[];
};

function ManagerTable() {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, dirtyFields },
  } = useForm<FormValues>({
    defaultValues: { managers: initialManagers },
  });

  const { fields } = useFieldArray({
    control,
    name: 'managers',
  });

  return (
    <form onSubmit={handleSubmit(onSave)}>
      <Table>
        {fields.map((field, index) => (
          <Table.Row key={field.id}>
            <Controller
              control={control}
              name={`managers.${index}.isAvailable`}
              render={({ field: { value, onChange } }) => (
                <Checkbox checked={value} onChange={onChange} />
              )}
            />
            <Controller
              control={control}
              name={`managers.${index}.skills`}
              render={({ field: { value, onChange } }) => (
                <MultiSelect value={value} onChange={onChange} />
              )}
            />
          </Table.Row>
        ))}
      </Table>
      
      <Button onClick={() => reset()}>취소</Button>
      <Button type="submit" disabled={!isDirty}>저장</Button>
    </form>
  );
}
```

**fields가 주는 것**

```tsx
// useFieldArray의 fields
[
  { id: 'unique-1', name: '김철수', isAvailable: true, skills: [...] },
  { id: 'unique-2', name: '이영희', isAvailable: false, skills: [...] },
]
```

- `id`: React key용 고유값 (자동 생성)
- 나머지: defaultValues에서 가져온 데이터

**변경된 항목만 추출하기**

```tsx
const onSave = (data: FormValues) => {
  // dirtyFields로 변경된 매니저만 필터링
  const changedManagers = data.managers.filter(
    (_, index) => dirtyFields.managers?.[index]
  );
  
  // 변경된 데이터만 API 전송
  await api.patch('/managers', changedManagers);
};
```

**dirtyFields 구조**

```tsx
// 인덱스 1, 3번만 수정한 경우
dirtyFields = {
  managers: {
    1: { isAvailable: true },
    3: { skills: true }
  }
}
```

### 정리

| 속성 | 역할 |
|------|------|
| `fields` | 배열 데이터 + 고유 id |
| `isDirty` | 변경 여부 → 저장 버튼 활성화 |
| `dirtyFields` | 어떤 항목이 변경됐는지 |
| `reset()` | 초기값으로 되돌림 |

**참고**
- [useFieldArray 공식 문서](https://react-hook-form.com/docs/usefieldarray)

---

## 2. 폼 초기화가 안 될 때

### 개념

`form.reset()` 호출했는데 특정 필드만 초기화가 안 되는 경우입니다.

### 핵심

**케이스 1: 커스텀 컴포넌트 + register**

커스텀 컴포넌트(DatePicker, Select 등)를 `register`로 연결하면:
- 값 변경은 됨 ✅
- `reset()`이 안 됨 ❌

| 상황 | 값 변경 | reset |
|------|--------|-------|
| 연결 안 함 | ❌ | ❌ |
| register 사용 | ✅ | ❌ |
| Controller 사용 | ✅ | ✅ |

**왜 이런가?**

- `register`는 native input의 `ref`를 통해 값 제어 (uncontrolled)
- 커스텀 컴포넌트는 내부적으로 자체 상태를 가짐
- `register`가 값 변경은 감지하지만, reset 시 내부 상태까지 제어 못 함
- `Controller`는 `value`/`onChange`로 완전히 controlled → reset도 동작

### 예시

```tsx
// ❌ register - 값은 바뀌는데 reset 안 됨
<CustomSelect {...register('type')} />

// ✅ Controller - 둘 다 됨
<Controller
  control={control}
  name="type"
  render={({ field }) => (
    <CustomSelect value={field.value} onChange={field.onChange} />
  )}
/>
```

**규칙**
- native input (`<input>`, `<select>`) → `register` OK
- 커스텀 컴포넌트 → **무조건 Controller**

---

**케이스 2: form 외부 상태**

Controller 잘 썼는데도 특정 상태가 reset 안 되는 경우가 있습니다.

예를 들어 사업자등록번호 자동완성 여부(`isAutoFilled`)가 컴포넌트 내부 useState로 관리되고 있다면, form 데이터가 아니라 reset 대상이 아닙니다.

```tsx
// 자식 컴포넌트 내부
const [isAutoFilled, setIsAutoFilled] = useState(false);  // form 외부!
```

**해결: useImperativeHandle로 reset 노출**

```tsx
// 자식 컴포넌트
export interface BusinessRegFieldRef {
  reset: () => void;
}

export const BusinessRegField = forwardRef<BusinessRegFieldRef, Props>(
  (_props, ref) => {
    const [isAutoFilled, setIsAutoFilled] = useState(false);

    useImperativeHandle(ref, () => ({
      reset: () => setIsAutoFilled(false),
    }));

    return (/* ... */);
  }
);
```

```tsx
// 부모 컴포넌트
function MerchantCreatePage() {
  const form = useForm<FormData>();
  const businessRegRef = useRef<BusinessRegFieldRef>(null);

  const handleSuccess = () => {
    form.reset();                    // 폼 데이터 초기화
    businessRegRef.current?.reset(); // 자식 내부 상태 초기화
  };

  return (
    <form>
      <BusinessRegField ref={businessRegRef} />
    </form>
  );
}
```

### 정리

| 증상 | 원인 | 해결 |
|------|------|------|
| 값은 바뀌는데 reset 안 됨 | 커스텀 컴포넌트 + register | Controller 사용 |
| 내부 상태 reset 안 됨 | form 외부 상태 | useImperativeHandle |

---

## 3. FormProvider + useFormContext

### 개념

Context로 폼을 제공해서 props drilling을 제거합니다.

### 핵심

폼 필드가 깊게 중첩되면 `register`, `control`, `errors`를 계속 내려줘야 합니다.

```tsx
// ❌ props 계속 내려줘야 함
function Form() {
  const { register, control, formState: { errors } } = useForm();
  
  return (
    <FieldGroup register={register} errors={errors}>
      <TidField register={register} errors={errors} />
      <DeviceField control={control} errors={errors} />
    </FieldGroup>
  );
}
```

`FormProvider`와 `useFormContext`를 사용하면 이 문제를 해결할 수 있습니다.

### 예시

**부모: FormProvider로 감싸기**

```tsx
function TidRegistrationModal() {
  const form = useForm<TidRegistrationFormData>();

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <TidFormField />
        <DeviceNumberFormField />
      </form>
    </FormProvider>
  );
}
```

**자식: useFormContext로 접근**

```tsx
function TidFormField() {
  const {
    register,
    formState: { errors },
  } = useFormContext<TidRegistrationFormData>();

  return (
    <TextField
      {...register('tid')}
      error={!!errors.tid}
      bottomText={errors.tid?.message}
    />
  );
}
```

### 정리

| 장점 | 설명 |
|------|------|
| Props drilling 제거 | register, errors 등 전달 불필요 |
| FormField 재사용 | 어디서든 useFormContext로 접근 |
| 타입 안전성 유지 | `useFormContext<T>`로 타입 추론 |

---

## 정리

| 주제 | 핵심 |
|------|------|
| useFieldArray | 배열 데이터 관리 + dirtyFields로 변경분만 추출 |
| 폼 초기화 안 될 때 | 커스텀 컴포넌트는 Controller, 외부 상태는 useImperativeHandle |
| FormProvider | Props drilling 없이 폼 접근 |