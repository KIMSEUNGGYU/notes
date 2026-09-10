---
title: Sentry
description: 에러 수집 도구가 이벤트를 이슈로 묶어 보여주기까지
order: 1
outline: deep
---
# Sentry

> 참고: [우아한형제들 Sentry 최적화](https://techblog.woowahan.com/21604/) · [카카오페이 FE Sentry](https://tech.kakaopay.com/post/frontend-sentry-monitoring/)

## 0. Sentry란 — 전반적인 그림

프로덕션에서 난 에러를 실시간으로 수집·분석하는 모니터링 플랫폼. 핵심 가치는 "사용자가 알려주기 전에, 재현 없이" 아는 것 — QA에서 재현 안 되는 특정 브라우저·기기·타이밍의 에러가 사용자 화면에서 나는 순간 기록이 남는다.

동작 흐름:

```
앱에서 에러 발생
  → SDK가 이벤트로 만들어 전송 (에러 + 기기·브라우저·OS + breadcrumbs)
  → Sentry 서버가 이슈로 그룹핑
  → 알림 규칙에 걸리면 Slack 등으로 통지
```

**breadcrumbs** — 에러 직전까지의 행적(클릭, 페이지 이동, 콘솔, 네트워크 요청)이 자동 기록돼 이슈에서 보인다. 기본 100개까지 쌓이고(`maxBreadcrumbs`), 이벤트 크기 상한을 넘기면 이벤트가 통째로 버려지니 무한정 늘리면 안 된다. 에러와 무관하게 남기는 로그는 [Logs](#_4-logs-—-sentry가-로그도-받는다) 가 따로 담당한다.

## 1. 이벤트와 이슈 — Sentry의 두 층

```
이벤트 = 에러 발생 1건            (사용자 한 명이 400을 받음 → 이벤트 1개)
이슈   = 같은 원인끼리 묶은 폴더   (목록에서 보는 한 줄)
```

이벤트가 들어올 때마다 Sentry는 "기존 어느 이슈에 넣을까, 새 이슈를 만들까"를 정한다. 이 판정 키가 **fingerprint**다. 목록에서 보고 검색하고 resolve하는 단위는 전부 이슈다.

## 2. SDK 초기화 — instrumentation 파일과 DSN

### instrumentation

**"계측"이라는 뜻의 일반 용어다.** 코드에 관찰 장치를 심어 밖에서 안을 볼 수 있게 만드는 일을 가리키고, OpenTelemetry 같은 관측 표준에서도 같은 말을 쓴다. Next.js가 만든 개념이 아니다.

**Next.js 것은 파일 이름과 실행 시점 규약이다** — "`instrumentation.ts`라는 이름으로 두면 앱 코드보다 먼저 실행시켜줄 테니, 관찰 도구(모니터링·로깅)는 여기서 켜라"는 자리를 정해둔 것. 에러를 잡으려면 에러가 나기 전에 켜져 있어야 해서 `Sentry.init()`이 여기 산다.

Sentry는 그 자리를 빌려 쓸 뿐이라, 다른 관측 도구도 같은 파일에서 켠다.

```
instrumentation-client.ts  → 브라우저에서 앱 번들보다 먼저 실행 (브라우저용 init)
instrumentation.ts         → 서버 프로세스가 뜰 때 1회 실행되는 register()가
                             런타임에 따라 sentry.server.config.ts 또는
                             sentry.edge.config.ts를 import (서버용 init)
```

파일이 3개인 이유: Next.js는 브라우저 / Node 서버 / 엣지 세 런타임에서 돌아서, 런타임마다 init을 따로 한 번씩 해주는 구조다.

### DSN

**Data Source Name.** `Sentry.init({ dsn })`에 넣는, 이벤트를 어느 프로젝트로 보낼지 알려주는 주소 + 공개키다.

```
https://abc123def456@o12345.ingest.sentry.io/7890123
└프로토콜┘ └── 공개키 ──┘└──── Sentry 서버 주소 ────┘└프로젝트 ID┘
```

**비밀키가 아니다** — 브라우저 번들에 어차피 노출되고, DSN으로 할 수 있는 건 "이벤트 넣기"뿐이라 쌓인 데이터를 읽을 수는 없다. 그래서 공개돼도 안전하다고 공식 문서가 명시한다.

(예전 형식에는 공개키 뒤에 비밀키가 하나 더 붙었는데 지금은 폐기됐다.)

## 3. Level — 심각도

`fatal / error(기본) / warning / info / debug`. 이벤트마다 붙는 심각도 분류로, 알림 규칙에서 "fatal만 즉시 알림" 같은 필터로 쓴다.

우아한형제들 기준: 화면 렌더 불가·필수 기능 마비 = fatal / 예상 못한 미처리 에러 = error / 예상 가능하고 영향 없음(타임아웃 등) = warning.

## 4. Logs — Sentry가 로그도 받는다

에러와 별개로 **텍스트 로그를 구조화해서 보내는 기능.** SDK v10.71.0 부터는 기본으로 켜져 있고 옵션 자체가 없다. 9.41.0 ~ 10.70 은 `enableLogs: true` 를 직접 줘야 한다.

```ts
Sentry.logger.info('결제 위젯 로드', { widgetId, retryCount });
```

breadcrumbs와 헷갈리기 쉬운데 성격이 다르다:

```
breadcrumbs  에러 이벤트에 딸려 오는 행적. 에러가 나야 보인다
Logs         에러와 무관하게 독립적으로 쌓인다. 안 터져도 남는다
```

**모든 로그가 그때 활성화된 트레이스에 자동으로 연결된다** — 로그 하나에서 그 요청의 span·에러로 넘어갈 수 있다. 관측의 세 기둥 중 로그 축을 Sentry가 직접 담당하게 된 변화다 (→ [Observability §세 기둥](../observability#세-기둥)).

주의 — 태그는 로그에 안 붙는다. 로그에는 Attributes를 쓴다 (SDK 10.61.0+).

## 5. Replay — 에러 순간의 화면 녹화

에러 발생 세션의 화면을 녹화해 이슈에서 재생한다. 표본 비율을 둘로 나눠 잡는다:

```
replaysOnErrorSampleRate  에러가 난 세션 중 몇 %를 녹화할까
replaysSessionSampleRate  평상시 세션 중 몇 %를 녹화할까
```

`networkDetailAllowUrls`에 등록된 도메인은 요청/응답 본문까지 Replay의 Network 탭에서 보인다 — 외부 연동 실패의 응답 본문을 확인하는 경로가 된다.



&nbsp;

## 내가 알게 된거 

> 너가 알아서 추가로 정리해줘

```
⏺ Sentry 알림 — 지금 이렇게 돼 있습니다

구조

Monitor   무엇을 이상으로 볼지 정한다     예) 5분에 5건 넘으면
Alert     이상이 잡히면 어디로 보낸다     예) Slack #ishopcare_fe_alert + 메일

둘은 따로입니다. Monitor만 있고 Alert에 연결이 안 되면 감지만 하고 조용합니다.

있는 것

Monitors (감지)
  [I-Partners] Critical Error Rate   live · 5분 5건 · service:partners       연결 O
  [Visit-Admin] Critical Error Rate  live · 5분 5건 · service:visit-admin    연결 X
  Error Monitor                      에러 발생 자체                          연결 X

Alerts (알림)
  FE Alert    Slack #ishopcare_fe_alert + 승규님 메일 · live · 매번 알림

어제 두 번 울렸습니다 — 오전 9:47, 오후 4:39. 둘 다 아이파트너스 5분에 7건.

비어 있는 것

최근 30일 live 에러 대비로 보면 이렇습니다.

admin        1,697건    Monitor 없음      ← 제일 많은데 감지기가 없다
partners     1,589건    O · 연결 O
agency         726건    Monitor 없음
visit-admin    179건    O · 연결 X        ← 감지해도 안 울린다

할 것

1. 어드민 Monitor 만들기 — [I-Partners]와 같은 설정에서 service:partners → service:admin
2. 만든 뒤 FE Alert에 연결 — 이걸 빼먹으면 방문관리처럼 조용해집니다
3. 방문관리도 연결 — Monitor는 이미 있으니 연결만 하면 됩니다
4. agency는 정하기 — 726건인데 감지기가 없습니다. 담당이 다르면 채널도 달라질 수 있어 승규님 판단입니다
5. Error Monitor는 그대로 둡니다 — 지금 연결하면 배포 직후 쏟아지는 새 이슈로 채널이 죽습니다. 목록이 안정되면 그때 연결

알아두실 한계 하나

어드민 저장 실패 500은 Sentry에 안 옵니다. shouldSkipReport가 버려서요. 그래서 어드민 Monitor를 만들어도 서버 장애를 반만 잡습니다 — 조회
실패 500만 세어집니다.

보류하신 500·401 결정이 여기서 값을 만듭니다. 500을 켜면 이 Monitor가 진짜 장애 감지기가 됩니다.
```

