---
title: 쿼터와 거르기
description: 월 한도는 장애 때 터진다 — 무엇을 안 보낼지 어디서 정할까
order: 8
outline: deep
---
# 쿼터와 거르기

## 1. 쿼터 — 장애 때 한 달치를 태운다

요금제마다 **월에 받아줄 이벤트 개수**가 정해져 있고, 다 쓰면 그 달 남은 기간의 이벤트가 버려진다.

문제는 이게 평소가 아니라 **장애 때** 터진다는 것이다.

```
평소   하루 수백 건       한도 안쪽
장애   한 시간에 수천 건   ← 여기서 한 달치를 태운다
```

우아한형제들은 이 문제로 **중요 장애 로그의 80%를 유실**한 적이 있다. 정작 봐야 할 때 안 들어왔다.

### 400 과 500 은 터지는 방식이 다르다

```
400  사용자 개인의 잘못된 요청 — 각자 따로 난다. 양이 고르다
500  서버가 죽은 것 — 그 순간 접속한 전원이 동시에 받는다. 재시도까지 더해진다
```

500 은 양이 많은데 **프론트에서 얻을 정보는 적다.** "서버가 죽었다"까지고 원인은 서버 로그에 있다. 그래서 버리는 선택지가 나온다 — 다만 버리면 "언제부터 죽었나"라는 신호도 같이 사라진다.

### 무엇이 쿼터를 먹나



## 2. 거르는 방법 — Sentry 가 주는 넷

공식 문서는 `client-level filtering` 과 `Inbound Filters` 둘로 나눈다. 넷을 묶어 부르는 이름은 없다

```
client-level filtering  (SDK 옵션 · 배포 필요)
├─ ignoreErrors     메시지 문자열·정규식으로 거른다
├─ denyUrls         stack 의 스크립트 URL 로 거른다 (브라우저 확장·서드파티 위젯)
└─ beforeSend       보내기 직전 코드로 판단, null 을 반환하면 미전송
                    (트랜잭션은 beforeSendTransaction 이 따로 있다)

Inbound Filters  (Sentry 웹 Settings · 배포 불필요)
└─ 체크박스(크롤러·오래된 브라우저·브라우저 확장)와 문자열 패턴 입력
```

```ts
Sentry.init({
  beforeSend(event) {
    if (조건) return null;   // 안 보낸다
    return event;
  },
})
```

가르는 것은 **바꾸는 속도**다. Inbound Filters 는 장애 중에도 즉시 막을 수 있고, `beforeSend` 는 조건을 정교하게 쓰는 대신 배포해야 한다. 그래서 급한 건 웹에서 막고 안정된 규칙은 코드로 옮긴다.

### 넷에 안 들어가는 방법 하나

`capture` 를 아예 안 부르는 것. Sentry 기능이 아니라 우리 코드가 조건문으로 건너뛰는 것이라 용어가 없다.

가장 이른 자리라 확실히 막히지만 **Sentry 는 그런 이벤트가 있었다는 것 자체를 모른다.** 위 넷은 걸러진 건수가 통계로 남아 "무엇을 얼마나 버리고 있나"를 나중에 확인할 수 있다.

## 3. 우아한형제들은 500 을 안 버렸다

순서가 반대였다 — 거르기 전에 **정보를 먼저 늘렸다.**

```
1단계  정보를 늘린다     Level 구분 · API 경로를 이름에 · Context/Tags 추가
2단계  그 정보로 거른다   무엇을 버릴지가 그제야 보인다
3단계  알림을 정리한다
```

거른 대상도 상태 코드가 아니라 API 단위였다.

```
Inbound Filters   ChunkLoadError · Failed to fetch — 네트워크 잡음
beforeSend        401
API 별 검수        "최대 구매 수량 초과" 처럼 이미 화면에서 처리하는 400 · 404
```

**"이미 비즈니스 로직에서 핸들링되는" 것을 골라 뺐다.** 상태 코드로 통째 버린 것이 아니다.

