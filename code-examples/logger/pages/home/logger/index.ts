import { makeLogger } from 'lib/logger';
import type { HomeEventParams } from './types';

export { LABEL, SECTION_TYPE } from './constants';
export type { HomeEventParams, Label, SectionType } from './types';

export const homeLogger = makeLogger<HomeEventParams>({
  page_type: 'main',
});
