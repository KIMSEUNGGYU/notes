import { getPhase } from '@ishopcare/phase';
import { ConsoleLogger } from './ConsoleLogger';
import { combineLoggers } from './combineLoggers';
import { GALogger } from './GALogger';
import type { EventParams, Logger, MakeLoggerOptions } from './types';

/**
 * Phase에 따라 적절한 로거 생성
 *
 * - local: ConsoleLogger (콘솔만)
 * - dev: ConsoleLogger + GALogger (디버깅 + 분석)
 * - live: GALogger (분석만)
 *
 * 모든 로그에 자동으로 포함되는 필수 필드:
 * - device: 자동 감지 (pcweb/moweb)
 * - page_type: pageType 옵션으로 설정
 * - section_type: logClick 호출 시 전달
 * - label: logClick 호출 시 전달
 *
 * @param options - pageType 필수, 추가 커스텀 필드 확장 가능
 *
 * @example
 * ```typescript
 * // 페이지별 로거 생성
 * const homeLogger = makeLogger<HomeUserEventParams>({
 *   pageType: 'home',
 *   custom_field: 'value'
 * });
 *
 * homeLogger.log('page_view');
 * // → { device: 'moweb', page_type: 'home', custom_field: 'value', event: 'page_view' }
 *
 * homeLogger.logClick({ section_type: 'gnb', label: '프로모션' });
 * // → { device: 'moweb', page_type: 'home', custom_field: 'value', section_type: 'gnb', label: '프로모션' }
 * ```
 */
export function makeLogger<TEventParams extends EventParams = EventParams>(
  options: MakeLoggerOptions,
): Logger<TEventParams> {
  const phase = getPhase();

  switch (phase) {
    case 'local':
      return new ConsoleLogger(options);
    case 'dev':
      return combineLoggers(new ConsoleLogger(options), new GALogger(options));
    case 'live':
      return new GALogger(options);
  }
}
