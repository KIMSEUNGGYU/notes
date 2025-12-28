import type { EventParams } from 'lib/logger';
import type { LABEL, SECTION_TYPE } from './constants';

export type SectionType = (typeof SECTION_TYPE)[keyof typeof SECTION_TYPE];

export type Label = (typeof LABEL)[keyof typeof LABEL];

/**
 * HomePage 이벤트 파라미터 (사용자 전달용)
 * - EventParams 기반으로 Home 페이지 전용 타입 강제
 * - section_type, label만 전달 (device, page_type는 자동)
 *   ** page_type 은 makeLogger 로 homePage 전용 로거 생성할때
 */
export interface HomeEventParams extends EventParams {
  section_type: SectionType;
  label: Label;
}
