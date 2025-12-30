---
title: 조건에 따라 다른 폼, 타입 안전하게 관리하기
description: 런타임 조건에 따라 폼 필드가 달라질 때 타입 안전하게 관리하는 방법
outline: 2
---

# 조건에 따라 다른 폼, 타입 안전하게 관리하기

## 서론

react-hook-form과 Zod를 사용하다 보면 **런타임 조건에 따라 폼 필드가 달라지는 경우**를 마주칩니다.

예를 들어 VAN사에 따라 필요한 필드가 다른 TID 등록 폼을 만들어야 한다고 가정해봅시다.

| VAN | 필요한 필드 |
|-----|------------|
| NICE 정보통신, 스마트로, 케이에스넷 | TID (10자리) |
| 다우데이타 | TID (8자리) |
| KIS 정보통신 | 단말기 일련번호 + 다운로드 비밀번호 |
| 코밴 | TID + 대리점 코드 |
| 한국결제네트웍스 | TID (8자리) + 가상시리얼번호 |

어려운 점은:
- 런타임에 `van` 값이 정해짐
- TypeScript는 런타임 값과 타입의 관계를 모름
- 하나의 폼 컴포넌트에서 VAN별로 다른 필드를 보여줘야 함

이 글에서는 이런 상황을 **Optional 타입 + Zod 런타임 검증 + ts-pattern**으로 해결하는 방법을 정리합니다.

---

## 1. 데이터 흐름

### 개념

Form 타입은 유연하게, 검증은 런타임에, 변환은 타입 안전하게.

### 핵심

전체 흐름은 다음과 같습니다.

```
[Form 입력]
     ↓
[TidRegistrationFormData]     ← 모든 필드 optional (FormField 재사용)
     ↓
[Zod 검증: getTidRegistrationSchema(van)]  ← VAN별 필드만 검증
     ↓
[TidRegistrationForm]         ← Discriminated Union으로 변환
     ↓
[transformToApiPayload]       ← VAN별 API 형태로 변환
     ↓
[API 요청]
```

| 단계 | 타입 | 안전성 보장 |
|------|------|-------------|
| Form 상태 | Optional | FormField 재사용 |
| Zod 검증 | VAN별 스키마 | 런타임 검증 |
| Transformer | Discriminated Union | 컴파일 타임 타입 추론 |

---

## 2. 파일 구조

### 개념

책임별로 파일을 분리합니다.

### 핵심

```
/merchant-detail/
  ├── models/
  │   ├── tid-registration.schema.ts       # VAN별 Zod 스키마 + 타입
  │   └── tid-registration.transformer.ts  # Form → API 변환
  └── components/
      └── TidInfo/
          └── tid-registration/
              ├── TidRegistrationModal.tsx
              └── form-fields/
                  ├── TidFormField.tsx
                  ├── DeviceNumberFormField.tsx
                  └── ...
```

| 파일 | 책임 |
|------|------|
| `schema.ts` | Zod 스키마 + 타입 정의 |
| `transformer.ts` | Form → API 변환 |
| `form-fields/` | 재사용 가능한 폼 필드 |
| `Modal.tsx` | 폼 로직 + VAN별 렌더링 |

---

## 3. 스키마 설계

### 개념

필드 단위로 스키마를 정의하고, VAN별로 조합합니다.

### 핵심

**필드 단위 스키마 정의 (재사용)**

```tsx
// 길이가 다른 TID를 위한 팩토리 함수
const createTidFieldSchema = (length: 8 | 10) =>
  z
    .string()
    .min(1, 'TID를 입력해주세요')
    .length(length, `TID ${length}자리를 영문, 숫자로만 입력해 주세요.`)
    .regex(/^[A-Za-z0-9]+$/, `TID ${length}자리를 영문, 숫자로만 입력해 주세요.`);

const tidFieldSchema = createTidFieldSchema(10);

const deviceNumberFieldSchema = z
  .string()
  .min(1, '단말기 일련번호를 입력해주세요.')
  .length(2, '단말기 일련번호 2자리를 숫자로 입력해주세요.')
  .regex(/^\d{2}$/, '단말기 일련번호 2자리를 숫자로 입력해주세요.');

const downloadPasswordFieldSchema = z
  .string()
  .min(1, '다운로드 비밀번호를 입력해주세요.')
  .length(4, '다운로드 비밀번호 4자리를 숫자로 입력해 주세요.')
  .regex(/^\d{4}$/, '다운로드 비밀번호 4자리를 숫자로 입력해 주세요.');
```

