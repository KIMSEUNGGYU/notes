import { At } from '@tossteam/t2-date';

export function formatDate(date: string, format = 'yyyy-MM-dd'): string {
  const dateObj = new Date(date);
  const at = new At(dateObj);
  return at.toFormat(format);
}

export function formatBusinessNumber(value: string): string {
  const onlyNumbers = value.replace(/\D/g, '');
  const lengthLimited = onlyNumbers.slice(0, 10);

  if (lengthLimited.length < 4) {
    return lengthLimited;
  }

  if (lengthLimited.length < 6) {
    return `${lengthLimited.slice(0, 3)}-${lengthLimited.slice(3)}`;
  }

  return `${lengthLimited.slice(0, 3)}-${lengthLimited.slice(3, 5)}-${lengthLimited.slice(5)}`;
}
