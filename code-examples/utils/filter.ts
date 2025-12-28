import { is } from '@tossteam/is';

/**
 * 필터 객체의 배열 속성들을 정렬하여 TanStack Query의 queryKey 정규화
 *
 * @note TanStack Query의 queryKey는 객체 속성 순서는 무시하지만 배열 요소 순서는 구분하므로
 * 동일한 필터 값이 다른 순서로 들어와도 같은 쿼리 키를 생성하기 위해 배열을 정렬
 */
export const normalizeFilters = <T extends Record<string, unknown>>(filters: T, arrayKeys: (keyof T)[]): T => {
  const normalized = { ...filters };

  for (const key of arrayKeys) {
    const value = normalized[key];
    if (is.array(value)) {
      normalized[key] = [...value].sort() as T[typeof key];
    }
  }

  return normalized;
};
