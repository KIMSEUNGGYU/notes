import { is } from '@tossteam/is';
import { formatDate } from './format';

export class SearchParamsBuilder {
  private searchParams = new URLSearchParams();

  append(name: string, value: string): this {
    if (is.emptyString(value)) return this;

    this.searchParams.append(name, value);
    return this;
  }

  appendArray(name: string, values: string[] | undefined | null): this {
    if (is.falsy(values) || is.emptyArray(values)) return this;

    for (const value of values) {
      this.searchParams.append(name, value);
    }
    return this;
  }

  appendDate(name: string, date: Date | undefined | null, format = 'yyyy-MM-dd'): this {
    if (is.falsy(date)) return this;

    this.searchParams.append(name, formatDate(date.toISOString(), format));
    return this;
  }

  appendPageOffset(page: number | undefined, pageSize: number): this {
    if (is.falsy(page)) return this;

    const offset = (Math.max(page, 1) - 1) * pageSize;
    this.searchParams.append('offset', offset.toString());
    this.searchParams.append('pageSize', pageSize.toString());
    return this;
  }

  build(): URLSearchParams {
    return this.searchParams;
  }
}
