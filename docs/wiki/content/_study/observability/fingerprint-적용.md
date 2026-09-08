---
title: fingerprint 적용
description: stack 그룹핑이 우리 구조에서 틀리는 이유와 덮어쓰기
updated: 2026-09-08
order: 2
outline: deep
---

# fingerprint 적용

> 개념을 우리 구조에 대본 결과.

## 읽기 전에 — 관련 개념

| 여기서 다루는 것 | 개념 |
| --- | --- |
| 이슈가 갈리는 규칙 | [fingerprint](./개념/sentry/02-fingerprint) |
| 코드 없이 푸는 길 | [서버측 규칙](./개념/sentry/02-fingerprint#_3-코드를-안-고치는-길-—-서버측-규칙) |
| 제목은 왜 따로 손봐야 하나 | [이슈 제목](./개념/sentry/02-fingerprint#_4-이슈-제목-—-fingerprint-가-못-바꾼다) |
| 이게 풀려야 알림을 건다 | [알림](./개념/sentry/05-alert#_2-sentry-에서-알림-걸기) |

## 우리 구조에서는 양방향으로 틀린다

기본 fingerprint는 "같은 코드 위치 = 같은 버그"를 가정한다. 우리 API 에러는 **서비스마다 한 곳에서 한꺼번에 태어나서** 그 가정이 깨진다 — admin·agency·bank 는 `HttpClient.ts` 의 `throw new ApiError(...)` 한 줄, partners·visit-admin 은 ky 가 던지는 `HTTPError` 다.

```
다른 원인을 뭉친다  /tasks 400 도 /settlements 404 도 stack 이 같아 한 이슈에
같은 원인을 쪼갠다  FRONTEND-4 와 5D 는 같은 modusign 409 인데
                    ky 내부 stack 라인 차이로 두 이슈로 갈라져 있었다  (2026-06 실측)
```

뭉치는 쪽은 resolve를 무의미하게 만들고(하나 고쳐도 다른 원인이 regression으로 되살림), 쪼개는 쪽은 같은 문제의 규모를 못 세게 만든다.

## 지금 코드는 어디까지 와 있나

5개 서비스 `sentry-service.ts` 실측 (2026-09-08).

```
fingerprint      5개 전부 없음 — 아래 계획은 아직 코드에 안 들어갔다
태그 3종         5개 전부 동일 — api.endpoint · api.method · api.status
500·401 스킵     5개 전부 동일
경로 정규화      없음 — new URL(url).pathname 을 그대로 태그에 넣는다
```

정보는 이미 다 잡고 있는데 **태그로만 보내고 fingerprint 로는 안 보낸다.** 그래서 이슈는 여전히 stack 으로 뭉치고, 안을 보려면 태그 분포를 거쳐야 한다.

에러 클래스는 두 갈래다 — 이름을 바꾸는 방법이 갈리는 지점이다.

| 서비스 | 에러 | 이슈 제목 |
| --- | --- | --- |
| admin · agency · bank | 자체 `ApiError` (`readonly name = 'ApiError'`) | `ApiError: {백엔드 문장}` |
| partners · visit-admin | ky 의 `HTTPError` 를 그대로 | `HTTPError: {ky 문장}` |

## 먼저 볼 것 — 코드 없이 되는 쪽

"같은 원인이 쪼개진다"(FRONTEND-4/5D)는 **Stack Trace Rules로 배포 없이 풀릴 수 있다.** 프로젝트 설정에서 `ky` 같은 라이브러리 내부 프레임을 그룹핑 계산에서 빼면, 그 안의 줄 번호가 달라도 한 이슈로 묶인다 ([개념의 서버측 규칙](./개념/sentry/02-fingerprint#_3-코드를-안-고치는-길-—-서버측-규칙)).

다만 **"다른 원인이 뭉친다"는 이걸로 안 풀린다** — 프레임을 빼도 `HttpClient.ts` 한 줄은 그대로 남아 모든 API 에러가 여전히 같은 stack이다. 그쪽은 SDK 덮어쓰기가 필요하다.

```
같은 원인이 쪼개짐  → Stack Trace Rules (배포 없음)
다른 원인이 뭉침    → fingerprint 를 우리가 준다
```

**뭉치는 쪽도 배포 없이 될 수 있다.** Fingerprint Rules 는 값에 `tags.태그이름` 자리표시자를 쓸 수 있고, 우리는 이미 `api.method` · `api.endpoint` · `api.status` 를 태그로 붙이고 있다 (2026-09-08 공식 문서 확인).

```
error.type:ApiError -> {{ tags.api.method }}, {{ tags.api.endpoint }}, {{ tags.api.status }}
```

다만 **지금 태그로는 안 된다** — `api.endpoint` 가 `new URL(url).pathname` 그대로라 `/tasks/1024` 가 들어간다. 이 값으로 가르면 이슈가 작업 수만큼 생긴다.

```
태그 경로 정규화 (배포 필요)  →  그 뒤로는 서버 규칙만으로 그룹핑을 바꿀 수 있다
```

태그를 잘 붙여두는 값이 여기 있다. 태그가 없으면 서버 규칙이 쓸 재료가 없어 코드부터 고쳐야 한다.

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

fingerprint는 그룹만 가르고 제목은 그대로다 ([개념의 이슈 제목](./개념/sentry/02-fingerprint#_4-이슈-제목-—-fingerprint-가-못-바꾼다)). 지금 제목이 이렇게 나오는 이유:

```
ApiError: 진행중 상태에만 저장 가능합니다
└ name 고정 · message 가 백엔드 문장
```

제목을 가르는 값이 `name` 인데 우리는 그게 고정이라, 실제로 목록을 가르는 건 **백엔드가 보낸 문장뿐이다.** 백엔드가 문구를 다듬으면 우리 이슈 목록이 같이 흔들린다.

제목까지 바꾸려면 에러 이름을 직접 만들어야 한다. 계획은 `[400] POST /v2/tasks/:id`.

## 배포 순서

fingerprint는 이벤트를 **보내는 순간 박제**된다. 배포해도 기존 이슈는 재편되지 않는다.

```
1. fingerprint 덮어쓰기 배포
2. 새 이벤트부터 엔드포인트 단위로 갈리기 시작
3. 옛 거대 이슈는 resolve 로 닫는다  ← 안 닫으면 목록에 계속 남는다
```

## 이게 풀려야 알림을 건다

이슈가 뭉쳐 있는 동안은 "ApiError 급증" 알림이 어느 API인지 안 알려줘서 열어봐야 안다. **이슈 = 엔드포인트가 된 뒤에야 "특정 API 급증" 알림이 의미를 갖는다** ([개념의 알림](./개념/sentry/05-alert#_2-sentry-에서-알림-걸기)).

## 뭉친 이슈 안을 들여다보는 법

정리 전까지는 이슈 상세의 **태그 분포**로 안을 본다. 한 이슈에 어떤 `api.endpoint`가 섞여 있는지 통계로 나온다.

검색으로 특정 건을 세는 것도 같은 우회다. 2026-06 modusign 타임아웃을 셀 때 쓴 쿼리:

```
error.type:TimeoutError message:*modusign* service:partners
```

둘 다 이슈가 안 갈려 있어서 필요한 우회다. fingerprint가 정리되면 목록에서 바로 보인다.
