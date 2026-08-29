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
        .map((step) => (
          <React.Fragment key={step}>{components[step as T[number]]}</React.Fragment>
        ))}
    </>
  );
}
