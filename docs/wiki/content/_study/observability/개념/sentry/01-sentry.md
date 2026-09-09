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

## 6. 소스맵 / release / environment

- **소스맵** — 배포된 코드는 압축·난독화돼 있어 stack이 `a.js:1:38271`처럼 나온다. 빌드 때 소스맵을 Sentry에 업로드해두면 원본 파일·줄 번호로 복원해 보여준다. Next.js는 `next.config.ts`의 `withSentryConfig`가 처리한다
- **release** — 배포 버전을 이벤트에 붙여 "어느 배포부터 났는지" 추적한다. 소스맵을 버전에 매칭하는 키이기도 하다. "Resolve in next release"도 이게 있어야 동작한다
- **environment** — 이벤트에 붙는 환경 구분(local/dev/live 등). 검색·알림 필터로 사용한다. **64자 이내이고 공백·줄바꿈·슬래시와 문자열 `None` 을 못 쓴다**. 대소문자를 구분한다