출처: [우아한형제들 — Sentry 최적화](https://techblog.woowahan.com/21604/) (2026-09-08 확인)

## 4. dataCollection — SDK 자동 수집의 스위치

**SDK가 자동으로 덧붙이는 민감 정보**를 보낼지 정하는 옵션. v10.57.0 부터 있고 카테고리 여덟으로 갈라져 있다.

```
dataCollection: {
  userInfo,             // 사용자 식별 정보 (id·email·username·IP)
  httpBodies,           // 요청·응답 본문
  httpHeaders,          // 요청·응답 헤더
  cookies,
  urlQueryParams,       // 쿠키·쿼리는 민감값 스크러빙이 기본으로 걸린다
  genAI,                // AI 입출력 내용
  stackFrameVariables,  // 스택 프레임의 지역 변수 값
  frameContextLines,    // 스택 프레임 주변 소스 코드 줄
}
```

`**sendDefaultPii`는 deprecated다** (v11에서 제거 예정). `sendDefaultPii: true`는 "여덟 카테고리 전부 켜기"와 같고, 둘 다 설정하면 `dataCollection`이 이긴다. 예전의 `sendDefaultPii: false`를 유지하려면 카테고리마다 명시적으로 꺼야 한다.

주의 둘:

- **코드로 직접 넣는 값은 이 옵션과 무관하게 전송된다.** `Sentry.setUser()`로 넣은 것도, `extra: { body }`도 그대로 간다. 이 옵션은 "SDK가 알아서 붙이는 것"만 다룬다
- 그래서 PII를 막는 자리는 두 곳이다 — 자동 수집은 여기서, 직접 넣는 값은 넣는 코드에서

## 5. 개인정보 — dataCollection 이 못 막는 것

`dataCollection` 은 **카테고리 단위 스위치**라 "이 필드만 빼자"가 안 된다. 그리고 `userInfo` 가 다루는 것은 Sentry 가 정해둔 네 필드뿐이다.

```
userInfo 가 채우는 것   id · email · username · ip_address
```

주민등록번호·사업자등록번호 같은 값은 여기 없다. 그런 값이 Sentry 로 가는 경로는 따로 있다.

```
httpBodies    회원가입·인증 API 의 요청 본문에 그대로   ← 가장 크다
extra         우리가 직접 넣어서
Replay        화면 녹화에 찍혀서
breadcrumbs   네트워크 요청 기록에 남아서
```

`httpBodies` 를 끄면 개인정보는 안 가지만 **"백엔드가 왜 거절했는지"도 같이 안 온다.** 응답만 담고 요청은 빼거나, 필드를 골라 담는 식으로 갈라야 한다.

### 필드 단위로 빼는 길 셋

```
넣을 때 안 넣는다    코드에서 골라 담는다        브라우저 밖으로 안 나간다
beforeSend          event 에서 지우거나 마스킹    브라우저에서 지우고 보낸다
Data Scrubbing      Sentry 서버가 받은 뒤 지운다   전송은 이미 일어났다
```

**절대 나가면 안 되는 값은 앞의 둘이어야 한다.** Data Scrubbing 은 새어나온 것을 잡는 그물이지 1차 방어선이 아니다.

### Data Scrubbing 이 기본으로 지우는 것

기본으로 켜져 있고, 이만큼을 자동으로 지운다 (2026-09-09 공식 문서 확인).

```
신용카드 패턴      정규식으로 값 자체를 판별
민감한 필드 이름   password · secret · passwd · api_key · apikey · auth
                  credentials · mysql_pwd · privatekey · private_key · token · bearer
```

**`residentNumber` 같은 이름은 안 걸린다.** 주민번호는 형식이 신용카드와 달라 패턴에도 안 잡히므로 직접 등록해야 한다.

```
Settings → Security & Privacy → Data Scrubbing
  Additional Sensitive Fields 에 필드 이름을 적는다
```

주의 — 여기 적은 문자열은 **필드 이름뿐 아니라 값에 그 문자열이 포함된 필드도** 지운다. 범위가 넓다. 더 정교하게는 Advanced Data Scrubbing 에서 `[Remove] [Anything] from [$user.geo.**]` 같은 문법을 쓴다.

IP 주소는 별도 옵션으로 저장을 막을 수 있다. 다만 지역 정보는 IP 에서 뽑은 뒤라 남는다.

설정 자리가 둘이다 — 조직 전체(`Settings → Security & Privacy`)와 프로젝트별(`Settings → Projects → [프로젝트] → Security & Privacy`). 프로젝트를 나눌 계획이 있으면 조직 레벨에 걸어두는 편이 새 프로젝트에도 자동 적용된다.
