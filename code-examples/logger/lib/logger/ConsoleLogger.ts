import { EVENT_NAME } from './constants';
import type { BaseLoggerParams, EventParams, Logger, LoggerParams } from './types';
import { getDevice } from './utils';

/**
 * 콘솔 로거
 */
export class ConsoleLogger<TEventParams extends EventParams = EventParams> implements Logger<TEventParams> {
  constructor(private readonly baseParams: BaseLoggerParams) {}

  /**
   * 기본 필드를 포함한 로그 파라미터 생성
   * - device: 자동 감지 (런타임)
   * - baseParams: page_type + 커스텀 필드
   * - params: 호출 시 전달된 파라미터
   */
  private getBaseParams(params?: LoggerParams): LoggerParams {
    return {
      device: getDevice(),
      ...this.baseParams,
      ...params,
    };
  }

  log(name: string, params?: LoggerParams) {
    console.table({
      event: name,
      timestamp: new Date().toISOString(),
      ...this.getBaseParams(params),
    });
  }

  logClick(params: TEventParams) {
    this.log(EVENT_NAME.CLICK, params as LoggerParams);
  }
}
