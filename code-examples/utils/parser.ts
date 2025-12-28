import { is } from '@tossteam/is';
import { createParser } from 'nuqs';
import { formatDate } from './format';

export const parseAsDate = createParser({
  // @note parse 는 (URL → JavaScript 값)
  parse: (value: string) => {
    if (is.falsy(value)) return null;
    return new Date(value);
  },
  // @note serialize 는 (JavaScript → URL)
  serialize: (value: Date) => {
    return formatDate(value.toISOString(), 'yyyy-MM-dd');
  },
});