**VAN별 스키마 조합**

```tsx
const TidOnlySchema = z.object({
  tid: tidFieldSchema,
});

const KisSchema = z.object({
  deviceNumber: deviceNumberFieldSchema,
  downloadPassword: downloadPasswordFieldSchema,
});

const KovanSchema = z.object({
  tid: tidFieldSchema,
  agentCode: z.string(),
});

const KpnSchema = z.object({
  tid: createTidFieldSchema(8),
  virtualSerialNumber: z.string().min(1).length(10),
});
```

---

## 4. 타입 정의

### 개념

Form 타입은 Optional로, Transformer용 타입은 Discriminated Union으로 정의합니다.

### 핵심

**Form 타입: 모든 필드 Optional**

```tsx
export type TidRegistrationFormData = {
  tid?: string;
  deviceNumber?: string;
  downloadPassword?: string;
  agentCode?: string;
  virtualSerialNumber?: string;
};
```

**왜 모든 필드를 Optional로?**

```tsx
// ❌ VAN별로 타입 분리하면
type NiceFormData = { tid: string };
type KisFormData = { deviceNumber: string; downloadPassword: string };

// FormField마다 다른 타입 필요
function TidFormField() {
  useFormContext<NiceFormData>(); // NICE 전용?
  useFormContext<KovanFormData>(); // 코밴 전용?
  // 재사용 불가능!
}
```

```tsx
// ✅ Optional 타입으로 통일하면
type TidRegistrationFormData = {
  tid?: string;
  deviceNumber?: string;
  // ...
};

// 모든 VAN에서 재사용 가능
function TidFormField() {
  const { register } = useFormContext<TidRegistrationFormData>();
  return <TextField {...register('tid')} />;
}
```

| 접근 | FormField 재사용 | 타입 안전성 |
|------|------------------|-------------|
| VAN별 타입 분리 | ❌ 불가능 | 컴파일 타임 |
| **Optional 통일** ✅ | ✅ 가능 | 런타임 (Zod) |

**핵심**: 타입 안전성은 Zod가 런타임에서 보장하니까, Form 타입은 재사용성을 위해 Optional로 통일합니다.

**Transformer용 타입: Discriminated Union**

```tsx
export type TidRegistrationForm =
  | { van: 'NICE 정보통신'; data: TidOnlyForm }
  | { van: '스마트로'; data: TidOnlyForm }
  | { van: '케이에스넷'; data: TidOnlyForm }
  | { van: '다우데이타'; data: DaouDataForm }
  | { van: 'KIS 정보통신'; data: KisForm }
  | { van: '코밴'; data: KovanForm }
  | { van: '한국결제네트웍스'; data: KpnForm };
```

---

## 5. VAN → Schema 매핑

### 개념

ts-pattern의 exhaustive로 모든 케이스를 강제합니다.

### 핵심

```tsx
export function getTidRegistrationSchema(van: Van) {
  return match(van)
    .with('NICE 정보통신', () => TidOnlySchema)
    .with('KIS 정보통신', () => KisSchema)
    .with('한국결제네트웍스', () => KpnSchema)
    .with('코밴', () => KovanSchema)
    .with('스마트로', () => TidOnlySchema)
    .with('케이에스넷', () => TidOnlySchema)
    .with('다우데이타', () => DaouDataSchema)
    .exhaustive(); // 새 VAN 추가 시 컴파일 에러
}
```

새로운 VAN이 추가되면 `.exhaustive()`에서 컴파일 에러가 발생해서 누락을 방지할 수 있습니다.

