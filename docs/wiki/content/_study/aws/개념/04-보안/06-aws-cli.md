---
title: AWS CLI와 ARN
description: 지금 나는 누구로 동작하나 — profile · 자격증명 · 리소스 주소 체계
order: 6
outline: deep
---
# AWS CLI와 ARN

> 이 문서의 질문: **`AccessDenied`를 만났을 때 자격증명 문제인가 권한 문제인가?**

## 1. CLI와 profile

**AWS CLI** = AWS를 명령줄로 조작하는 도구. 콘솔에서 클릭하던 것을 명령으로 한다. CI/CD나 Terraform이 내부적으로 같은 API를 호출하므로 **CLI를 이해하는 게 곧 AWS API를 이해하는 것**이다.

**Profile** = 한 PC에서 여러 AWS 계정/역할을 쓸 때 분리하는 단위. 회사용/개인용, dev/prod 계정 분리에 쓴다.

```bash
aws configure list-profiles       # 등록된 profile 목록
export AWS_PROFILE=my-dev         # 세션 기본값으로 (--profile 매번 안 붙여도 된다)
aws configure get region          # 현재 region (예: ap-northeast-2)
```

저장 위치는 `~/.aws/credentials`와 `~/.aws/config`다.

**profile 이름은 의도가 드러나게 짓는다.** 헷갈리면 잘못된 계정에 변경을 적용하는 사고가 난다.

## 2. 자격증명 ≠ 권한

가장 헷갈리는 지점. 둘은 별개다.

```
자격증명   신원 (WHO)        ~/.aws/credentials 에 저장
IAM 권한   할 수 있는 것 (WHAT)  AWS 쪽에 정책으로 정의
```

회사 출입증 비유: 카드에 사번이 적혀 있어 **누구인지 식별**된다. 하지만 **들어갈 수 있는 사무실은 별개**다.

**내가 누구임을 증명해도 IAM에서 권한이 없으면 명령은 거부된다**(`AccessDenied`).

### 자격증명의 종류

| 종류 | 모습 | 언제 |
|---|---|---|
| Access Key + Secret Key | 2개의 긴 문자열 | `aws configure`로 등록한 가장 흔한 형태 |
| SSO 토큰 | 임시 자격증명 (1~12시간 만료) | 회사 SSO를 쓸 때 |
| Role assume | 다른 role을 임시로 가장한 토큰 | GitHub Actions OIDC가 쓰는 방식 |

Access Key와 SSO의 차이:

| | Access Key | SSO |
|---|---|---|
| 만료 | 영구 (사람이 회전) | 자동 만료 |
| 노출 위험 | 높다 (평문 저장 + 영구) | 낮다 (단기) |
| 관리 | 사람마다 발급 | SSO 한 번 |

