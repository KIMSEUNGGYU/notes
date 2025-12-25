---
title: 기본 개념
description: Best Template 접근법과 코드 작성 원칙
head:
  - - meta
    - name: keywords
      content: axios, interceptor, react, typescript

---

# 기본 개념

## 왜 이 문서를 만들었나요?

저는 공부할 때 **Best Template**을 만들어두고 참고하는 방식을 선호합니다.

프론트엔드 개발하다 보면 비슷한 작업이 반복됩니다. API 호출, 에러 처리, 상태 관리... 이런 것들을 매번 새로 고민하는 대신, 잘 작동하는 템플릿을 만들어두고 재사용합니다.

프로젝트를 하다가 더 나은 방법을 발견하면 템플릿을 업데이트합니다. 이렇게 하면 **코드가 저와 함께 성장**합니다.

이 문서는 제 공부 방법의 결과물입니다. 다른 개발자들에게도 도움이 될 것 같아 공유합니다.

## 코드 작성 원칙

### 복잡해지면 데이터로 관리

코드가 복잡해질수록 데이터로 관리하는 게 낫다는 걸 배웠습니다.

```typescript
// ❌ 조건문
if (status === 'pending') return '대기중'
if (status === 'approved') return '승인됨'
if (status === 'rejected') return '거부됨'

// ✅ 데이터
const STATUS_MAP = {
  pending: '대기중',
  approved: '승인됨',
  rejected: '거부됨'
} as const
```

상태가 추가되면 한 곳만 수정하면 됩니다.
