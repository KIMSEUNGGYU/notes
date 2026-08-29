---
title: form 관리
description: react-hook-form + Zod 베스트 템플릿 — 매일 마주치는 폼 패턴
outline: [1, 6]
---

# form 관리

> React 폼 관리는 **react-hook-form + Zod** 조합이 정석. `zodResolver`로 연결하면 스키마 하나로 검증 + 타입 + 에러 메시지를 모두 처리.

# 왜 react-hook-form + Zod 조합인가

**단일 책임 원칙 — 책임 분리**

| 도구              | 책임                                           |
| ----------------- | ---------------------------------------------- |
| react-hook-form   | 폼 상태 관리 (Uncontrolled + Controlled 지원) |
| Zod               | 검증 & 스키마 정의                             |
| `zodResolver`     | 둘을 연결 — 스키마 하나로 검증 + 타입 + 메시지 |

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

스키마 한 곳만 수정하면 타입/검증/에러 메시지가 모두 따라옴.

# 핵심 원칙

1. **스키마를 SSOT로** — 타입/검증/에러 메시지를 Zod 스키마 한 곳에 정의
2. **타입 안전성은 Zod가 런타임에 보장** — Form 타입은 재사용성을 위해 Optional로 통일 가능
3. **커스텀 컴포넌트는 Controller, native input은 register** — ref 지원 여부로 판단
4. **FormProvider로 props drilling 제거** — 깊은 자식까지 `useFormContext`로 접근

# 01. Optional 필드 처리

**언제 쓰나** — 서버에선 optional인 필드인데, HTML input의 빈 값은 `''`로 와서 `.optional()` 검증과 안 맞을 때

**템플릿**

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

**왜**

- Zod `.optional()`은 `undefined`만 허용, HTML input의 빈 값은 `''` — 두 값의 차이로 검증 실패 또는 API에 빈 문자열 전송
- `setValueAs`로 변환 시점에 통일 → Zod 통과 + API에서 필드 자체 제외

