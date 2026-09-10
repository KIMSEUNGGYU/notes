---
title: Terraform 토대
description: 선언적 IaC의 핵심 객체 6개와 init → plan → apply
order: 1
outline: deep
---
# Terraform 토대

> 인프라를 Terraform으로 구축하기 전 **손에 쥘 최소 개념.** 도구는 외우는 게 아니라 쓰면서 익는 것이라, 이건 "안 헤매게 하는 토대"일 뿐이다.

## 1. Terraform이 뭔가

**인프라를 코드로 선언하면 "현재 상태 → 원하는 상태"의 차이를 자동으로 맞춰주는 도구**(IaC, Infrastructure as Code).

**선언적**이라는 게 핵심이다 — "이걸 만들어라"(명령)가 아니라 **"최종 상태는 이거다"**(선언)라고 쓰면, Terraform이 알아서 생성/수정/삭제를 판단한다.

비유하면 **쇼핑 리스트(원하는 최종 상태)** 를 주면 Terraform이 **냉장고(현재 상태)** 를 보고 **부족한 것만** 채운다. 이미 있으면 안 사고, 빠진 것만 사고, 빼야 할 건 버린다.

## 2. 핵심 객체 6개

### provider — 어떤 클라우드와 통신할지

```hcl
provider "aws" {
  region = var.aws_region
  default_tags { tags = { Project = "ishopcare", Service = "admin" } }
}
```

"AWS를, 이 리전에서, 이 태그를 기본으로." provider는 대상 클라우드의 드라이버다.

### resource — 새로 만들 인프라 한 조각

형식은 `resource "타입" "이름" { 설정 }`이고, Terraform이 **생성·소유·관리**한다.

```hcl
resource "aws_ecr_repository" "admin" { ... }
resource "aws_ecs_service" "admin"    { ... }
```

### data source — 기존에 있는 걸 읽어옴 (발견)

```hcl
# 백엔드 팀이 만든 VPC를 태그로 발견
data "aws_vpc" "shared" {
  tags = { Project = "ishopcare", Environment = var.environment }
}

data "aws_subnets" "private" {
  filter { name = "vpc-id"   values = [data.aws_vpc.shared.id] }
  filter { name = "tag:Name" values = ["${var.environment}-private-subnet-*"] }
}
```

**만드는 게 아니라 찾는 것이다.** "기존 VPC를 재사용한다"는 말의 실제 구현이 이것이고, 손으로 돌리던 `aws ec2 describe-vpcs`의 Terraform 버전이다.

::: warning data source는 코드 쓰기 전에 실제 조회로 검증한다
dev VPC의 subnet엔 `Tier` 태그가 **없었다.** public/private 구분이 `Name` 태그에 있어서(`dev-public-subnet-*` / `dev-private-subnet-*` / `dev-db-private-subnet-*`), `tag:Tier` 필터로 짰으면 빈 결과를 받았을 것이다.

`dev-private-subnet-*` 패턴은 접두어가 달라 db subnet이 자동 제외되는 것까지 확인해야 한다. **"진짜 찾아지는지"를 먼저 CLI로 쳐보는 단계가 필요하다.**
:::

### variable — 입력값 (환경별로 바뀌는 것)

```hcl
variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment는 'dev' 또는 'prod'여야 합니다."
  }
}
```

dev/prod처럼 바뀌는 값을 밖에서 주입하고 `var.environment`로 참조한다. `validation`으로 잘못된 값을 막을 수도 있다.

### output — 결과값

```hcl
output "alb_dns_name" {
  value = module.alb.alb_dns_name
}
```

- **무엇**: "이 값을 밖으로 내보내라"는 **선언**이다 (값을 저장하는 파일이 아니다)
- **값은 언제 정해지나**: `plan`/`apply` 때 terraform이 계산한다. 그 전엔 미지이고 코드엔 참조만 있다
- **어떻게 보나**: `apply` 후 `terraform output`, 또는 `plan` 출력
- **왜 쓰나**: ① 사람이 결과 확인(ALB 주소 등) ② 다른 모듈·루트에 값 전달

