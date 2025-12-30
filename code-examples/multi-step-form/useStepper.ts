import { useCallback, useState } from 'react';

export function useStepper<T>(initialIndex: number, steps: T[]) {
  const stepCount = steps.length;
  const [index, setIndex] = useState(Math.min(Math.max(initialIndex, 0), stepCount - 1));

  const goNextStep = useCallback(() => {
    setIndex(prev => (prev < stepCount - 1 ? prev + 1 : prev));
  }, [stepCount]);

  return { currentStepIndex: index, currentStep: steps[index], isLastStep: index === stepCount - 1, goNextStep };
}
