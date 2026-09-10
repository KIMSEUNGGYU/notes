---
title: RDS 다중 AZ
description: DB가 있는 AZ가 통째로 죽으면 — standby와 failover
order: 4
outline: deep
---
# RDS 다중 AZ

> 토대: [가용성과 AZ](./03-availability-az) · [VPC와 서브넷](./01-vpc). 이 문서의 질문: **DB가 있는 AZ가 통째로 죽으면?**

## 1. RDS와 Aurora

**RDS(Relational Database Service)** = AWS가 운영·관리해주는 관계형 DB 서비스. 백업·버전 패치·복제·장애복구를 AWS가 대신한다. DB 운영은 어렵고 위험해서 위임하는 쪽이 낫다.

**Aurora** = AWS가 만든 MySQL/PostgreSQL **호환** DB. 더 빠르고 클라우드 친화적이다.

**DB는 private 서브넷에 둔다.** 외부에 노출할 이유가 없으니 망분리한다 (`PubliclyAccessible=False`).

## 2. 문제 — DB는 SPOF가 되기 쉽다

DB 인스턴스가 한 AZ에만 있으면 그 AZ가 죽는 순간 **DB 전체 다운 = 서비스 마비**다.

앱 서버를 ALB로 여러 AZ에 이중화해봐야 소용없다. **DB가 죽으면 끝**이라, DB도 AZ 이중화가 필요하다.

## 3. Multi-AZ와 failover

**Multi-AZ** = 다른 AZ에 DB 복제본을 두고, 주 DB가 죽으면 자동으로 그 복제본으로 전환하는 것.

**failover(장애 조치)** = 장애 시 예비 시스템으로 자동 전환해 서비스가 끊기지 않게 하는 기술. DB만의 용어가 아니라 서버·네트워크에도 쓴다.

표준 RDS 기준 동작:

```
primary(주)  +  다른 AZ의 standby (동기 복제, 평소엔 읽기 안 함)
        │
   primary 장애
        ↓
   AWS가 자동 failover → 엔드포인트를 standby로 전환 (보통 1~2분)
```

**앱은 아무것도 안 바꾼다** — 같은 엔드포인트를 그대로 쓰면 AWS가 그 주소를 새 primary로 연결해준다.

### Aurora는 조금 다르다

데이터(스토리지)가 **이미 3개 AZ에 자동 복제**된다(스토리지 레벨). 그래서 Aurora의 "Multi-AZ"는 다른 AZ에 **reader 인스턴스를 두는 것**이고, 장애 시 reader를 writer로 **승격**한다.

```
표준 RDS   standby가 통째 복제본
Aurora     스토리지 공유 + 인스턴스만 추가  → failover가 더 빠르다
```

## 4. DB 서브넷 그룹 — 왜 "그룹"인가

**DB 서브넷 그룹** = RDS에게 "DB를 놓을 수 있는 후보 서브넷(=AZ) 목록"을 미리 묶어 건넨 것. 그룹은 **1개**고, 그 안에 **여러 AZ의 서브넷**을 담는다.

그 자체로 **RDS 전용 AWS 리소스**지만 새 네트워크는 아니다 — **기존 서브넷들을 가리켜 묶은 명단**이다. (서브넷 = 실제 땅, 서브넷 그룹 = 그 땅들을 가리키는 명단 종이)

::: warning AWS의 'group'은 다 다른 것이다
**보안 그룹** = 방화벽 규칙 · **타깃 그룹** = ALB가 보낼 서버 묶음 · **DB 서브넷 그룹** = RDS가 쓸 서브넷 목록. 이름만 같고 하는 일이 무관하다.
:::

**왜 서브넷 하나를 직접 안 고르고 그룹을 주나?** RDS는 Multi-AZ면 복제본을 다른 AZ에 자동 배치해야 한다. 그러려면 **어느 AZ들에 둘 수 있는지 후보를 미리 알아야** 하니, 단일 서브넷이 아니라 여러 AZ를 담은 목록을 준다.

```
VPC 10.2.0.0/16 의 db-private 서브넷들
 ├ dev-db-private-subnet-2a   ┐
 ├ dev-db-private-subnet-2b   ├─ 묶음 → DB 서브넷 그룹 'private-dev-db'
 └ dev-db-private-subnet-2c   ┘   RDS가 이 중 골라 primary/복제본 배치
```

동작 순서: ① db-private 서브넷들을 묶어 그룹 생성 → ② RDS 만들 때 그 그룹 지정 → ③ RDS가 그룹 안에서 primary를 한 AZ에 배치, Multi-AZ면 복제본을 다른 AZ에 자동 배치.

부동산에 **"이 동네 후보 집들 명단"** 을 주는 셈이다. 후보가 여러 AZ인 건 *별개 DB 여러 개*가 아니라 **한 DB의 primary + 복제본**을 다른 AZ에 두려는 것이다.

## 5. 실물로 확인 — dev vs prod (2026-06-04)

| 클러스터 | MultiAZ | 의미 |
|---|---|---|
| `i-shop-care-dev-my` (dev) | **False** | 단일 AZ — 비용 절감, AZ 죽으면 다운 감수 |
| `i-shop-care-prod-my` (prod) | **True** | 다중 AZ — 다른 AZ에 복제본 |

dev DB 인스턴스는 `aurora-mysql`, AZ 2b, `PubliclyAccessible=False`다. 서브넷 그룹 `private-dev-db`는 3개 AZ(2a/2b/2c)를 포함하니 **Multi-AZ를 켤 수 있는 상태**인데, dev는 꺼둬서 지금은 primary(2b)만 있다.

[가용성과 AZ](./03-availability-az#_6-az는-내가-고른다-—-그리고-그-비용)에서 본 **가용성 ↔ 비용 trade-off의 실증**이다. prod는 비싸지만 안전하게, dev는 싸지만 AZ 장애에 취약하게.

```bash
# 클러스터들의 MultiAZ 여부 (dev vs prod 비교)
aws rds describe-db-clusters \
  --query "DBClusters[].[DBClusterIdentifier,Engine,MultiAZ]" --output table

# 인스턴스 — 어느 AZ, public 여부
aws rds describe-db-instances \
  --query "DBInstances[?DBSubnetGroup.VpcId=='<VPC_ID>'].[DBInstanceIdentifier,MultiAZ,AvailabilityZone,PubliclyAccessible]" --output table

# 서브넷 그룹이 포함한 AZ
aws rds describe-db-subnet-groups \
  --query "DBSubnetGroups[?VpcId=='<VPC_ID>'].[DBSubnetGroupName,Subnets[].SubnetAvailabilityZone.Name]" --output json
```

## 한 줄 정리

- **RDS** = 관리형 관계형 DB, **Multi-AZ** = 다른 AZ에 복제본 + 자동 failover
- **failover 시 앱은 아무것도 안 바꾼다** — 엔드포인트가 그대로다
- **Aurora**는 스토리지가 이미 3 AZ 복제라, Multi-AZ는 reader 인스턴스 추가를 뜻한다
- **DB 서브넷 그룹**은 "복제본을 놓을 AZ 후보 명단"이라 여러 AZ를 담아야 한다