**참고** — [react-hook-form Discussion #6980](https://github.com/orgs/react-hook-form/discussions/6980)

---

# 02. Value / Format 분리

**언제 쓰나** — 저장값과 표시값이 달라야 할 때 (예: 전화번호 — 저장은 `01012345678`, 표시는 `010-1234-5678`)

**템플릿 — register + setValueAs + onChange (기본)**

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

**템플릿 — Controller (ref 미지원 컴포넌트)**

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

**선택 기준**

| 컴포넌트                           | 선택       |
| ---------------------------------- | ---------- |
| native input (`<input>`)           | register   |
| 라이브러리 UI / ref 미지원 컴포넌트 | Controller |

---

# 03. UI Optional / API Required

**언제 쓰나** — 서버는 필수인데 클라이언트는 "아무것도 선택 안 함" 초기 상태가 필요한 경우 (예: 가입 유형 선택)

**템플릿**

```tsx
// Form 타입 (UI 입장)
type SignupForm = {
  signupType: 'student' | 'teacher' | 'parent' | null;
};

// 스키마 (API 입장)
const schema = z.object({
  signupType: z.enum(['student', 'teacher', 'parent']),
});

// 1단계: 빈 값 → undefined로 변환
{...register('signupType', {
  setValueAs: value => (value === '' ? undefined : value),
})}

// 2단계: handleSubmit에서 타입 좁히기 (zod 통과 후)
const handleSubmit = (data: SignupForm) => {
  await apiCall({ signupType: data.signupType! }); // non-null 보장됨
};
```

**타입 좁히기 — 상황별 선택**

| 상황                  | 방법                                  |
| --------------------- | ------------------------------------- |
| 단일 필드, 간단       | `!` (zod 검증 후라 OK)               |
| 추가 로직 필요        | 단순 조건문 (`if (!data.x) return;`)  |
| 여러 필드, 재사용     | Type Guard 함수                       |
| 타입 강제 변환        | `as` (지양 — 런타임 에러 위험)        |

**왜**

- `!`는 일반적으로 안티패턴이지만 **zod 검증 통과 후 호출되는 handleSubmit에서는 non-null이 보장**되므로 실용적
- `as`는 잘못 쓰면 런타임 에러 위험

---

# 04. useFieldArray — 배열 폼

**언제 쓰나** — 테이블/리스트 형태 데이터를 폼으로 (담당자 목록 수정, 장바구니 수량 변경, 동적 질문 추가/삭제 등)

**템플릿**

```tsx
type FormValues = {
  managers: { name: string; isAvailable: boolean; skills: string[] }[];
};

function ManagerTable() {
  const {
    control,
    handleSubmit,
    formState: { isDirty, dirtyFields },
  } = useForm<FormValues>({
    defaultValues: { managers: initialManagers },
  });

  const { fields } = useFieldArray({ control, name: 'managers' });

  return (
    <form onSubmit={handleSubmit(onSave)}>
      {fields.map((field, index) => (
        <Table.Row key={field.id}>
          <Controller
            control={control}
            name={`managers.${index}.isAvailable`}
            render={({ field: { value, onChange } }) => (
              <Checkbox checked={value} onChange={onChange} />
            )}
          />
        </Table.Row>
      ))}
      <Button type="submit" disabled={!isDirty}>저장</Button>
    </form>
  );
}
```

**변경된 항목만 추출 — `dirtyFields`**

```tsx
const onSave = (data: FormValues) => {
  const changedManagers = data.managers.filter(
    (_, index) => dirtyFields.managers?.[index]
  );
  await api.patch('/managers', changedManagers);
};
```

**왜**

- `fields[].id` — React key용 고유값 자동 생성
- `isDirty` — 변경 여부 → 저장 버튼 활성화
- `dirtyFields.managers?.[index]` — 어떤 항목이 변경됐는지 → 변경된 데이터만 API 전송

---

# 05. 폼 초기화 — Controller vs register

**언제 쓰나** — `form.reset()` 호출했는데 특정 필드만 초기화 안 되는 문제

## 케이스 A — 커스텀 컴포넌트 + register

| 상황              | 값 변경 | reset |
| ----------------- | ------- | ----- |
| 연결 안 함        | ❌       | ❌    |
| register 사용     | ✅       | ❌    |
| **Controller 사용** | ✅       | ✅    |

**왜**

- `register`는 native input의 `ref`를 통해 제어 (uncontrolled) — 커스텀 컴포넌트 내부 상태는 제어 못 함
- `Controller`는 `value`/`onChange`로 완전히 controlled → reset도 동작

**규칙**

- native input → `register` OK
- 커스텀 컴포넌트 → **무조건 Controller**

```tsx
// ❌ register — 값은 바뀌는데 reset 안 됨
<CustomSelect {...register('type')} />

// ✅ Controller
<Controller
  control={control}
  name="type"
  render={({ field }) => (
    <CustomSelect value={field.value} onChange={field.onChange} />
  )}
/>
```

## 케이스 B — form 외부 상태 (useImperativeHandle)

자식 컴포넌트가 form과 별개로 자체 useState를 가지는 경우, form.reset()은 그 상태를 못 건드림.

**템플릿**

```tsx
// 자식
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
  },
);

// 부모
const businessRegRef = useRef<BusinessRegFieldRef>(null);

const handleSuccess = () => {
  form.reset();                    // 폼 데이터
  businessRegRef.current?.reset(); // 자식 내부 상태
};
```

---

# 06. FormProvider + useFormContext

**언제 쓰나** — 폼 필드가 깊이 중첩되어 `register`/`control`/`errors`의 props drilling이 심해질 때

**템플릿**

```tsx
// 부모 — FormProvider로 감싸기
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

// 자식 — useFormContext로 접근
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

**왜**

- Props drilling 제거 — `register`, `errors` 전달 불필요
- FormField 재사용 — 어디서든 `useFormContext`로 접근
- 타입 안전성 유지 — `useFormContext<T>`로 타입 추론

---

# 부록

- [조건부 폼 — 런타임 조건별 다른 필드](./conditional-forms) — VAN별로 폼 필드가 달라지는 도메인 케이스. Optional 타입 + Zod + ts-pattern + Discriminated Union 조합