모듈에 붙은 **"이거 가져다 쓰세요" 라벨 출구**라고 보면 된다.

### module — 관련 리소스를 묶은 재사용 단위

폴더 하나가 모듈 하나다(`modules/{networking, alb, ecs, iam, ecr}`). 루트에서 호출하고 결과를 참조한다:

```hcl
module "alb" { source = "./modules/alb", ... }
# → module.alb.alb_dns_name 으로 결과 참조
```

레고 블록처럼 조립하는 단위다.

## 3. 워크플로 — init → plan → apply

```bash
terraform init      # 초기화: provider 다운로드 + backend(state) 연결
terraform fmt       # 코드 포맷 정리            (권한 0)
terraform validate  # 문법 검사                 (권한 0)
terraform plan      # ★미리보기★ 뭐가 만들어지고 바뀔지 diff  (권한 0~read)
terraform apply     # 실제 적용                 (실전 권한 필요)
```

**`plan`이 핵심 안전장치다.** apply 전에 "+추가 / ~변경 / -삭제"를 전부 보여준다.

학습 관점에서 중요한 점: **`validate`와 `plan`은 권한 부담이 거의 0**이라 지금 당장 돌려볼 수 있고, `apply`만 실권한이 필요하다. 그래서 권한을 받기 전에도 실전 학습이 가능하다.

## 4. state와 backend — Terraform의 기억과 그 보관함

**state** = Terraform이 "내 코드 ↔ 실제 클라우드 리소스"를 매핑해 기억하는 파일. `plan`이 이 기억과 실제를 비교해 diff를 계산한다.

**backend** = 그 state를 **어디에 둘지** 정하는 설정.

::: warning "앱 백엔드(서버)"와 무관한 동음이의어다
Terraform의 backend는 state 저장 위치를 말한다.
:::

```
local backend (기본)   내 노트북에 terraform.tfstate 파일 1개. 나만 본다
remote backend (S3)    공용 저장소에 둬 팀이 같은 state를 공유
```

`terraform init`의 "backend 연결"이 그 S3에 붙어 state를 끌어오는(또는 새로 준비하는) 동작이다.

```hcl
terraform {
  backend "s3" {
    bucket         = "ishopcare-terraform-state"   # state를 S3에 저장
    dynamodb_table = "ishopcare-terraform-lock"    # 동시 apply 잠금
    encrypt        = true
  }
}
```

**왜 S3 + DynamoDB lock인가:**

- **S3** — state를 한 곳에 둬 **팀이 같은 기억을 공유**한다 (내 노트북에만 있으면 협업이 불가능하다)
- **DynamoDB lock** — 두 사람이 동시에 apply하면 state가 깨진다 → 잠금으로 한 번에 하나만

비유: state = 가구 장부, local = 내 책상 서랍, S3 backend = 공용 캐비닛, DynamoDB lock = 캐비닛의 "수정 중" 표시등.

**state는 평문 JSON이다** — 그래서 시크릿 값을 코드에 넣으면 state에 그대로 남는다 (→ [환경변수와 시크릿](../03-컨테이너/04-env-secrets#_4-갈래-3-—-그릇과-값의-분리-그리고-분리의-함정)).

## 5. resource vs data source — 제일 중요한 구분

| | resource | data source |
|---|---|---|
| 하는 일 | **새로 생성** | 기존 것 **발견(읽기)** |
| 소유 | Terraform이 만들고 관리 | 안 만든다, 참조만 |
| 예 | 새 ALB·ECS·IAM·ECR | 기존 VPC·서브넷 |

## 한 줄 정리

- **Terraform = 원하는 최종 상태를 코드로 선언 → 현재와의 diff를 맞춰주는 선언적 IaC**
- 객체 6개: **provider**(대상) / **resource**(새로 생성) / **data source**(기존 발견) / **variable**(입력) / **output**(결과) / **module**(묶음)
- **init → plan → apply**, `plan`이 안전장치다. validate·plan은 권한 부담이 0이라 먼저 돌려볼 수 있다
- **state**는 S3 + lock에 둬 팀 공유·충돌 방지. 단 **평문이라 시크릿을 넣으면 안 된다**
