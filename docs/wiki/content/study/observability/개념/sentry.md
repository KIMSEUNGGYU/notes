---
title: Sentry
description: 에러 수집 도구가 이벤트를 이슈로 묶어 보여주기까지
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

**breadcrumbs** — 에러 직전까지의 행적(클릭, 페이지 이동, 콘솔, 네트워크 요청)이 자동 기록돼 이슈에서 보인다. 기본 100개까지 쌓이고(`maxBreadcrumbs`), 이벤트 크기 상한을 넘기면 이벤트가 통째로 버려지니 무한정 늘리면 안 된다. 에러와 무관하게 남기는 로그는 [Logs](#_9-logs-—-sentry가-로그도-받는다) 가 따로 담당한다.

## 1. 이벤트와 이슈 — Sentry의 두 층

```
이벤트 = 에러 발생 1건            (사용자 한 명이 400을 받음 → 이벤트 1개)
이슈   = 같은 원인끼리 묶은 폴더   (목록에서 보는 한 줄)
```

이벤트가 들어올 때마다 Sentry는 "기존 어느 이슈에 넣을까, 새 이슈를 만들까"를 정한다. 이 판정 키가 **fingerprint**다. 목록에서 보고 검색하고 resolve하는 단위는 전부 이슈다.

## 2. fingerprint — 이슈 그룹핑 키

fingerprint가 같으면 같은 이슈, 다르면 새 이슈. 그게 전부다.

### 기본값: stack trace로 계산

**stack trace**는 에러가 난 순간 "어떤 함수가 어떤 함수를 불러서 여기까지 왔는지"의 호출 경로다. 한 줄이 함수 하나이고 이 한 줄을 **프레임**이라고 부른다.

```
ApiError: 진행중 상태에만 저장 가능합니다
  at HttpClient.request (HttpClient.ts:88)   ← 에러를 만든 곳
  at ky.post (node_modules/ky/index.js:214)
  at saveTask (api/task.ts:31)
  at onSubmit (TaskForm.tsx:64)              ← 사용자가 누른 곳
```

아무것도 안 주면 Sentry는 에러 타입과 이 프레임들로 fingerprint를 계산한다. **"같은 코드 위치 = 같은 버그"라는 가정**인데, 보통 코드에서는 잘 맞는다.

**안 맞는 구조가 있다.** 에러를 한 곳에서 만들어 던지면 — 공통 HTTP 클라이언트가 `throw new ApiError(...)` 한 줄로 모든 API 에러를 만드는 식 — 어느 API가 실패하든 맨 위 프레임이 똑같아진다. 그러면 양방향으로 틀린다:

```
다른 원인을 뭉친다  /tasks 400 도 /settlements 404 도 stack 이 같아 한 이슈로
같은 원인을 쪼갠다  같은 에러인데 라이브러리 내부 프레임의 줄 번호만 달라 두 이슈로
```

### 덮어쓰기

```ts
Sentry.captureException(error, {
  fingerprint: ['POST', '/v2/tasks/:id', '400'],
});
```

문자열 배열을 직접 주면 stack은 무시되고 이 배열로만 묶인다. "같은 API + 같은 상태코드 = 같은 문제"라는 도메인의 정의로 바꾸는 것.

- **`default` 자리표시자** — 배열에 넣으면 그 자리에 "Sentry가 stack으로 계산했을 값"이 채워진다. **기존 방식을 버리는 게 아니라 그 위에 축을 하나 더 얹는다.**

  ```ts
  fingerprint: ['{{ default }}', endpoint]
  //            └ stack 으로 계산한 값 ┘  + endpoint
  //            → 기존 그룹핑을 유지하면서 endpoint 별로 한 번 더 갈린다
  ```

  다만 stack이 다 같은 구조에서는 앞쪽 값이 늘 똑같아 효과가 없고, 번들이 바뀌어 stack이 흔들리면 같은 문제가 쪼개질 위험만 남는다
- **경로 정규화가 세트다** — `/tasks/12345`를 그대로 쓰면 ID마다 이슈가 새로 생겨 반대로 폭발한다. 숫자 세그먼트를 `:id`로 치환한다 (우아한형제들: `path.replace(/\/\d+(?=\/|$)/g, '/{id}')`). 메트릭의 카디널리티와 같은 함정이다 (→ [Observability §카디널리티](./observability#카디널리티-—-메트릭의-비용))
- fingerprint는 이벤트를 **보내는 순간 박제된다.** 배포 후 새 이벤트부터 갈리고 기존 이슈는 재편되지 않는다 → 배포 후 옛 거대 이슈는 resolve로 닫는 게 운영 순서

### 코드를 안 고치는 길 — 서버측 규칙

여기까지는 **보내는 쪽에서** fingerprint를 정했다. Sentry는 **받은 뒤에** 규칙으로 다시 정할 수도 있다. 프로젝트 설정의 Issue Grouping 화면에 규칙을 한 줄씩 적어두면 되고, **배포가 필요 없다.**

규칙이 두 종류인데, 손대는 층이 다르다.

```
Stack Trace Rules   그룹핑 계산에 어느 프레임을 넣을지  ← 계산 재료
Fingerprint Rules   그래서 fingerprint 를 뭘로 할지     ← 계산 결과
```

#### Stack Trace Rules — 계산 재료를 걸러낸다

fingerprint를 정하지 않는다. **어느 프레임을 계산에 쓸지**만 정한다.

```
stack.abs_path:**/node_modules/**   -group
└─ 조건: 경로가 node_modules 안이면    └─ 동작: 그룹핑 계산에서 빼라
```

이러면 라이브러리 내부 프레임이 계산에서 빠져 **우리 코드 프레임만 남는다.** 라이브러리 안에서 어디를 지났든 결과가 같아지므로 **"같은 원인이 쪼개지는" 문제가 풀린다.**

`-app`과 헷갈리기 쉽다 — `-app`은 "내 코드가 아님"으로 표시해 화면에서 접는 것이고 그룹핑에는 여전히 영향을 줄 수 있다. 계산에서 빼는 건 `-group`이다.

#### Fingerprint Rules — 계산 결과를 지정한다

SDK 덮어쓰기와 같은 일을 서버에서 한다. `조건 -> 값` 형태다.

```
error.type:ConnectTimeout           -> connect-timeout
error.value:"connection error: *"   -> connection-error
stack.function:"query_database"     -> {{ default }}, {{ transaction }}
```

조건으로 쓸 수 있는 것 — `error.type`(에러 클래스명) · `error.value`(에러 메시지) · `stack.abs_path`(파일 경로) · `stack.function` · `message` · `tags.태그이름`. 여러 개를 나란히 쓰면 AND다.

값에도 `default`·`transaction`·`tags.태그이름` 같은 자리표시자를 위 예시처럼 중괄호로 감싸 쓸 수 있어서, SDK 덮어쓰기와 마찬가지로 "기본 그룹핑 + 축 하나"가 된다.

둘 다 **이후 이벤트에만** 적용되는 건 SDK 덮어쓰기와 같다.

## 3. 이슈 제목 — fingerprint가 못 바꾼다

제목은 `error.name + message`에서 온다. fingerprint는 그룹만 가르고 제목은 그대로다. 그래서 에러 클래스 하나로 다 던지는 구조에서는 제목이 전부 같아지거나, 백엔드 문장이 그대로 제목이 된다.

제목까지 바꾸려면 **`error.name`을 우리가 정해야 한다.** `name`은 에러 클래스 이름에서 오므로, 방법은 둘이다.

**클래스를 상태코드마다 따로 만든다** (카카오페이)

```ts
class ApiBadRequestError extends Error {}      // name === 'ApiBadRequestError'
class ApiInternalServerError extends Error {}  // name === 'ApiInternalServerError'

// 던질 때 상태코드로 고른다
if (res.status === 400) throw new ApiBadRequestError(msg);
if (res.status === 500) throw new ApiInternalServerError(msg);
```

클래스가 갈리면 `name`이 갈리고 제목도 갈린다. 대신 상태코드 수만큼 클래스를 만들어 관리해야 한다.

**클래스는 하나로 두고 `name`을 만들어 넣는다** (우아한형제들)

```ts
const error = new ApiError(msg);
error.name = `[500 Error] - ${host}${path}`;   // 제목이 이 값으로 나온다
```

클래스는 안 늘지만 이름 조합 규칙을 직접 관리하게 된다.

## 4. SDK 초기화 — instrumentation 파일과 DSN

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

## 5. 수집 경로

**SDK가 자동으로 잡는 것**과 **우리가 직접 호출하는 것**, 둘이다.

### SDK가 자동으로 잡는 것

`Sentry.init()`이 실행되면 SDK가 브라우저 전역 에러 훅에 자기를 끼워넣는다. 코드는 더 안 쓴다.

```
window.onerror              try/catch 없이 터진 동기 에러
window.onunhandledrejection 아무도 catch 안 한 Promise 실패
```

breadcrumbs 수집(클릭·라우팅·fetch/XHR·console)도 같이 켜진다.

Next.js 서버 쪽은 `instrumentation.ts`에 `onRequestError = Sentry.captureRequestError` 한 줄을 두면 SSR 중 에러가 자동으로 올라간다 (설치 마법사가 넣어준다).

### 우리가 직접 호출하는 것

```ts
Sentry.captureException(error)               // 에러 객체를 보낸다
Sentry.captureMessage('결제 위젯 로드 실패')   // 에러 객체 없이 문자열만
```

**자동이 못 잡는 에러**와 **맥락을 실어야 하는 에러**가 여기로 온다. `captureMessage`는 예외는 아니지만 기록하고 싶은 상황용이고 [Level](#_8-level-—-심각도) 과 같이 쓴다.

#### 렌더 중 에러 — ErrorBoundary도 결국 직접 호출이다

boundary가 잡은 에러는 자동 훅에 안 걸린다. **React가 일부러 전역으로 안 보내기 때문이다** — 그 구역만 fallback UI로 바꾸고 나머지는 살리는 게 boundary의 목적이라, 전역으로 보내면 앱 전체가 죽은 것처럼 취급된다.

그래서 boundary가 직접 넘겨야 한다. 배선은 한 줄이고, 그 아래 트리의 렌더 에러가 전부 이 줄을 탄다.

```tsx
<ErrorBoundary onError={Sentry.captureReactException}>
```

`captureException`이 아니라 `captureReactException`인 이유 — **어느 컴포넌트에서 났는지(componentStack)**를 같이 붙여준다.

#### 어느 쪽으로 보내느냐가 실리는 정보를 바꾼다

같은 400이라도 남는 게 다르다.

```
ErrorBoundary 로     "렌더 중 ApiError" + 어느 컴포넌트인지
                     어느 API 였나 · 상태코드 · 응답 본문은 없다

captureException 로  tags·extra 로 endpoint · status · 응답 본문까지 실을 수 있다
```

boundary는 에러 객체를 **받은 모습 그대로** 넘기고, 원인이 API 실패인 걸 모른다. react-query의 `throwOnError: true`로 쿼리 실패를 boundary까지 던지는 구조라면 이 손실이 기본값이 된다.

## 6. Scope — 이벤트에 자동으로 얹히는 공용 데이터

capture 시점에 이벤트에 합쳐지는 데이터 주머니. 매번 태그·사용자를 손으로 붙이지 않게 해준다.

- **전역 scope** — 한 번 설정하면 이후 모든 이벤트에 붙는다
  - `Sentry.setUser({...})` / `Sentry.setUser(null)` — 이슈에서 "누가 겪었나"가 보이는 이유. 로그인·로그아웃 시점에 갱신한다
  - `Sentry.setTags({ service: 'admin' })` — 서비스 구분처럼 전 이벤트 공통인 축
- **로컬 scope** — `Sentry.withScope(scope => { ... })` 안에서 설정한 태그·level은 그 안의 capture 한 번에만 적용되고 밖으로 안 샌다. 특정 플로우에만 붙일 정보용

## 7. 이벤트에 실리는 정보 3종 — 태그 / extra / context

| | 검색·필터 | 용도 |
|---|---|---|
| 태그 (tags) | **가능** (인덱싱됨) | 짧은 키-값. `service:admin`, `api.endpoint:/v2/tasks` |
| extra | 불가 | 이슈 열었을 때 보는 임의 데이터 |
| context | 불가 | extra와 유사, 이름 붙은 묶음 (`API Request Detail` 같은) |

- 태그는 알림 규칙의 필터 조건으로도 쓴다 (`service:admin`만 알림 등). **키·값 모두 200자 제한**이고 키에는 공백을 못 쓴다 (문자·숫자·`_`·`.`·`:`·`-`만)
- **역할이 갈린다** — 태그는 "무엇을 셀까", extra·context는 "열었을 때 원인을 알 수 있나". 태그만 잘 붙고 extra가 비면 이슈를 열어도 응답 본문·요청 내용이 없어 원인 파악이 이슈 밖으로 나간다

## 8. Level — 심각도

`fatal / error(기본) / warning / info / debug`. 이벤트마다 붙는 심각도 분류로, 알림 규칙에서 "fatal만 즉시 알림" 같은 필터로 쓴다.

우아한형제들 기준: 화면 렌더 불가·필수 기능 마비 = fatal / 예상 못한 미처리 에러 = error / 예상 가능하고 영향 없음(타임아웃 등) = warning.

## 9. Logs — Sentry가 로그도 받는다

에러와 별개로 **텍스트 로그를 구조화해서 보내는 기능.** `enableLogs`로 켜며 SDK v10.71.0부터 기본 `true`다.

```ts
Sentry.logger.info('결제 위젯 로드', { widgetId, retryCount });
```

breadcrumbs와 헷갈리기 쉬운데 성격이 다르다:

```
breadcrumbs  에러 이벤트에 딸려 오는 행적. 에러가 나야 보인다
Logs         에러와 무관하게 독립적으로 쌓인다. 안 터져도 남는다
```

**모든 로그가 그때 활성화된 트레이스에 자동으로 연결된다** — 로그 하나에서 그 요청의 span·에러로 넘어갈 수 있다. 관측의 세 기둥 중 로그 축을 Sentry가 직접 담당하게 된 변화다 (→ [Observability §세 기둥](./observability#세-기둥)).

주의 — 태그는 로그에 안 붙는다. 로그에는 Attributes를 쓴다 (SDK 10.61.0+).

## 10. 조직 구조와 화면 구성

```
Organization
└── Project              ← DSN·쿼터·알림 규칙·Inbound Filter가 프로젝트 단위
    └── 이슈들
```

프로젝트를 서비스마다 나눌지 하나로 합칠지가 첫 결정이다. 합치면 쿼터·알림 규칙을 한 곳에서 보지만 이슈가 섞이고, 나누면 반대가 된다. 합칠 경우 서비스 구분은 태그가 담당한다.

주로 보는 화면 둘:

- **Issues 목록** — 이슈별 한 줄씩: 제목, 이벤트 수, 영향받은 사용자 수, 발생 추이 그래프, last seen. 상단에 [검색창](#_12-검색·쿼리-문법) 과 environment 선택
- **이슈 상세** — 이 이슈에 뭉친 이벤트들을 파고드는 곳
  - stack trace (소스맵이 있으면 원본 코드 위치로)
  - breadcrumbs, 태그·extra·context
  - **태그 분포** — 이 이슈의 이벤트들이 어떤 태그 값으로 구성돼 있는지 통계. 이슈가 뭉쳐 있을 때 "이 안에 뭐가 섞여 있나"를 여기서 확인한다
  - Replay 링크, 이벤트 하나씩 넘겨보기

## 11. 이슈 라이프사이클

상태는 여섯이고, 그중 넷이 `is:unresolved`에 든다.

```
New ─▶ Ongoing ─┬─ resolve ──▶ Resolved ── 새 이벤트 ──▶ Regressed
                │                                          (자동 재오픈)
                ├─ archive ──▶ Archived ── 이벤트 급증 ──▶ Escalating
                │                                          (자동 재오픈)
                └────────────────────────▶ Escalating

is:unresolved 에 드는 것 — New · Ongoing · Escalating · Regressed
```

- **New / Ongoing** — 갓 생긴 이슈와 계속 나고 있는 이슈. 알림 조건에서 "새로 생긴 것만"을 가를 때 쓴다
- **Resolved** — "고쳤다"는 표시. 목록 기본 필터에서 사라진다. 배포로 고친 건 "Resolve in next release"로 버전과 묶을 수 있다 (release 설정 필요)
- **Regressed** — resolve된 이슈에 같은 fingerprint 이벤트가 다시 오면 자동으로 되살아난다. "고쳤다고 믿었는데 재발"을 잡는 장치
- **Archived** — 알림을 끄고 목록에서 내린다. 되살아날 조건을 고를 수 있다(급증 시 · 영원히 · N일 뒤 · N건 뒤 · 영향 사용자 N명 뒤). **"영원히"로 묻으면 급증해도 안 깨어난다**
- **Escalating** — 이슈가 **예측된 발생량을 넘겼을 때** 자동으로 붙는 상태. 묻어둔 이슈가 갑자기 커지면 여기로 올라온다

**Regressed와 Escalating은 다르다** — 앞은 "고쳤다고 한 게 재발", 뒤는 "안 고친 게 갑자기 심해짐"이다.

**resolve가 의미를 가지려면 이슈가 잘 갈라져 있어야 한다.** 여러 원인이 한 이슈에 뭉쳐 있으면 하나 고쳐 resolve해도 다른 원인이 regression으로 되살린다. fingerprint를 손봐야 하는 이유 중 하나다.

## 12. 검색·쿼리 문법

Issues 목록 상단 검색창에서 쓰는 문법. **태그와 내장 속성만 검색되고 extra·context는 안 된다.**

```
is:unresolved                      상태 필터 (is:resolved, is:regressed)
service:partners                   태그 필터 (직접 붙인 태그 그대로)
api.endpoint:/v2/tasks             태그 필터
error.type:TimeoutError            에러 클래스명
message:*modusign*                 메시지 와일드카드
```

조건은 공백으로 이어 붙이면 AND다:

```
error.type:TimeoutError message:*modusign* service:partners
```

**여기서 쓸 수 있는 축이 곧 알림 조건으로 쓸 수 있는 축이다.** 무엇을 태그로 올릴지가 무엇을 셀 수 있는지를 정한다.

## 13. 알림 (Alert)

이슈·이벤트 조건에 맞으면 Slack 등으로 보내는 규칙. 조건에 태그 필터(`service:admin`)와 threshold(시간당 N건 이상)를 걸 수 있다.

**fingerprint 정리가 선행 조건이다** — 이슈가 뭉쳐 있으면 "ApiError 급증" 알림은 어느 API인지 안 알려줘서 의미가 없다. 이슈 = 엔드포인트가 된 뒤에야 "특정 API 급증" 알림이 가능하다.

우아한형제들 운영: threshold + Slack 채널 라우팅 + 스프린트마다 2~3명 당번 + "검토완료" 버튼. (→ [Observability §알림 피로](./observability#알림-피로))

## 14. dataCollection — SDK 자동 수집의 스위치

**SDK가 자동으로 덧붙이는 민감 정보**를 보낼지 정하는 옵션. 카테고리별로 갈라져 있다.

```
dataCollection: {
  userInfo,       // 사용자 식별 정보 (IP 등)
  httpBodies,     // 요청·응답 본문
  httpHeaders,    // 요청·응답 헤더
  cookies,
  urlQueryParams, // 쿠키·쿼리는 민감값 스크러빙이 기본으로 걸린다
  genAI,          // AI 입출력 내용
}
```

**`sendDefaultPii`는 deprecated다** (v11에서 제거 예정). `sendDefaultPii: true`는 "여섯 카테고리 전부 켜기"와 같고, 둘 다 설정하면 `dataCollection`이 이긴다. 예전의 `sendDefaultPii: false`를 유지하려면 카테고리마다 명시적으로 꺼야 한다.

주의 둘:

- **코드로 직접 넣는 값은 이 옵션과 무관하게 전송된다.** `Sentry.setUser()`로 넣은 것도, `extra: { body }`도 그대로 간다. 이 옵션은 "SDK가 알아서 붙이는 것"만 다룬다
- 그래서 PII를 막는 자리는 두 곳이다 — 자동 수집은 여기서, 직접 넣는 값은 넣는 코드에서

## 15. 수집을 거르는 층

전송 전(SDK)과 전송 후(서버)로 갈린다. **어느 쪽이든 걸러진 건 쿼터를 안 먹는다.**

```
SDK 층 (배포 필요)
├─ 조건부 호출      capture 를 아예 안 부른다. "이 상태코드는 안 보낸다"
├─ ignoreErrors     메시지 문자열·정규식으로 거른다
├─ denyUrls         stack 의 스크립트 URL 로 거른다 (서드파티 위젯 등)
└─ beforeSend       보내기 직전 코드로 판단, null 반환하면 미전송
                    (트랜잭션은 beforeSendTransaction 이 따로 있다)

서버 층 (배포 불필요)
└─ Inbound Filters  Sentry 설정 화면. 문자열 패턴만 가능
```

**쿼터를 먹는 것과 안 먹는 것을 가르는 선은 "받아들여졌나"다.** Inbound Filter는 받아들이기 전에 자르므로 안 먹지만, Rate Limiting과 Spike Protection은 받아들인 뒤 넘치는 걸 버리는 장치라 다르다.

## 16. 쿼터 — 요금제의 이벤트 한도

월간 받아주는 이벤트 개수가 요금제로 정해져 있고, 다 쓰면 이후 이벤트가 버려진다. 우아한형제들은 이 문제로 **중요 장애 로그의 80%를 유실**한 적이 있다.

400과 500은 터지는 방식이 다르다 — 400은 개인별로 고르게, 500은 장애 순간에 전원 동시에(수천 건). 500을 수집하려면 Inbound Filter·threshold로 폭주 대비가 필요한 이유다.

## 17. 성능 트레이싱 — tracesSampleRate

에러(터진 것)와 별개로 **안 터졌지만 느린 것**을 수집하는 기능. 켜면 페이지 로드·API 요청의 소요 시간이 기록돼 `POST /v2/tasks p95 4.2s` 같은 게 보인다. 값은 수집 비율(0~1) — 트랜잭션도 쿼터를 먹어서 조절이 필요하다.

**안 켜면 관측의 트레이스 축이 통째로 빈다.** 에러 수집만으로는 "안 터졌지만 느린 것"이 하나도 안 남는다.

### 프론트와 백엔드를 잇는 것 — distributed tracing

트레이싱을 켜면 SDK가 요청에 헤더 둘을 실어 보낸다.

```
sentry-trace   trace ID + span ID + 샘플링 결정
baggage        샘플링 비율 등 부가 정보
```

백엔드도 Sentry를 쓰고 있으면 같은 **trace ID**로 자기 span을 붙여서, 프론트 에러 하나에서 그 요청이 백엔드에서 뭘 했는지까지 이어진다.

- **`tracePropagationTargets`** — 이 헤더를 어느 주소에 붙일지 정한다. 아무 데나 붙이면 CORS에서 막히므로 우리 API 도메인만 넣는다
- 헤더가 붙는 만큼 **서버의 CORS 허용 목록에도 들어가 있어야 한다**
- 샘플링 결정은 **최초 호출자(프론트)가 내리고** 하류가 따른다 — 프론트에서 표본에서 빠진 요청은 백엔드에도 안 남는다

## 18. Replay — 에러 순간의 화면 녹화

에러 발생 세션의 화면을 녹화해 이슈에서 재생한다. 표본 비율을 둘로 나눠 잡는다:

```
replaysOnErrorSampleRate  에러가 난 세션 중 몇 %를 녹화할까
replaysSessionSampleRate  평상시 세션 중 몇 %를 녹화할까
```

`networkDetailAllowUrls`에 등록된 도메인은 요청/응답 본문까지 Replay의 Network 탭에서 보인다 — 외부 연동 실패의 응답 본문을 확인하는 경로가 된다.

## 19. 소스맵 / release / environment

- **소스맵** — 배포된 코드는 압축·난독화돼 있어 stack이 `a.js:1:38271`처럼 나온다. 빌드 때 소스맵을 Sentry에 업로드해두면 원본 파일·줄 번호로 복원해 보여준다. Next.js는 `next.config.ts`의 `withSentryConfig`가 처리한다
- **release** — 배포 버전을 이벤트에 붙여 "어느 배포부터 났는지" 추적한다. 소스맵을 버전에 매칭하는 키이기도 하다. "Resolve in next release"도 이게 있어야 동작한다
- **environment** — 이벤트에 붙는 환경 구분(local/dev/live 등). 검색·알림 필터로 사용한다. **64자 이내이고 공백·줄바꿈·슬래시를 못 쓴다**
