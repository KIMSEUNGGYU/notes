---
title: 부록 C — errorCopy 중앙 관리
description: kind → 사용자 메시지 맵으로 일관 UX 확보
outline: deep
---

# 부록 C — errorCopy 중앙 관리

> 메인 [§1 AppError](./)의 `kind`를 사용자에게 보여줄 메시지로 매핑한다.

---

## 1. errorCopy 맵

**적용 위치** — `src/lib/error/errorCopy.ts`

```typescript
import type { AppErrorKind } from './AppError';

export const errorCopy: Record<
  AppErrorKind,
  { title: string; desc?: string; actionLabel?: string }
> = {
  Auth: { title: '로그인이 필요합니다', desc: '세션이 만료되었어요.' },
  NotFound: { title: '찾을 수 없어요', desc: '요청한 리소스가 없어요.' },
  Network: { title: '네트워크 오류', desc: '인터넷 연결을 확인해주세요.' },
  Server: { title: '서버에 문제가 있어요', desc: '잠시 후 다시 시도해주세요.' },
  InvalidData: { title: '데이터가 유효하지 않아요', desc: '다시 시도하거나 문의해주세요.' },
  Unknown: { title: '문제가 발생했어요', desc: '잠시 후 다시 시도해주세요.' },
};
```

## 2. 사용 — fallback UI / 토스트

```tsx
function FullScreenError({ error }: { error: AppError }) {
  const copy = errorCopy[error.kind];
  return (
    <div>
      <h2>{copy.title}</h2>
      {copy.desc && <p>{copy.desc}</p>}
    </div>
  );
}
```

```tsx
// 토스트에서도 같은 맵 활용
function showAppErrorToast(error: AppError) {
  const copy = errorCopy[error.kind];
  toast({ title: copy.title, description: copy.desc });
}
```

---

## 왜 중앙 관리?

- 토스트 / 페이지 fallback / 모달이 같은 메시지를 공유 → **일관된 UX**
- 카피라이팅 수정 시 **한 곳만** 변경
- `Record<AppErrorKind, ...>`이므로 새 `kind` 추가 시 **TypeScript가 누락 강제**

## 주의

- 서버가 의미 있는 message를 주면 `errorCopy[kind].title` 대신 `error.message`를 우선 표시하는 정책도 가능 — 프로젝트마다 결정
- `actionLabel`을 활용해 "다시 시도", "로그인" 같은 CTA를 같이 두면 fallback UI 작성이 단순해진다
