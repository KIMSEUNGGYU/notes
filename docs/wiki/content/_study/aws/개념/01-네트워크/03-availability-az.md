---
title: 가용성과 AZ
description: 한 대가 죽어도 서비스가 안 멈추게 하는 이중화의 단위
order: 3
outline: deep
---
# 가용성과 AZ

> 토대: [VPC와 서브넷](./01-vpc) — 서브넷은 한 AZ에 묶인다. 이 문서의 질문: **서버 한 대가 죽어도 서비스가 안 멈추게 하려면?**

## 1. 가용성 — 안 죽는 시간의 비율

**가용성(Availability)** = 시스템이 정상 동작하는 시간의 비율.

```
99.9%   "쓰리 나인"  연간 다운 약 8.7시간
99.99%  "포 나인"    연간 다운 약 52분
```

9가 하나 늘 때마다 다운 시간이 약 1/10이 된다. 높일수록 비싸고 복잡하다.

## 2. 이중화 — SPOF를 없애는 것

**이중화(Redundancy)** = 같은 역할을 하는 걸 2개 이상 둬서 하나가 죽어도 다른 게 받게 하는 것.

목적은 **단일 장애점(SPOF, Single Point of Failure) 제거**다. SPOF = 그것 하나 죽으면 전체가 멈추는 지점. 서버 1대면 그 서버가 SPOF고, 2대로 늘리면 1대가 죽어도 나머지가 받는다.

가용성을 높이는 수단이 곧 이중화다.

## 3. AZ — "AZ = 리전" 오해 교정

**AZ(Availability Zone, 가용영역)** = 한 리전 안에 있는, 물리적으로 분리된 데이터센터. 전력·냉각·네트워크가 서로 독립이라 **한 AZ 장애가 다른 AZ로 안 번진다.**

```
리전  지역 (서울 ap-northeast-2)
 └ AZ  그 지역 안의 개별 데이터센터 (2a · 2b · 2c · 2d)

포함관계: 리전 ⊃ AZ
```

비유하면 **리전 = 도시, AZ = 그 도시에 멀리 떨어뜨려 지은 데이터센터 건물 여러 채.** 한 건물이 정전 나도 다른 건물은 멀쩡하다. 서울 리전엔 AZ가 4개 있다.

## 4. 다중 AZ 배치 = AZ 단위 이중화

같은 역할의 리소스를 서로 다른 AZ에 둔다 → 한 AZ(건물)가 통째로 죽어도 나머지가 받는다.

메커니즘은 서브넷을 경유한다. 서브넷은 한 AZ에 묶이니까 → **여러 AZ에 서브넷을 깔고, 각 AZ 서브넷에 리소스를 배치**한다.

- 들어오는 트래픽은 **ALB가 살아있는 AZ로 분산** (→ [ALB 심화](../02-트래픽/02-alb))
- DB는 **다른 AZ에 standby** (→ [RDS 다중 AZ](./04-rds))

한 AZ가 죽으면 그 AZ 리소스만 빠지고 나머지 AZ가 계속 처리한다.

## 5. 왜 `/16`을 `/20` 7개로 쪼갰나

실제 dev VPC(`10.2.0.0/16`)는 `/20` 7개로 쪼개져 있다. **이름이 곧 설계도** — `dev-{tier}-subnet-{az}`:

```
tier          AZ           개수   용도
public        2a, 2b        2    외부 접점(ALB 등)
private(앱)   2a, 2b        2    앱 서버
db-private    2a, 2b, 2c    3    DB
                          = 7
```

정확히 **(여러 AZ) × (tier)** = 2 + 2 + 3 = 7이다. (tier를 `Tier` 태그가 아니라 Name에 인코딩해 뒀다 — 그래서 `Tier` 태그로 쿼리하면 빈 값이 나온다.)

**`/16` 통째로 서브넷 1개로 쓰면 안 되는 이유 둘:**

1. 서브넷은 **한 AZ에만** 묶인다 → 1개면 1개 AZ에만 존재 → 그 AZ가 죽으면 전멸. 여러 AZ에 깔려면 **AZ 수만큼 서브넷이 필요**하다
2. **public/private을 못 나눈다** → 같은 AZ 안에서도 외부 접점과 숨길 것을 다른 서브넷으로 분리해야 망분리가 된다

### "쪼갠다"의 정체

물리 작업이 아니다. VPC CIDR(`10.2.0.0/16`) 안에서 **안 겹치는 작은 CIDR + AZ + 용도를 지정한 서브넷 리소스를 여러 개 선언**하는 것이다.

```hcl
resource "aws_vpc" "main" { cidr_block = "10.2.0.0/16" }

resource "aws_subnet" "public_2a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.2.0.0/20"       # /16 안에서 잘라낸 블록
  availability_zone = "ap-northeast-2a"    # AZ 지정
}
# public_2b, private_2a/2b, db_private_2a/2b/2c ... (보통 for_each로 반복)
```

## 6. AZ는 내가 고른다 — 그리고 그 비용

**AZ 선택 = 서브넷 선택.** 서브넷을 만들 때 AZ를 1개 지정하니(서브넷 ↔ AZ 1:1), 리소스를 배치할 때 어느 서브넷에 둘지로 AZ가 정해진다. 여러 AZ 서브넷을 주면 다중 AZ 배치가 된다.

"1개만 쓰면 SPOF"는 맞지만 AWS가 강제로 1개인 건 아니다 — 내 선택이다. 오히려 **ALB는 최소 2 AZ가 필수**고, RDS는 Multi-AZ 옵션이 있는 등 다중 AZ를 권장·요구하는 쪽이 많다.

**비용은 가용성의 대가다:**

```
서브넷 자체        무료. 여러 개 만들어도 0원
리소스 복제        ECS 2 AZ = 2대치, RDS Multi-AZ ≈ 2배(standby), NAT는 AZ마다 두면 개수만큼
AZ 간 데이터 전송   다른 AZ 사이 트래픽에 소액 과금 (같은 AZ 내부는 보통 무료)
```

한 줄로: **"AZ 여러 개"(서브넷) 자체는 공짜, 비용은 "리소스 중복 + AZ 간 전송"에서 나온다.** 그래서 prod는 다중 AZ로 가고 dev는 절감을 위해 덜 쓰기도 한다.

## 7. 확인하는 법

```bash
# 서울 리전의 AZ 목록
aws ec2 describe-availability-zones --region ap-northeast-2 \
  --query "AvailabilityZones[].ZoneName" --output table

# dev VPC 서브넷이 어느 AZ에 깔렸나
aws ec2 describe-subnets --filters "Name=vpc-id,Values=<VPC_ID>" \
  --query "Subnets[].[AvailabilityZone,CidrBlock]" --output table
```

서브넷이 2a/2b/2c 여러 AZ에 흩어져 있으면 AZ 단위 이중화가 이미 설계돼 있다는 뜻이다.

## 한 줄 정리

- **가용성** = 안 죽는 시간 비율, **이중화** = 같은 역할 2개 이상으로 SPOF 제거, **AZ** = 리전 안의 독립 데이터센터(서울 4개)
- **다중 AZ 배치** = 서브넷을 여러 AZ에 깔아 리소스를 분산 → 한 AZ가 죽어도 유지
- **`/16`을 `/20` 여러 개로 쪼갠 건** (여러 AZ) × (public/private) 때문
