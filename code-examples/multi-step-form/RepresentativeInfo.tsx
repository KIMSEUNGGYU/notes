import { FixedBottomCTA, Top, TopSubtitleParagraph, TopTitleParagraph } from '@tds/mobile';
import { adaptive, colors } from '@tossteam/colors';
import { useDocumentId } from 'pages/index/contexts/DocumentIdContext';
import { useFetchDocumentInfo } from 'pages/index/hooks/useFetchDocumentInfo';
import { useSaveDocumentInfo } from 'pages/index/hooks/useSaveDocumentInfo';
import { useStepper } from 'pages/index/hooks/useStepper';
import type { DocumentInfo } from 'pages/index/models/document';
import { useEffect, useId } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { FunnelScrollContainer } from '../../FunnelScrollContainer';
import { StepRenderer } from '../StepRenderer';
import { ContactInput } from './ContactInput';
import { EmailInput } from './EmailInput';
import { NameInput } from './NameInput';

type RepresentativeInfoType = Pick<
  DocumentInfo,
  'representativeContact' | 'representativeEmail' | 'representativeName'
>;

export type RepresentativeFormFields = {
  [K in keyof RepresentativeInfoType]: NonNullable<RepresentativeInfoType[K]>;
};

const INPUT_STEPS: (keyof RepresentativeFormFields)[] = [
  'representativeContact',
  'representativeName',
  'representativeEmail',
];

interface Props {
  onNext: () => void;
}

export function RepresentativeInfo({ onNext: onNextPage }: Props) {
  const documentId = useDocumentId();

  const { data } = useFetchDocumentInfo(documentId);
  const document = data.success.document;

  const saveDocumentInfoMutation = useSaveDocumentInfo();

  const form = useForm<RepresentativeFormFields>({
    mode: 'onTouched',
    defaultValues: {
      representativeContact: document.representativeContact ?? '',
      representativeName: document.representativeName ?? '',
      representativeEmail: document.representativeEmail ?? '',
    },
  });

  const { handleSubmit, formState, setFocus } = form;

  const formId = useId();

  const incompleteStepIndex = INPUT_STEPS.findIndex((value) => document[value] == null);
  const initialStepIndex = incompleteStepIndex !== -1 ? incompleteStepIndex : INPUT_STEPS.length - 1;

  const { currentStepIndex, currentStep, isLastStep, goNextStep } = useStepper(initialStepIndex, INPUT_STEPS);

  useEffect(() => {
    if (currentStep != null) setFocus(currentStep);
  }, [currentStep, setFocus]);

  return (
    <>
      <Top
        title={<TopTitleParagraph color={adaptive.grey900}>대표자 정보를 입력해주세요</TopTitleParagraph>}
        subtitleBottom={
          <TopSubtitleParagraph size={15}>
            <span style={{ color: colors.blue500 }}>사업자등록증</span> 상의 대표자 정보를 입력해야 해요.
          </TopSubtitleParagraph>
        }
      />
      <FormProvider {...form}>
        <form
          id={formId}
          onSubmit={handleSubmit((fieldData: RepresentativeFormFields) => {
            saveDocumentInfoMutation.mutate(
              {
                documentId,
                body: { merchantDocumentStatus: '서류제출-진행중', ...fieldData },
              },
              {
                onSuccess: onNextPage,
              },
            );
          })}
        >
          <FunnelScrollContainer>
            <StepRenderer
              steps={INPUT_STEPS}
              currentStepIndex={currentStepIndex}
              components={{
                representativeContact: (
                  <ContactInput
                    onValid={() => {
                      if (currentStep === 'representativeContact') {
                        goNextStep();
                      }
                    }}
                  />
                ),
                representativeName: <NameInput />,
                representativeEmail: <EmailInput />,
              }}
            />
          </FunnelScrollContainer>

          {currentStep !== 'representativeContact' && !isLastStep ? (
            <FixedBottomCTA type="button" onClick={goNextStep} takeSpace={false} disabled={!formState.isValid}>
              다음
            </FixedBottomCTA>
          ) : null}

          {isLastStep ? (
            <FixedBottomCTA
              type="submit"
              disabled={!formState.isValid || saveDocumentInfoMutation.isPending}
              loading={saveDocumentInfoMutation.isPending}
              form={formId}
              takeSpace={false}
            >
              다음
            </FixedBottomCTA>
          ) : null}
        </form>
      </FormProvider>
    </>
  );
}
