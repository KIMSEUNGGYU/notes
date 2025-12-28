import type { DEVICE, EVENT_NAME } from './constants';

export interface Logger<TEventParams = EventParams> {
  log(name: string, params?: LoggerParams): void;
  logClick(params: TEventParams): void;
}

export type LoggerParams = Record<string, string | number | boolean>;

export type Device = (typeof DEVICE)[keyof typeof DEVICE];
export type EventName = (typeof EVENT_NAME)[keyof typeof EVENT_NAME];

export interface FullEventParams {
  device: Device;
  page_type: string;
  section_type: string;
  label: string;
}

export type EventParams = Omit<FullEventParams, 'device' | 'page_type'>;

export type BaseLoggerParams = { page_type: string } & LoggerParams;

/**
 * makeLogger 설정 옵션
 * - pageType: 페이지 구분 (필수, 모든 이벤트에 page_type으로 포함)
 * - 추가 커스텀 필드도 확장 가능
 */
export interface MakeLoggerOptions extends LoggerParams {
  page_type: string;
}
