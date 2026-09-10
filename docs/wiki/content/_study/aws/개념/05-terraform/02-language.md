---
title: Terraform 한 겹 더
description: 참조로 만들어지는 의존성, count/for_each, lifecycle, 환경 분리
order: 2
outline: deep
---
# Terraform 한 겹 더

> [Terraform 토대](./01-basics)가 "안 헤매는 최소치"였다면, 이건 **실제 코드를 막힘없이 읽는 데 필요한 다음 레이어**다. 빌드 중에 만나게 되는 것들.

## 1. 참조 = 자동 의존성

리소스가 다른 리소스의 값을 **참조하면, Terraform이 생성 순서를 스스로 계산한다.**

```hcl
module "ecs" {
  alb_sg_id    = module.alb.alb_sg_id        # ← alb를 참조
  listener_arn = module.alb.listener_arn
}
```

ecs가 alb의 출력을 쓰니까 Terraform이 **"alb 먼저, ecs 나중"** 을 자동 판단한다. 순서를 손으로 정할 필요가 없다.

**참조가 없는데 순서를 강제해야 할 때만** `depends_on`을 수동으로 쓴다:

```hcl
depends_on = [aws_lb_listener_rule.admin]   # 직접 참조는 없지만 rule이 먼저 있어야 한다
```

이 성질이 [ACM 인증서를 검증 리소스로 참조하는](./03-patterns#_1-acm-인증서-dns-검증-—-리소스-3개의-춤) 패턴의 근거이기도 하다.

## 2. 표현식과 보간

```hcl
name = "alb-ishopcare-frontend-${var.environment}"                                    # 문자열 끼워넣기
subject_alternative_names = var.environment == "dev" ? ["*.${var.domain_name}"] : []  # 삼항 조건
```

```
var.x         변수
local.x       파일 안 임시 별명
module.x.y    모듈 출력
조건 ? A : B  삼항 — 환경마다 다른 값을 if 없이 한 줄로
```

## 3. count vs for_each

```hcl
# count: 0개 또는 1개 (스위치)
resource "aws_route53_record" "preview_wildcard" {
  count = var.environment == "dev" ? 1 : 0    # dev에만 생성
}

# for_each: 컬렉션 항목마다 1개씩
resource "aws_route53_record" "cert_validation" {
  for_each = { for d in ... : d.domain_name => {...} }
}
```

```
count      개수 기준 (인덱스 0, 1, 2…)
for_each   키 기준 (맵/셋)
```

**항목이 추가·삭제될 수 있으면 for_each가 안전하다.** count는 인덱스가 밀리면서 엉뚱한 리소스가 재생성되는 사고가 난다.

## 4. lifecycle — 기본 행동 덮어쓰기

```hcl
resource "aws_ecs_service" "admin" {
  lifecycle {
    ignore_changes = [task_definition, desired_count]   # CI/CD가 바꾼 걸 안 되돌린다
  }
}

resource "aws_acm_certificate" "main" {
  lifecycle { create_before_destroy = true }            # 새것 먼저 만들고 옛것 삭제 (무중단)
}
```

- **`ignore_changes`** — "이 필드는 콘솔이나 CI가 바꿔도 내가 간섭하지 않는다." **IaC와 CI/CD 충돌 방지의 핵심**이다. 배포 때마다 task_definition이 바뀌는데 terraform이 매번 되돌리려 들면 둘이 싸운다
- **`create_before_destroy`** — 교체 시 새것을 먼저 생성해 다운타임 0
- **`prevent_destroy = true`** — 실수로 삭제하는 걸 막는다. 운영 DB 같은 데 쓴다

## 5. 환경별 분리 = 파일 2개를 따로 주입

dev/prod를 **두 축으로** 나눈다:

```bash
terraform init  -backend-config=environments/dev.s3.tfbackend   # ① state 위치
terraform plan  -var-file=environments/dev.tfvars               # ② 변수 값
```

```
-backend-config   state를 어디 둘지 (dev state ≠ prod state, 절대 안 섞인다)
-var-file         그 환경의 값 (domain_name, cpu 등)
```

**코드(main.tf·모듈)는 하나**고, 주입하는 두 파일만 갈아끼워 dev/prod를 만든다 — SSOT가 유지된다.

## 6. provider 버전 고정

```hcl
required_providers {
  aws = { source = "hashicorp/aws", version = "~> 5.0" }   # 5.x 허용, 6.0은 막는다
}
```

`~> 5.0`은 "5.x는 OK, 6.0은 금지"라는 뜻이다(pessimistic 연산자). **팀과 CI가 같은 provider 버전으로 plan하게 해** drift와 예상 못 한 동작을 막는다.

## 한 줄 정리

- **참조하면 의존성이 자동**으로 잡힌다 — 순서를 안 정해도 된다 (없을 때만 `depends_on`)
- **표현식**: `${}` 보간, `var.`/`local.`/`module.`, `조건 ? A : B`
- **count**(개수) vs **for_each**(키별) — 변동 가능하면 for_each
- **lifecycle**: `ignore_changes`(CI 충돌 방지) / `create_before_destroy`(무중단 교체)
- **환경 분리**: `-backend-config`(state) + `-var-file`(값), 코드는 하나
- **버전 고정** `~> 5.0`으로 팀 일관성
