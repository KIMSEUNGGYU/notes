# Multi-Step Form Pattern

다단계 입력 폼을 구현하는 패턴입니다. 사용자가 여러 단계에 걸쳐 정보를 입력할 때, 각 스텝을 순차적으로 보여주고 관리하는 방식입니다.

## 핵심 구성요소

### 1. useStepper Hook

스텝 상태를 관리하는 커스텀 훅입니다.

```tsx
import { useCallback, useState } from 'react';

export function useStepper<T>(initialIndex: number, steps: T[]) {
  const stepCount = steps.length;
  const [index, setIndex] = useState(Math.min(Math.max(initialIndex, 0), stepCount - 1));

  const goNextStep = useCallback(() => {
    setIndex(prev => (prev < stepCount - 1 ? prev + 1 : prev));
  }, [stepCount]);

  return { currentStepIndex: index, currentStep: steps[index], isLastStep: index === stepCount - 1, goNextStep };
}
```

**반환값:**
- `currentStepIndex`: 현재 스텝 인덱스
- `currentStep`: 현재 스텝 값
- `isLastStep`: 마지막 스텝 여부
- `goNextStep`: 다음 스텝으로 이동하는 함수

### 2. StepRenderer Component

현재 스텝까지의 컴포넌트들을 역순으로 렌더링합니다. 이전에 입력한 내용을 위에 보여주면서 새로운 입력 필드가 아래에 나타나는 UX를 구현합니다.

```tsx
import React from 'react';

interface StepRendererProps<T extends string[]> {
  steps: T;
  currentStepIndex: number;
  components: {
    [key in T[number]]: React.ReactNode;
  };
}

export function StepRenderer<T extends string[]>({ steps, currentStepIndex, components }: StepRendererProps<T>) {
  return (
    <>
      {steps
        .slice(0, currentStepIndex + 1)
        .reverse()
        .map(step => (
          <React.Fragment key={step}>{components[step as T[number]]}</React.Fragment>
        ))}
    </>
  );
}
```

**동작 방식:**
1. `steps.slice(0, currentStepIndex + 1)` - 현재 스텝까지의 배열만 추출
2. `.reverse()` - 역순으로 정렬 (최신 입력 필드가 아래에 위치)
3. 각 스텝에 매핑된 컴포넌트를 렌더링

## 사용 예시

### 기본 구조

```tsx
const INPUT_STEPS = ['step1', 'step2', 'step3'] as const;

function MultiStepForm() {
  // 미완료된 스텝부터 시작하도록 초기 인덱스 계산
  const incompleteStepIndex = INPUT_STEPS.findIndex(step => data[step] == null);
  const initialStepIndex = incompleteStepIndex !== -1 ? incompleteStepIndex : INPUT_STEPS.length - 1;

  const { currentStepIndex, currentStep, isLastStep, goNextStep } = useStepper(initialStepIndex, INPUT_STEPS);

  // 현재 스텝 필드에 자동 포커스
  useEffect(() => {
    if (currentStep != null) setFocus(currentStep);
  }, [currentStep, setFocus]);

  return (
    <form>
      <StepRenderer
        steps={INPUT_STEPS}
        currentStepIndex={currentStepIndex}
        components={{
          step1: <Step1Input onComplete={goNextStep} />,
          step2: <Step2Input />,
          step3: <Step3Input />,
        }}
      />

      {/* 중간 스텝: 다음 버튼 */}
      {!isLastStep && (
        <Button type="button" onClick={goNextStep}>
          다음
        </Button>
      )}

      {/* 마지막 스텝: 제출 버튼 */}
      {isLastStep && (
        <Button type="submit">
          완료
        </Button>
      )}
    </form>
  );
}
```

### 자동 스텝 진행

특정 입력이 유효할 때 자동으로 다음 스텝으로 이동:

```tsx
<StepRenderer
  components={{
    phoneNumber: (
      <PhoneInput
        onValid={() => {
          if (currentStep === 'phoneNumber') {
            goNextStep(); // 유효성 검사 통과 시 자동 진행
          }
        }}
      />
    ),
    name: <NameInput />,
  }}
/>
```

## 특징

- **점진적 노출**: 사용자에게 한 번에 하나의 입력 필드만 집중하게 함
- **이전 입력 확인**: 이미 입력한 내용을 상단에 표시
- **자동 포커스**: 새로운 스텝으로 이동 시 해당 필드에 자동 포커스
- **유연한 진행 방식**: 버튼 클릭 또는 유효성 검사 통과 시 자동 진행 가능
- **react-hook-form 연동**: FormProvider와 함께 사용하여 폼 상태 관리
