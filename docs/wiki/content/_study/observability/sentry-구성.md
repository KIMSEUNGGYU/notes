---
title: Sentry 구성
description: 5개 서비스가 프로젝트 하나를 쓰는 배선과 수집 경로
updated: 2026-09-08
order: 1
outline: deep
---
# Sentry 구성

> ishopcare-frontend 5개 서비스 기준. 확인일 2026-08-20 — 코드를 안 본 항목은 ⚠️로 표시.

## 읽기 전에 — 관련 개념


| 여기서 다루는 것           | 개념                                                                                                                                                                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 프로젝트 하나를 5개 서비스가 쓴다 | [조직 구조와 화면 구성](./개념/sentry/07-project)                                                                                                                                                                                                                                        |
| 수집이 세 군데 배선돼 있다     | [수집 경로](./개념/sentry/04-collect)                                                                                                                                                                                                                                               |
| 태그는 붙는데 extra 가 비었다 | [이벤트에 실리는 정보 3종](./개념/sentry/06-scope#_2-담기는-내용-—-태그-·-extra-·-context)                                                                                                                                                                                                       |
| 설정값 현황              | [Level](./개념/sentry/01-sentry#_3-level-—-심각도) · [dataCollection](./개념/sentry/08-quota#_4-datacollection-—-sdk-자동-수집의-스위치) · [성능 트레이싱](./개념/sentry/03-trace) · [Replay](./개념/sentry/01-sentry#_5-replay-—-에러-순간의-화면-녹화) · [소스맵 / release / environment](./개념/sentry/10-deploy) |
| 트레이스 축이 비어 있다는 뜻    | [Observability 의 세 기둥](./개념/observability#세-기둥)                                                                                                                                                                                                                               |


## 프로젝트를 하나로 합쳤다

```
Organization (ishopcare)
└── Project (ishopcare-frontend)   ← DSN·쿼터·알림 규칙이 여기 하나
    └── admin · agency · bank · partners · visit-admin
```

서비스별로 나누지 않고 하나에 모았고, 구분은 `service` 태그가 한다 ([개념의 조직 구조와 화면 구성](./개념/sentry/07-project)). DSN이 동일하고, **partners만 하드코딩·나머지는 env 주입**이다.

활성 범위는 live만. partners는 dev에서도 켜져 있다.

## 수집 배선 세 곳

[수집 경로](./개념/sentry/04-collect)가 어디에 배선돼 있나:

```
자동        instrumentation.ts   onRequestError = Sentry.captureRequestError
직접 호출   GlobalErrorBoundary  onError={Sentry.captureReactException}  (5개 서비스 동일)
직접 호출   queryClient.ts       mutationCache.onError
                                 → sentry-service.ts 의 captureApiError
```

**조회와 저장이 다른 길로 간다.** `queryClient.ts` 가 둘을 갈라 놓았다 (2026-09-08 코드 확인).


|               | 배선                                                             | Sentry 에 남는 것                  |
| ------------- | -------------------------------------------------------------- | ------------------------------ |
| 저장 (mutation) | `mutationCache.onError` → `captureApiError`                    | 태그 3종 + extra. 어느 API 인지 보인다   |
| 조회 (query)    | `throwOnError: true` → ErrorBoundary → `captureReactException` | 어느 컴포넌트인지만. **어느 API 였는지가 없다** |


조회는 데이터가 없으면 화면을 못 그려 fallback UI 로 갈아끼워야 하고, 저장은 화면을 그대로 두고 토스트만 띄우면 된다. **화면 처리 방식이 갈린 결과가 관측 데이터 품질까지 갈랐다** — 의도한 게 아니라 딸려온 것이다.

고칠 길은 둘이다. react-query 의 `queryCache` 에도 `onError` 를 달아 조회 실패를 `captureApiError` 로 태우거나, ErrorBoundary 에서 `ApiError` 인지 보고 갈라 보내거나.

**⚠️ 어느 쪽이든 보내는 자리를 하나로 정하는 게 먼저다.** 지금은 저장이 캐시에서, 조회가 boundary 에서 올라가 자리가 이미 둘이다. 양쪽에서 보내면 사고 하나가 이벤트 둘이 돼 쿼터를 두 배로 먹고 이슈도 갈린다.

거르는 건 3단 중 세 번째만 쓴다 — `shouldSkipReport`가 **500 이상과 401을 스킵**한다.

## 전역 scope 둘

```
SentryUserProvider        로그인 시 setUser · 로그아웃 시 clearUser
instrumentation-client.ts setTags({ service })
```

이슈에서 "누가 겪었나"가 보이는 건 앞의 것 덕분이다.

## 설정값 현황


| 항목                 | 지금                            | 개념                                                                        |
| ------------------ | ----------------------------- | ------------------------------------------------------------------------- |
| `sendDefaultPii`   | 5개 전부 `true` ⚠️ deprecated    | [dataCollection](./개념/sentry/08-quota#_4-datacollection-—-sdk-자동-수집의-스위치) |
| level              | 전부 기본값 `error`                | [Level](./개념/sentry/01-sentry#_3-level-—-심각도)                             |
| `tracesSampleRate` | **5개 전부 미설정**                 | [성능 트레이싱](./개념/sentry/03-trace)                                           |
| Replay (에러 세션)     | 100% · bank·visit-admin은 50%  | [Replay](./개념/sentry/01-sentry#_5-replay-—-에러-순간의-화면-녹화)                  |
| Replay (일반 세션)     | 1%                            | 〃                                                                         |
| 소스맵                | `withSentryConfig` 자동         | [소스맵](./개념/sentry/10-deploy)                                              |
| environment        | `getPhase()` (local/dev/live) | 〃                                                                         |
| release            | ⚠️ 미확인                        | 〃                                                                         |


**트레이싱이 꺼져 있어 성능 데이터가 0이다.** 관측의 세 기둥 중 트레이스 축이 통째로 비어 있고, 프론트 에러를 백엔드 span과 잇는 distributed tracing도 같이 꺼져 있다 (→ [Observability §세 기둥](./개념/observability#세-기둥)).

### 트레이싱을 켜기로 했다 (2026-09-08)

켜면 지금 0인 것 넷이 들어온다 — Web Vitals(LCP·INP·CLS) · API 응답 시간 · 느린 화면 · 백엔드 구간 연결.

<!-- TODO(human): 아래 세 줄을 채운다
비율:
근거:
적용 순서:
-->

같이 해야 할 일 둘 ([성능 트레이싱](./개념/sentry/03-trace)):

- **트랜잭션 이름 정규화** — `beforeStartSpan` 으로 `/tasks/:id` 형태로. 안 하면 성능 목록이 작업 개수만큼 늘어난다
- `**tracePropagationTargets` 에 우리 API 도메인 넣기** — 백엔드도 Sentry 를 쓰므로 distributed tracing 이 실제로 이어진다 (2026-09-09 확인). 다만 헤더가 붙는 만큼 **서버 CORS 허용 목록에도 들어가 있어야** 한다

`**sendDefaultPii`는 v11에서 제거된다.** 5개 서비스가 전부 이 옵션을 쓰고 있어서 `dataCollection`으로 옮겨야 한다. 지금 `true`라 여덟 카테고리가 전부 켜진 상태이므로, 옮길 때 카테고리별로 필요한 것만 남기면 수집 범위를 좁히는 기회가 된다.

## 태그는 붙는데 extra가 비어 있다

`api.endpoint` 등 태그는 잘 붙어서 검색·분포 확인이 된다. 반면 **extra는 태그와 중복되는 3개뿐**이다.

[개념의 태그 / extra / context](./개념/sentry/06-scope#_2-담기는-내용-—-태그-·-extra-·-context)의 역할 분담대로면 extra·context가 "열었을 때 원인을 알 수 있나"를 담당해야 하는데, 지금은 응답 본문(`details`·에러 코드)과 요청 내용이 안 실려서 원인 파악이 이슈 밖으로 나간다.

## Replay로 응답 본문을 봤다

`networkDetailAllowUrls`에 modusign이 등록돼 있어 Replay의 Network 탭에서 요청/응답 본문이 보인다. modusign 409의 응답 본문을 여기서 확인했다.

extra가 비어 있는 지금, 응답 본문을 볼 수 있는 유일한 경로가 이쪽이다.



## 내가 

> 이 부분은 내가 따로 추가하는거니깐 너가 맥락을 보고 알아서 정리할떄 참고해 

### 모니터링? Alert?? 

```
⏺ 1. Monitor 타입 — 다섯 가지입니다

  Error         에러/이슈가 났다 자체          우리 Error Monitor (연결 안 함)
  Metric        숫자가 임계를 넘었다           우리 셋
  Cron          정기 작업이 제때 안 돌았다     백엔드 배치용, FE엔 해당 없음
  Uptime        URL을 찔러 응답하나 본다       FE에 값이 있습니다
  Mobile Build  앱 빌드 지표                  해당 없음

  Uptime이 우리에게 빠진 조각입니다. 사이트가 아예 안 뜨면 브라우저에서 에러조차 안 올라와서, 지금 셋 다 조용합니다. 가장 나쁜 장애를 못 잡는
  구조입니다.

  2. 지금 방식은 흔한 출발점이 맞습니다 — 다만 한계가 셋

  한계 1 — 사람 수를 안 봅니다. 이게 제일 실질적입니다. 실측을 보면요.

               7일 건수   겪은 사람   1인당
  admin          387        75명      5.2건
  partners       303       148명      2.0건

  어드민은 한 사람이 평균 5.2번 겪습니다. 즉 "5분에 5건"이 한 사람의 재시도일 수 있습니다. count() 대신 count_unique(user)로 바꾸면 "몇 명이
  겪었나"가 기준이 돼서 오탐이 줄어듭니다.

  한계 2 — 트래픽 변동을 안 봅니다. 평일 낮 5건과 새벽 5건은 다른 뜻인데 같게 봅니다. Sentry가 Percent Change 임계("지난주 같은 시간 대비 N%
  증가")를 지원합니다 — 이 UI에서 되는지는 제가 확인 못 했습니다.

  한계 3 — 0건을 못 잡습니다. 위의 Uptime 얘기입니다.

  그래서 제 추천 순서

  1. 지금 그대로 며칠 둡니다 — 임계값 5가 맞는지는 실제로 몇 번 울리는지로만 압니다. 어드민은 아직 한 번도 안 울렸고요
  2. 어드민만 count_unique(user)로 바꿔볼 만합니다 — 1인당 5.2건이라 오탐 가능성이 제일 큽니다
  3. Uptime Monitor 추가 — 지금 아무도 안 보는 자리입니다

  지금 바로 손대는 것보다 1번(며칠 관찰)을 권합니다. 숫자 없이 임계를 조정하면 또 추측이 됩니다.
```



&nbsp;