---
title: Terraform 실전 패턴
description: ACM 3-리소스 춤 · jsonencode · for 표현식 · sensitive
order: 3
outline: deep
---
# Terraform 실전 패턴

> [토대](./01-basics)(개념) → [한 겹 더](./02-language)(언어 기능) → **이 문서(실전 패턴).** 실제 코드에 나오지만 앞의 둘에 없던 구체 패턴들.

## 1. ACM 인증서 DNS 검증 — 리소스 3개의 춤

HTTPS를 쓰려면 ALB에 **검증된 SSL 인증서**가 필요하다. 이걸 **리소스 3개**로 처리하는데, 왜 3개인지가 핵심이다.

```hcl
# ① 인증서 "신청" — 아직 미검증 (PENDING_VALIDATION)
resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = var.environment == "dev" ? ["*.${var.domain_name}"] : []
  validation_method         = "DNS"
  lifecycle { create_before_destroy = true }
}

# ② ACM이 "이 DNS 레코드로 도메인 소유를 증명해"라고 준 값으로 레코드 생성
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for d in aws_acm_certificate.main.domain_validation_options : d.domain_name => {
      name = d.resource_record_name, record = d.resource_record_value, type = d.resource_record_type
    }
  }
  zone_id = var.hosted_zone_id
  name    = each.value.name      # ACM이 시킨 레코드 이름
  type    = each.value.type
  records = [each.value.record]  # ACM이 시킨 값
  ttl     = 60
}

# ③ "레코드 다 만들었으니 검증 완료될 때까지 기다려" — 실제 리소스 생성 X, 대기 게이트
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}
```

**왜 3개인가 — 신분증 발급 비유:**

```
① 신분증 발급 신청 (아직 안 나옴)
② 관청이 "이 서류를 우편함에 붙여 본인 확인되게 해" → DNS 우편함에 붙임
   (dev는 apex + 와일드카드 2개라 for_each로 2장)
③ "서류 다 붙였으니 신분증 나올 때까지 대기" 도장
   AWS에 새 리소스를 만드는 게 아니라 검증 완료를 보장하는 대기 장치
```

**결정적 디테일:** ALB 리스너는 **③의 `certificate_arn`을 참조한다.** ①의 raw 인증서가 아니라 ③을 참조해야 **"검증 끝난 인증서만 ALB에 장착"** 순서가 [자동 의존성](./02-language#_1-참조-자동-의존성)으로 보장된다. 미검증 인증서가 붙으면 HTTPS가 깨진다.

그래서 apply 때 ACM 단계가 5분쯤 걸린다 (DNS 전파 + 검증 대기).

개념 쪽 배경은 [ACM 인증서와 SAN](../02-트래픽/03-acm)에 있다.

## 2. jsonencode — HCL을 JSON으로

IAM 정책, ECS 컨테이너 정의, ECR lifecycle은 **AWS가 JSON을 요구한다.** HCL로 쓰고 변환한다:

```hcl
policy                = jsonencode({ Version = "2012-10-17", Statement = [...] })
container_definitions = jsonencode([{ name = "admin", image = "...:${var.image_tag}" }])
```

JSON을 직접 따옴표로 쓰지 않고 **HCL 변수·참조를 자연스럽게 끼워** 쓸 수 있다.

## 3. for 표현식과 each

```hcl
[for r in aws_route53_record.cert_validation : r.fqdn]            # 리스트 만들기
{ for d in list : d.domain_name => {...} }                        # 맵 만들기
[for k, arn in var.secrets_arns : { name = k, valueFrom = arn }]  # 맵 → 객체 리스트
values(var.secrets_arns)                                          # 맵의 값들만
```

`for_each` 블록 **안**에서는 `each.key` / `each.value`로 현재 항목을 참조한다 (위 ② 코드의 `each.value.name`이 그것).

## 4. 내장 함수와 sensitive

```hcl
replace(module.alb.alb_arn, "/regex/", "")   # 문자열 치환 (alb_arn_suffix 뽑기)
split(":", arn)[5]                            # ":"로 쪼개 6번째 조각 (ARN 파싱)
contains(["dev","prod"], var.environment)     # 포함 검사 (variable validation)
```

`sensitive = true`를 주면 **plan과 output에서 값이 `<sensitive>`로 가려진다.**

::: warning sensitive는 화면만 가린다
**state엔 평문으로 저장된다.** 그래서 state를 S3 `encrypt = true` + 접근 제한에 두는 것이고, 진짜 비밀은 [Secrets Manager로 그릇과 값을 분리](../03-컨테이너/04-env-secrets#_4-갈래-3-—-그릇과-값의-분리-그리고-분리의-함정)한다.
:::

## 한 줄 정리

- **ACM = 리소스 3개**: 신청(①) → 소유증명 DNS 레코드(② for_each) → **검증 대기 게이트(③)**. ALB는 ③을 참조해야 검증된 인증서만 장착된다
- **jsonencode**: AWS가 JSON을 원하는 곳(IAM/ECS/ECR)에 HCL로 쓰고 변환
- **for/each**: 컬렉션을 리스트·맵·객체 리스트로 변환, `each.value`로 현재 항목
- **함수**: `replace`/`split`/`contains` 등 + `sensitive`(출력만 가림, **state엔 평문**)
