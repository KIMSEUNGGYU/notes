---
title: 
description: 
draft: true
todo: 
 - 백업??
---

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
