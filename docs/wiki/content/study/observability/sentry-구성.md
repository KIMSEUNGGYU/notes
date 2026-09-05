---
title: Sentry 구성
description: 5개 서비스가 프로젝트 하나를 쓰는 배선과 수집 경로
updated: 2026-08-20
order: 1
outline: deep
---

# Sentry 구성

> ishopcare-frontend 5개 서비스 기준. 확인일 2026-08-20 — 코드를 안 본 항목은 ⚠️로 표시.

## 읽기 전에 — 관련 개념

| 여기서 다루는 것 | 개념 |
| --- | --- |
| 프로젝트 하나를 5개 서비스가 쓴다 | [조직 구조와 화면 구성](./개념/sentry#_10-조직-구조와-화면-구성) |
| 수집이 세 군데 배선돼 있다 | [수집 경로](./개념/sentry#_5-수집-경로) |
| 태그는 붙는데 extra 가 비었다 | [이벤트에 실리는 정보 3종](./개념/sentry#_7-이벤트에-실리는-정보-3종-—-태그-extra-context) |
| 설정값 현황 | [Level](./개념/sentry#_8-level-—-심각도) · [dataCollection](./개념/sentry#_14-datacollection-—-sdk-자동-수집의-스위치) · [성능 트레이싱](./개념/sentry#_17-성능-트레이싱-—-tracessamplerate) · [Replay](./개념/sentry#_18-replay-—-에러-순간의-화면-녹화) · [소스맵 / release / environment](./개념/sentry#_19-소스맵-release-environment) |
| 트레이스 축이 비어 있다는 뜻 | [Observability 의 세 기둥](./개념/observability#세-기둥) |

## 프로젝트를 하나로 합쳤다

```
Organization (ishopcare)
└── Project (ishopcare-frontend)   ← DSN·쿼터·알림 규칙이 여기 하나
    └── admin · agency · bank · partners · visit-admin
```

서비스별로 나누지 않고 하나에 모았고, 구분은 `service` 태그가 한다 ([개념의 조직 구조와 화면 구성](./개념/sentry#_10-조직-구조와-화면-구성)). DSN이 동일하고, **partners만 하드코딩·나머지는 env 주입**이다.

활성 범위는 live만. partners는 dev에서도 켜져 있다.

## 수집 배선 세 곳

[수집 경로](./개념/sentry#_5-수집-경로)가 어디에 배선돼 있나:

```
자동        instrumentation.ts   onRequestError = Sentry.captureRequestError
직접 호출   GlobalErrorBoundary  onError={Sentry.captureReactException}  (5개 서비스 동일)
직접 호출   queryClient.ts       mutationCache.onError
                                 → sentry-service.ts 의 captureApiError
```

**ErrorBoundary 경로가 정보를 잃는 자리다.** query 실패를 `throwOnError: true`로 boundary까지 던지면, 원인이 API인데 Sentry에는 렌더 에러로 남아 어느 엔드포인트인지가 안 실린다. `captureApiError`를 탄 것만 API 정보를 갖는다.

거르는 건 3단 중 세 번째만 쓴다 — `shouldSkipReport`가 **500 이상과 401을 스킵**한다.

## 전역 scope 둘

```
SentryUserProvider        로그인 시 setUser · 로그아웃 시 clearUser
instrumentation-client.ts setTags({ service })
```

이슈에서 "누가 겪었나"가 보이는 건 앞의 것 덕분이다.

## 설정값 현황

| 항목 | 지금 | 개념 |
| --- | --- | --- |
| `sendDefaultPii` | 5개 전부 `true` ⚠️ deprecated | [dataCollection](./개념/sentry#_14-datacollection-—-sdk-자동-수집의-스위치) |
| level | 전부 기본값 `error` | [Level](./개념/sentry#_8-level-—-심각도) |
| `tracesSampleRate` | **5개 전부 미설정** | [성능 트레이싱](./개념/sentry#_17-성능-트레이싱-—-tracessamplerate) |
| Replay (에러 세션) | 100% · bank·visit-admin은 50% | [Replay](./개념/sentry#_18-replay-—-에러-순간의-화면-녹화) |
| Replay (일반 세션) | 1% | 〃 |
| 소스맵 | `withSentryConfig` 자동 | [소스맵](./개념/sentry#_19-소스맵-release-environment) |
| environment | `getPhase()` (local/dev/live) | 〃 |
| release | ⚠️ 미확인 | 〃 |

**트레이싱이 꺼져 있어 성능 데이터가 0이다.** 관측의 세 기둥 중 트레이스 축이 통째로 비어 있고, 프론트 에러를 백엔드 span과 잇는 distributed tracing도 같이 꺼져 있다 (→ [Observability §세 기둥](./개념/observability#세-기둥)).

**`sendDefaultPii`는 v11에서 제거된다.** 5개 서비스가 전부 이 옵션을 쓰고 있어서 `dataCollection`으로 옮겨야 한다. 지금 `true`라 여섯 카테고리가 전부 켜진 상태이므로, 옮길 때 카테고리별로 필요한 것만 남기면 수집 범위를 좁히는 기회가 된다.

## 태그는 붙는데 extra가 비어 있다

`api.endpoint` 등 태그는 잘 붙어서 검색·분포 확인이 된다. 반면 **extra는 태그와 중복되는 3개뿐**이다.

[개념의 태그 / extra / context](./개념/sentry#_7-이벤트에-실리는-정보-3종-—-태그-extra-context)의 역할 분담대로면 extra·context가 "열었을 때 원인을 알 수 있나"를 담당해야 하는데, 지금은 응답 본문(`details`·에러 코드)과 요청 내용이 안 실려서 원인 파악이 이슈 밖으로 나간다.

## Replay로 응답 본문을 봤다

`networkDetailAllowUrls`에 modusign이 등록돼 있어 Replay의 Network 탭에서 요청/응답 본문이 보인다. modusign 409의 응답 본문을 여기서 확인했다.

extra가 비어 있는 지금, 응답 본문을 볼 수 있는 유일한 경로가 이쪽이다.