```tsx
// 새 VAN '신한카드' 추가 시
.exhaustive(); // ❌ 컴파일 에러: '신한카드' 처리 안 됨
```

---

## 6. Transformer

### 개념

Form 데이터를 API 페이로드로 변환합니다.

### 핵심

```tsx
export function transformToApiPayload(formData: TidRegistrationForm): Omit<PostTidParam, 'merchantId'> {
  return match(formData)
    .with({ van: 'NICE 정보통신' }, { van: '스마트로' }, { van: '케이에스넷' }, ({ data }) => ({
      tid: data.tid,
      metadata: {},
    }))
    .with({ van: '다우데이타' }, ({ data }) => ({
      tid: data.tid,
      metadata: {},
    }))
    .with({ van: 'KIS 정보통신' }, ({ data }) => ({
      metadata: {
        deviceNumber: data.deviceNumber,
        downloadPassword: data.downloadPassword,
      },
    }))
    .with({ van: '코밴' }, ({ data }) => ({
      tid: data.tid,
      metadata: {
        agentCode: data.agentCode,
      },
    }))
    .with({ van: '한국결제네트웍스' }, ({ data }) => ({
      tid: data.tid,
      metadata: {
        virtualSerialNumber: data.virtualSerialNumber,
      },
    }))
    .exhaustive();
}
```

`{ van: 'NICE 정보통신' }`으로 매칭하면 `data`가 `TidOnlyForm`으로 자동 추론됩니다.

---

## 7. 모달 컴포넌트

### 개념

VAN별로 다른 스키마와 필드를 렌더링합니다.

### 핵심

```tsx
export function TidRegistrationModal({ van, merchantId, isOpen, onClose }: Props) {
  const form = useForm<TidRegistrationFormData>({
    resolver: zodResolver(getTidRegistrationSchema(van)) as Resolver<TidRegistrationFormData>,
  });

  const handleSubmit = async (formData: TidRegistrationFormData) => {
    const payload = transformToApiPayload({ van, data: formData as any });
    await createTid({ merchantId, ...payload });
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        {match(van)
          .with('NICE 정보통신', '스마트로', '케이에스넷', () => <TidFormField />)
          .with('다우데이타', () => <TidFormField maxLength={8} />)
          .with('KIS 정보통신', () => (
            <>
              <DeviceNumberFormField />
              <DownloadPasswordFormField />
            </>
          ))
          .with('한국결제네트웍스', () => (
            <>
              <VirtualSerialNumberFormField />
              <TidFormField maxLength={8} />
            </>
          ))
          .with('코밴', () => (
            <>
              <TidFormField />
              <AgentCodeFormField />
            </>
          ))
          .exhaustive()}
      </form>
    </FormProvider>
  );
}
```

### as any를 사용한 이유

```tsx
const payload = transformToApiPayload({ van, data: formData as any });
```

| 단계 | 상태 |
|------|------|
| 1. useForm | `TidRegistrationFormData` (모든 필드 optional) |
| 2. Zod 검증 | VAN에 맞는 스키마로 **이미 검증 완료** |
| 3. handleSubmit | Zod 통과한 데이터만 여기 도착 |
| 4. transformer | Discriminated Union으로 변환 → 타입 추론 |

**as any가 실용적인 선택인 이유**

1. Zod가 이미 VAN별 스키마로 검증 완료 → 런타임 안전성 보장
2. TypeScript는 런타임 분기를 모름 → 어떤 방식이든 type assertion 필요
3. 대안들은 복잡도만 증가시킴
4. handleSubmit 내부에서는 Zod 검증 후이므로 안전

---

## 정리

| 주제 | 핵심 |
|------|------|
| Form 타입 | Optional로 통일 (FormField 재사용) |
| 타입 안전성 | Zod 런타임 검증 + Discriminated Union |
| 케이스 누락 방지 | ts-pattern exhaustive |
| as any | Zod 검증 후이므로 실용적 선택 |

**참고**
- [ts-pattern GitHub](https://github.com/gvergnaud/ts-pattern)