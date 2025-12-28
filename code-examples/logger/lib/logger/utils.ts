import { BREAKPOINTS } from 'styles/responsive';
import { DEVICE } from './constants';
import type { Device } from './types';

export function getDevice(): Device {
  if (typeof window === 'undefined') {
    return DEVICE.PC_WEB;
  }

  const isPc = window.matchMedia(`(min-width: ${BREAKPOINTS.mobile + 1}px)`).matches;

  return isPc ? DEVICE.PC_WEB : DEVICE.MOBILE_WEB;
}
