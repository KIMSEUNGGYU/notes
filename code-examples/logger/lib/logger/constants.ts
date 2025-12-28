/**
 * Device 타입 상수
 * - pcweb: PC 웹
 * - moweb: 모바일 웹
 */
export const DEVICE = {
  PC_WEB: 'pcweb',
  MOBILE_WEB: 'moweb',
} as const;

/**
 * GA 이벤트명 상수
 */
export const EVENT_NAME = {
  CLICK: 'click_interaction',
  PAGE_VIEW: 'page_view',
} as const;
