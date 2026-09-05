---
title: fingerprint 적용
description: stack 그룹핑이 우리 구조에서 틀리는 이유와 덮어쓰기
updated: 2026-08-20
outline: deep
---

# fingerprint 적용

> 개념은 [Sentry 의 fingerprint](../개념/sentry#_2-fingerprint-—-이슈-그룹핑-키). 여기는 그걸 우리 구조에 대본 결과.

## 우리 구조에서는 양방향으로 틀린다

기본 fingerprint는 "같은 코드 위치 = 같은 버그"를 가정한다. 우리 API 에러는 **전부 `HttpClient.ts` 한 줄에서 `throw new ApiError(...)`로 태어나서** 그 가정이 깨진다.

```
다른 원인을 뭉친다  /tasks 400 도 /settlements 404 도 stack 이 같아 한 이슈에
같은 원인을 쪼갠다  FRONTEND-4 와 5D 는 같은 modusign 409 인데
                    ky 내부 stack 라인 차이로 두 이슈로 갈라져 있었다  (2026-06 실측)
```

뭉치는 쪽은 resolve를 무의미하게 만들고(하나 고쳐도 다른 원인이 regression으로 되살림), 쪼개는 쪽은 같은 문제의 규모를 못 세게 만든다.

## 먼저 볼 것 — 코드 없이 되는 쪽

"같은 원인이 쪼개진다"(FRONTEND-4/5D)는 **Stack Trace Rules로 배포 없이 풀릴 수 있다.** 프로젝트 설정에서 `ky` 같은 라이브러리 내부 프레임을 그룹핑 계산에서 빼면, 그 안의 줄 번호가 달라도 한 이슈로 묶인다 ([개념의 서버측 규칙](../개념/sentry#코드를-안-고치는-길-—-서버측-규칙)).

다만 **"다른 원인이 뭉친다"는 이걸로 안 풀린다** — 프레임을 빼도 `HttpClient.ts` 한 줄은 그대로 남아 모든 API 에러가 여전히 같은 stack이다. 그쪽은 SDK 덮어쓰기가 필요하다.

```
같은 원인이 쪼개짐  → Stack Trace Rules (배포 없음)
다른 원인이 뭉침    → fingerprint 덮어쓰기 (배포 필요)
```

## 덮어쓸 키 — 같은 API + 같은 상태코드

```ts
Sentry.captureException(error, {
  fingerprint: ['POST', '/v2/tasks/:id', '400'],
});
```

"같은 API + 같은 상태코드 = 같은 문제"가 우리 도메인의 정의다. 이슈 하나가 엔드포인트 하나가 된다.

`default` 자리표시자는 안 쓴다 — stack이 다 같아 앞쪽 값이 늘 똑같으니 더 갈리는 효과가 없고, 번들이 바뀔 때 이슈가 쪼개질 위험만 남는다.

**경로 정규화가 세트다.** `/tasks/12345`를 그대로 키에 넣으면 ID마다 이슈가 새로 생겨 반대로 폭발한다. 숫자 세그먼트를 `:id`로 치환한다.

## 제목은 따로 손봐야 한다

fingerprint는 그룹만 가르고 제목은 그대로다 ([개념의 이슈 제목](../개념/sentry#_3-이슈-제목-—-fingerprint가-못-바꾼다)). 지금 제목이 이렇게 나오는 이유:

```
ApiError: 진행중 상태에만 저장 가능합니다
└ name 이 'ApiError' 고정 · message 가 백엔드 문장
```

제목까지 바꾸려면 에러 이름을 직접 만들어야 한다. 계획은 `[400] POST /v2/tasks/:id`.

## 배포 순서

fingerprint는 이벤트를 **보내는 순간 박제**된다. 배포해도 기존 이슈는 재편되지 않는다.

```
1. fingerprint 덮어쓰기 배포
2. 새 이벤트부터 엔드포인트 단위로 갈리기 시작
3. 옛 거대 이슈는 resolve 로 닫는다  ← 안 닫으면 목록에 계속 남는다
```

## 이게 풀려야 알림을 건다

이슈가 뭉쳐 있는 동안은 "ApiError 급증" 알림이 어느 API인지 안 알려줘서 열어봐야 안다. **이슈 = 엔드포인트가 된 뒤에야 "특정 API 급증" 알림이 의미를 갖는다** ([개념의 알림](../개념/sentry#_13-알림-alert)).

## 뭉친 이슈 안을 들여다보는 법

정리 전까지는 이슈 상세의 **태그 분포**로 안을 본다. 한 이슈에 어떤 `api.endpoint`가 섞여 있는지 통계로 나온다.

검색으로 특정 건을 세는 것도 같은 우회다. 2026-06 modusign 타임아웃을 셀 때 쓴 쿼리:

```
error.type:TimeoutError message:*modusign* service:partners
```

둘 다 이슈가 안 갈려 있어서 필요한 우회다. fingerprint가 정리되면 목록에서 바로 보인다.
