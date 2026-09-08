---
title: fingerprint
description: 이벤트를 어느 이슈에 넣을지 정하는 키 — 우리 구조에서 왜 틀리나
order: 2
outline: deep
---

# fingerprint

> 이벤트가 들어올 때마다 Sentry 는 "기존 어느 이슈에 넣을까, 새로 만들까"를 정한다. 그 판정 키가 fingerprint 다 (→ [이벤트와 이슈](./01-sentry#_1-이벤트와-이슈-—-sentry의-두-층)).

fingerprint 가 같으면 같은 이슈, 다르면 새 이슈. 그게 전부다.

fingerprint가 같으면 같은 이슈, 다르면 새 이슈. 그게 전부다.

## 1. 기본값 — stack trace 로 계산한다

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

## 2. 덮어쓰기 — 코드에서 키를 준다

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
- **경로 정규화가 세트다** — `/tasks/12345`를 그대로 쓰면 ID마다 이슈가 새로 생겨 반대로 폭발한다. 숫자 세그먼트를 `:id`로 치환한다 (우아한형제들: `path.replace(/\/\d+(?=\/|$)/g, '/{id}')`). 메트릭의 카디널리티와 같은 함정이다 (→ [Observability §카디널리티](../observability#카디널리티-—-메트릭의-비용))
- fingerprint는 이벤트를 **보내는 순간 박제된다.** 배포 후 새 이벤트부터 갈리고 기존 이슈는 재편되지 않는다 → 배포 후 옛 거대 이슈는 resolve로 닫는 게 운영 순서

## 3. 코드를 안 고치는 길 — 서버측 규칙

여기까지는 **보내는 쪽에서** fingerprint를 정했다. Sentry는 **받은 뒤에** 규칙으로 다시 정할 수도 있다. 프로젝트 설정의 Issue Grouping 화면에 규칙을 한 줄씩 적어두면 되고, **배포가 필요 없다.**

규칙이 두 종류인데, 손대는 층이 다르다.

```
Stack Trace Rules   그룹핑 계산에 어느 프레임을 넣을지  ← 계산 재료
Fingerprint Rules   그래서 fingerprint 를 뭘로 할지     ← 계산 결과
```

### Stack Trace Rules — 계산 재료를 걸러낸다

fingerprint를 정하지 않는다. **어느 프레임을 계산에 쓸지**만 정한다.

```
stack.abs_path:**/node_modules/**   -group
└─ 조건: 경로가 node_modules 안이면    └─ 동작: 그룹핑 계산에서 빼라
```

이러면 라이브러리 내부 프레임이 계산에서 빠져 **우리 코드 프레임만 남는다.** 라이브러리 안에서 어디를 지났든 결과가 같아지므로 **"같은 원인이 쪼개지는" 문제가 풀린다.**

`-app`과 헷갈리기 쉽다 — `-app`은 "내 코드가 아님"으로 표시해 화면에서 접는 것이고 그룹핑에는 여전히 영향을 줄 수 있다. 계산에서 빼는 건 `-group`이다.

### Fingerprint Rules — 계산 결과를 지정한다

SDK 덮어쓰기와 같은 일을 서버에서 한다. `조건 -> 값` 형태다.

```
error.type:ConnectTimeout           -> connect-timeout
error.value:"connection error: *"   -> connection-error
stack.function:"query_database"     -> {{ default }}, {{ transaction }}
```

조건으로 쓸 수 있는 것 — `error.type`(에러 클래스명) · `error.value`(에러 메시지) · `stack.abs_path`(파일 경로) · `stack.function` · `message` · `tags.태그이름`. 여러 개를 나란히 쓰면 AND다.

값에도 `default`·`transaction`·`tags.태그이름` 같은 자리표시자를 위 예시처럼 중괄호로 감싸 쓸 수 있어서, SDK 덮어쓰기와 마찬가지로 "기본 그룹핑 + 축 하나"가 된다.

둘 다 **이후 이벤트에만** 적용되는 건 SDK 덮어쓰기와 같다.

## 4. 이슈 제목 — fingerprint 가 못 바꾼다

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
