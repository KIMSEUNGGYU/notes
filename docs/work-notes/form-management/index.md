---
title: 폼 관리
description: 복잡한 폼 구현 경험과 베스트 프랙티스
---

# 폼 관리

프론트엔드에서 폼 관리는 가장 복잡한 작업 중 하나입니다. 여기서는 실무에서 배운 폼 관리 노하우를 정리합니다.

## 주요 주제

### 기본 개념
- 폼 상태 관리
- 유효성 검증
- 에러 핸들링
- 제출 처리

### 실전 활용
- React Hook Form 활용
- Zod를 이용한 스키마 검증
- 복잡한 다단계 폼 구현
- 동적 필드 관리

## 폼 관리의 핵심 원칙

1. **단일 진실 공급원**: 폼 상태를 한 곳에서 관리
2. **선언적 검증**: 스키마 기반 검증 로직
3. **사용자 친화적**: 명확한 에러 메시지와 피드백
4. **성능 최적화**: 불필요한 리렌더링 방지

## 예제 코드

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다')
})

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  })

  return (
    <form onSubmit={handleSubmit(data => console.log(data))}>
      <input {...register('email')} />
      {errors.email && <p>{errors.email.message}</p>}

      <input type="password" {...register('password')} />
      {errors.password && <p>{errors.password.message}</p>}

      <button type="submit">로그인</button>
    </form>
  )
}
```
