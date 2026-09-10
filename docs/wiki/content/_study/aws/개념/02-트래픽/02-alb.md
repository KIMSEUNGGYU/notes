---
title: ELB와 ALB
description: 한 주소로 받아 살아있는 서버로만 나눠 보내는 3단 구조
order: 2
outline: deep
---
# ELB와 ALB

> 토대: [가용성과 AZ](../01-네트워크/03-availability-az). 이 문서의 질문: **트래픽을 어떻게 살아있는 AZ·서버로만 보내나?**

## 1. 로드밸런서 — 부하를 나눠주는 장치

**ELB(Elastic Load Balancer)** = 트래픽(부하)을 적절히 분배해주는 장치. load가 "부하·짐"이라는 뜻이다.

서버를 2대 이상 굴리는 순간 필요해진다. 사용자가 EC2 두 대 중 어디로 보낼지 직접 고를 수는 없으니, **앞에 ELB를 두고 사용자는 ELB에만 요청**하면 ELB가 뒤로 나눠 보낸다.

ELB에는 종류가 셋 있다:

```
ALB   L7. HTTP 경로·호스트 기반 라우팅        ← 웹 서비스는 보통 이것
NLB   L4. TCP, 초고성능
CLB   레거시
```

로드밸런싱 외에 **SSL/TLS 인증서를 달아 HTTPS로 받는** 역할도 한다. 인증서가 ALB에 붙어서, 뒤의 서버들은 평문 HTTP로 받아도 된다.

## 2. ALB의 3대 구성요소

ALB는 세 조각으로 동작한다. 한눈에:

```
Listener   어떤 포트로 받을지          예) 443 HTTPS
Rule       경로·호스트 보고 어디로 보낼지  예) /api/* → TG-A,  pr-3.* → TG-B
Target Group  서버 묶음 + 헬스체크
```

라우팅은 **2단계**로 일어난다:

```
요청 → ALB Listener(443) → Rule(경로/호스트 매칭) → Target Group → 건강한 타깃
                            └─── 어느 TG? ───┘      └─ 그 안 어느 서버? ─┘
                                 (1단계)                  (2단계)
```

**Rule은 TG까지만 정하고, 그 안에서 어느 서버로 보낼지는 TG가 고른다.** 이 분업이 헷갈리기 쉬운 지점이다.

### 타깃 · 타깃 그룹 · target type

- **타깃(Target)** = ALB가 트래픽을 보낼 목적지 하나 = 서버 1개
- **타깃 그룹(TG)** = 타깃들을 묶은 풀(명단) + 헬스체크 설정. ALB가 "이 TG로 보내" 하면 TG가 그 안 healthy 타깃 중 하나를 골라 전달
- **target type** = 타깃을 *무엇으로* 등록하느냐:

```
instance  EC2 인스턴스 ID (i-xxx)
ip        IP 주소 (10.2.128.5)   ← Fargate(awsvpc) task는 각자 IP라 이걸 쓴다
lambda    Lambda 함수
```

배달로 비유하면 TG는 **배달 명단**이다. `instance`는 주소를 "EC2 동·호수"로, `ip`는 "IP 주소"로 적은 것. ALB(기사)는 **불 켜진 집(healthy)** 에만 배달한다.

::: tip TG와 보안 그룹은 다른 일을 한다
TG는 "**어디로 보낼까**"(분배), SG는 "**들여보낼까**"(보안). 이름이 둘 다 '그룹'이라 섞이기 쉽지만 무관한 장치다.
:::

## 3. 살아있는 서버로만 보내는 법

**헬스체크** — TG가 각 타깃의 지정 경로(예: `/health`)를 주기적으로 호출한다. 정상 응답이면 `healthy`, 아니면 `unhealthy`. **ALB는 healthy 타깃에게만** 트래픽을 보내니 죽은 서버가 자동으로 빠진다.

**AZ 분산** — ALB는 여러 AZ의 public 서브넷에 노드를 두고 타깃을 여러 AZ에 분산한다. 한 AZ가 죽으면 그 AZ 타깃이 `unhealthy`로 빠지고 나머지 AZ가 계속 처리한다.

그래서 **ALB는 최소 2개 AZ의 서브넷을 요구한다.** 선택이 아니라 요구사항이다.

## 4. 실물로 확인 — dev ALB (2026-06-04)

`alb-ishopcare-dev` — type=`application`, scheme=`internet-facing`, AZ **2a + 2b**.

용어를 풀면:

```
application       L7 ALB (NLB면 network)
internet-facing   외부 인터넷 접근 가능 (반대는 internal = VPC 내부 전용)
2a + 2b           두 AZ에 걸침 = AZ 이중화
```

**ALB가 어느 서브넷에 사는지는 scheme이 결정한다** — internet-facing이면 public, internal이면 private. 그래서 이 ALB는 `dev-public-subnet-2a/2b`에 올라가 외부 정문 역할을 한다.

타깃 그룹 4개, **전부 target type이 `ip`**:

| TG | 포트 | 헬스체크 |
|---|---|---|
| dev-dx-tg | 3000 | `/api/health` |
| dev-ishopcare-retool | 80 | `/health` |
| tg-ishopcare-dev-8081 | 8081 | `/` |
| tg-ishopcare-dev-rookie-ip-8081 | 8081 | `/health` |

`ip` 타입이라는 건 타깃을 EC2 인스턴스가 아니라 IP로 등록했다는 뜻 = **Fargate(awsvpc) 방식**이다. 백엔드가 이미 이 패턴으로 돌고 있으니, FE를 Fargate로 옮길 때도 **똑같이 `ip` 타입 TG에 private 서브넷의 task IP를 등록**하면 된다.

## 5. 요청 하나가 지나는 길

Fargate task가 private에 있고 ALB가 public 정문일 때, 사용자 요청은 이렇게 흐른다:

```
① 사용자가 admin-dev.example.com 접속
② DNS가 ALB(public, 2a/2b) 주소 반환 → ALB가 받음
③ Listener(443)가 받음 → Rule이 "admin이면 admin TG로" 판단
④ admin TG(ip 타입)가 private 서브넷의 task IP 중 healthy한 것 선택
⑤ 그 task가 응답 → ALB → 사용자
```

PR별 preview 환경은 여기서 **host 기반 Rule**로 분기한다 (`pr-N.admin-dev.*` → 해당 TG).

## 한 줄 정리

- **ALB** = HTTP 요청을 받아 여러 AZ의 건강한 타깃으로 분배 (`Listener → Rule → TG`)
- **Rule은 TG까지, 서버 선택은 TG가** — 라우팅은 2단계
- **헬스체크**로 죽은 타깃 자동 제외, **최소 2 AZ**로 AZ 이중화 실현
- **target type `ip`** = Fargate 방식. 타깃을 인스턴스가 아니라 IP로 등록한다