`~/.aws/config`에 `sso_*` 키가 있으면 SSO 방식이다 (→ [SSO와 SAML](./02-assume-role#_4-sso-·-saml-·-sts의-관계)).

## 3. CLI 명령이 도는 순서

```
① aws CLI가 명령을 받는다 (예: aws s3 ls)
② profile에 해당하는 자격증명을 읽는다
③ AWS API 요청에 서명(signature)을 붙인다
④ AWS가 서명을 검증 → "이 사람 맞다" 식별       ← 여기까지가 자격증명
⑤ IAM이 "이 사람이 이 명령을 실행할 권한이 있나" 체크  ← 여기부터 권한
⑥ 권한이 있으면 실행, 없으면 AccessDenied
```

**④에서 실패하면 자격증명 문제**(`InvalidClientTokenId` 등), **⑤에서 실패하면 권한 문제**(`AccessDenied`)다. 에러 이름이 이 경계를 알려준다.

## 4. 지금 나는 누구인가

```bash
aws sts get-caller-identity
```

"지금 누구로 동작하는지" 확인하는 가장 빠른 방법이다. IAM 권한이 없어도 호출되는 특별한 예외라, 이게 실패하면 자격증명 자체가 잘못된 것이다.

```json
{
  "UserId": "AIDA...",
  "Account": "<account-id>",
  "Arn": "arn:aws:sts::<account-id>:assumed-role/DeveloperAccessGoogleSamlRole/me@example.com"
}
```

이 ARN을 분해하면 회사가 어떻게 셋업했는지가 그대로 보인다:

```
arn:aws:sts::<account-id>:assumed-role/DeveloperAccessGoogleSamlRole/me@example.com
│   │   │   │             │             │                            │
│   │   │   │             │             │                            └ session 이름 (이메일)
│   │   │   │             │             └ Role 이름
│   │   │   │             └ "assumed-role" = role을 가장 중이다
│   │   │   └ Account ID
│   │   └ (region 빈 칸 — STS는 전역 서비스)
│   └ service: sts
└ ARN 시작
```

읽히는 것 넷:

1. **SSO를 쓴다** — `…GoogleSamlRole`이 단서다. Google Workspace로 SSO 로그인 → AWS 임시 자격증명
2. **STS 서비스** — 임시 자격증명 발급 담당. SSO와 role assume이 모두 STS 위에서 돈다
3. **assumed-role** — 영구 IAM User가 아니라 role을 임시로 가장한 상태다. 만료 시간이 있다
4. **session에 이메일** — "누가 assume했나"가 추적된다. 감사 로그가 이메일 단위로 남는다

이 셋업의 운영상 이점: 새 팀원도 SSO 로그인만 하면 자동으로 같은 role을 받고(access key 배포 없음), 권한 변경은 **개별 사용자가 아니라 role의 Policy 하나**를 고치면 된다.

## 5. ARN — AWS 리소스의 주소 체계

**ARN(Amazon Resource Name)** = AWS의 모든 리소스를 식별하는 표준 문자열. URL 같은 역할로 "이 AWS 어디의 무엇"을 정확히 가리킨다.

```
arn:aws:<service>:<region>:<account-id>:<resource>
```

| 부분 | 의미 | 예 |
|---|---|---|
| `arn:aws` | AWS ARN임 (고정) | `arn:aws` |
| `service` | 어떤 AWS 서비스 | `iam`, `s3`, `ecs`, `ecr` |
| `region` | 어떤 리전 | `ap-northeast-2`. **전역 서비스는 빈 칸** |
| `account-id` | 어느 AWS 계정 | 12자리 숫자 |
| `resource` | 그 안에서 구체적으로 무엇 | `user/john`, `role/admin`, `bucket/my-bucket` |

```
arn:aws:iam::<account-id>:user/seunggyu                    ← IAM 사용자 (region 없음)
arn:aws:iam::<account-id>:role/github-actions-admin-dev    ← IAM 역할
arn:aws:s3:::ishopcare-terraform-state                     ← S3 버킷 (s3도 region 없음)
arn:aws:ecs:ap-northeast-2:<account-id>:cluster/ishopcare-frontend-dev
arn:aws:ecr:ap-northeast-2:<account-id>:repository/ishopcare/admin
```

**region이 비어 있는 ARN이 있는 이유** — IAM·S3 버킷 이름 같은 **전역 서비스**는 리전과 무관하게 전 세계에서 유일하기 때문이다. EC2·ECS·ALB 같은 리전별 서비스는 채워진다.

### 왜 중요한가

1. **유일성** — 같은 이름이라도 region/account가 다르면 다른 ARN이라 충돌이 없다
2. **참조** — Terraform이나 정책 JSON에서 리소스를 가리킬 때 ARN을 쓴다
3. **권한 부여** — IAM Policy의 `Resource` 필드에 ARN을 적어 "어느 리소스에 접근 허용"을 표현한다
4. **디버깅** — 에러 메시지에 ARN이 나오면 "어디에서 권한이 부족한지"가 정확히 보인다

### ARN 표기가 같아도 종류는 다르다

```
arn:aws:iam::…:role/admin-dev-task-execution-role     ← ① 권한 (신분증)
arn:aws:ecs::…:service/…/admin-dev                    ← ② 실행체 (가게 그 자체)
```

- ① `iam:…:role/…` = **권한 신분증** → *무슨 권한으로*
- ② `ecs:…:service/…` = **task를 N개 유지하는 실행 단위** → *무엇을*

**ARN이라는 표기만 같을 뿐** 하나는 권한이고 하나는 돌아가는 물건이다. task 설계도에서 둘이 이렇게 쓰인다:

```hcl
execution_role_arn = "arn:aws:iam::<account-id>:role/admin-dev-task-execution-role"
#                     └ "이 task를 띄울 때 이 신분증을 입혀라"
```

## 6. execution role vs task role

ECS에는 role이 두 개 나온다. 시점이 다르다.

| | 누가 쓰나 | 언제 | 없으면 |
|---|---|---|---|
| **execution role** | ECS 인프라(agent)가 task를 **띄우는 준비**에 쓴다 | 기동 전 | task가 아예 안 뜬다 |
| **task role** | task가 뜬 뒤 **앱 코드가** 쓴다 | 실행 중 | 앱이 AWS 리소스를 못 만진다 |

execution role이 하는 준비 작업:

```
ECR에서 이미지 pull       ECR 읽기 권한     없으면 task가 아예 안 뜬다
로그 보낼 자리 만들기      CloudWatch 쓰기   없으면 로그 유실
시크릿 값 읽어 주입        Secrets 읽기      없으면 시크릿 주입 실패
```

프론트엔드 앱처럼 외부 API만 호출하고 AWS 리소스를 안 건드리는 경우, **task role은 거의 빈 신분증**이 된다.

### 왜 task에 내 자격증명을 못 쓰나

**task는 나와 무관한 독립 실행 주체다** — 내가 로그아웃해도 task는 계속 돈다. 그래서 task 자신에게도 권한이 필요한데, 내 access key를 박을 수는 없다 (유출 위험 + SSO라 몇 시간 뒤 만료돼 task가 멈춘다).

AWS의 답이 **role 방식**이다 — "task야, 이 role을 입어라" → task가 임시 자격증명을 자동으로 받아 동작한다.

> 출입증 비유: **나(SSO)** 는 가게 주인이라 가게(ECS service)를 차린다. **직원(task)** 은 주인이 자리를 비워도 일한다. 직원에게 마스터키(내 권한)를 주지 않고 **필요한 문만 열리는 출입증(execution role)** 을 발급한다 — 그 출입증으로 창고(ECR)에서 재료를 꺼내고, 일지(CloudWatch)를 쓰고, 금고(Secrets)에서 비번을 꺼낸다.

## 한 줄 정리

- **자격증명 ≠ 권한.** `AccessDenied`를 만나면 자격증명이 맞는지 / IAM 정책이 충분한지 둘 다 본다
- **`aws sts get-caller-identity`** 가 "지금 누구로 동작하는지" 확인하는 가장 빠른 방법이다
- **ARN = `arn:aws:<service>:<region>:<account>:<resource>`.** region이 비면 전역 서비스다
- **ARN 표기가 같아도 종류는 다르다** — role ARN은 신분증, service ARN은 실행체 이름표
- **execution role은 task를 띄우는 준비용, task role은 앱 코드용** — 시점이 다르다
- `~/.aws/credentials`에 access key가 평문 저장된다 → PC 분실·공유 시 키 회전 필요
