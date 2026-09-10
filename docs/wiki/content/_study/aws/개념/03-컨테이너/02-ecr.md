---
title: ECR과 이미지 태그 체계
description: 창고 하나, 이름표로 구분, 청소부는 prefix 단위
order: 2
outline: deep
---
# ECR과 이미지 태그 체계

> **한 줄:** ECR(Elastic Container Registry — Docker 이미지 보관 창고)은 환경마다 만드는 게 아니라 **단일 repo 하나**다. dev/prod/preview 구분은 전부 태그가 하고, 자동 청소(lifecycle policy)도 태그 prefix 단위로 돈다. 그래서 **태그 체계를 바꾸면 청소 규칙도 같은 PR에서** 바꿔야 한다 — 따로 가면 어느 청소부도 안 보는 사각지대가 생긴다.

## 1. 문제 — 구운 이미지를 어디 두고, ECS는 어떻게 받나

CI가 `docker build`로 이미지를 구웠다. ECS task가 이걸 받아 실행하려면 둘 다 접근할 수 있는 보관소가 필요하다:

```
CI (GitHub Actions)   → docker push 로 올리는 곳
ECS execution role    → task 띄울 때 pull 하는 곳
```

그게 ECR이다. 옵션으로 `scan_on_push = true`를 켜면 push할 때마다 취약점 스캔이 돈다.

### repo를 환경별로 안 만드는 이유

**이미지 자체는 환경과 무관하다** — 어디서 돌릴지는 ECS가 정한다. dev/prod로 repo를 쪼개면 같은 이미지를 두 번 push하거나 복사해야 한다. 그래서 **repo는 1개, 구분은 태그로.**

같은 이유로 prod 환경의 terraform은 ECR을 새로 만들지 않고 **data source로 발견**한다 — OIDC provider와 같은 "계정 공유 리소스" 패턴이다 (→ [GitHub OIDC](../04-보안/05-oidc)).

## 2. 태그 체계 — 이름표가 출처·용도·청소 규칙을 결정한다

| 태그 | 누가 만드나 | 의미 | 청소 규칙 |
|---|---|---|---|
| `main-{sha7}` | main 머지 → prod 배포 워크플로 | main 브랜치 커밋의 배포분 | 최근 30개 초과분 삭제 |
| `pr-{N}-{sha7}` | PR preview-up 워크플로 | PR별 preview분 | push 30일 후 삭제 |
| untagged | (아무도 의도하지 않음) | 태그를 잃은 찌꺼기 | push 7일 후 삭제 |

### 태그에 커밋 sha를 박는 이유 — 불변성

**"한 커밋 = 한 이미지 = 한 태그"** 가 성립해야 얻어지는 것들이 있다:

- **빌드 스킵** — 같은 태그가 ECR에 이미 있으면 다시 안 굽는다. 같은 커밋은 같은 이미지라고 믿을 수 있어야 성립한다
- **롤백** — 옛 sha 태그를 입력해 재배포한다. 태그가 `latest`뿐이면 "어느 커밋인지"를 잃어 롤백이 불가능하다
- **prefix(`main-`/`pr-`)** — ① 출처를 이름에 박고 ② 청소 규칙의 키가 된다. 맨 `{sha}`만 쓰면 둘 다 잃는다

repo 설정이 `image_tag_mutability = "MUTABLE"`(같은 태그 덮어쓰기 허용)이어도 **운영은 불변 태그**로 한다 — 설정으로 강제하는 게 아니라 sha 태깅 규약으로 지키는 것이다.

## 3. untagged의 정체 — MUTABLE 창고의 미아

untagged는 "태그를 잃은 이미지"다. 태그는 이미지에 새겨진 게 아니라 **이미지를 가리키는 포인터**라서, MUTABLE이면 포인터가 옮겨갈 수 있다:

```
push 전:   태그 main-abc1234 ──→ 이미지 A

같은 태그로 새 이미지 push

push 후:   태그 main-abc1234 ──→ 이미지 B   (포인터 재할당)
           이미지 A ──→ 가리키는 태그 0개 = untagged (아무도 못 찾는 미아)
```

정상 이미지가 아니라 찌꺼기이므로 7일이라는 가장 짧은 보존을 준다.

::: warning untagged는 조회 코드도 깨뜨린다
cleanup의 이미지 삭제 쿼리가 untagged(`imageTag=null`)를 만나 `starts_with(null)` 형식 에러로 **청소 전체가 크래시**한 적이 있다. 수정은 후처리가 아니라 **입력 정제** — 쿼리에 `--filter tagStatus=TAGGED`를 걸어 애초에 안 보이게 했다.

교훈: 목록 처리 코드는 **"null 항목이 섞일 수 있나"** 를 항상 물을 것.
:::

## 4. lifecycle policy — prefix 단위 청소부

lifecycle policy(오래된 이미지 자동 삭제 규칙)는 창고가 무한정 쌓이지 않게 한다. 규칙은 우선순위 순으로 평가되고, **각 규칙이 자기 prefix만** 본다:

```
규칙 1  main-  태그   30개 초과분 삭제      (imageCountMoreThan — 개수 기준)
규칙 2  pr-    태그   push 30일 후 삭제     (sinceImagePushed — 날짜 기준)
규칙 3  untagged      push 7일 후 삭제
```

기준이 **개수와 일수로 섞여 있는 게** 헷갈리기 쉬운 지점이다. 배포분(`main-`)은 "최근 N개"가 의미 있고(롤백 후보), preview분(`pr-`)은 PR이 닫히면 무의미해지니 날짜 기준이다.

preview가 7일이 아니라 30일인 이유 — **7일짜리는 untagged(찌꺼기)** 다. `pr-`는 태그가 살아 있는 정상 이미지라 범주가 다르다.

### 태그 체계 변경 = 청소 규칙 변경, 반드시 같은 PR로

build-once 전환(태그 `dev-`/`prod-` → `main-`) 때 lifecycle도 `main-` 규칙으로 교체했다. 둘이 따로 머지되면 **그 사이에 쌓이는 이미지는 어느 청소부 담당도 아닌 영구 잔존물**이 된다.

같은 이유로 전환 전에 쌓인 옛 체계 이미지들은 규칙 교체 후 어느 규칙도 안 보므로, 새 체계가 잘 도는 걸 확인한 뒤 **수동 정리 1회**가 필요하다(롤백 보험으로 전환 직후엔 남겨둔다).

## 5. 몰랐던 것 → 교정된 이해

- **lifecycle policy 변경이 terraform plan에 "1 add / 1 destroy"로 뜬다.** in-place 수정이 아니라 정책 리소스의 교체로 처리된다. 처음 보면 "뭔가 지워진다"고 놀라지만 지워지는 건 **청소 규칙 문서이지 이미지·트래픽이 아니다** — 무해하다
- **IAM은 "pr-* 태그만 push"를 표현하지 못한다.** ECR push 권한은 repo 단위까지만 한정 가능하고 태그 단위 제한이 없다. 그래서 preview 전용 role도 repo 전체에 push할 수 있다. 위험하지 않나 — 최악 사고는 "이상한 태그가 ECR에 쌓임"에 그친다. dev/prod를 좌우하는 건 **어느 태그를 배포하느냐**인데, 그 권한(서비스 갱신)은 패턴으로 따로 잠근다
- **이미지 크기가 곧 배포 속도다.** pull이 배포·롤백·preview 기동마다 일어난다 (→ [Dockerfile과 standalone](./03-dockerfile))

## 6. 비유

- **ECR** = 회사 공용 **냉동 창고 1개** — 빵공장(CI)이 넣고, 매장(ECS)이 꺼내 간다
- **태그** = 상자에 붙은 **이름표**. 같은 이름표를 새 상자에 붙이면 옛 상자는 미아(untagged)
- **lifecycle policy** = **구역별 청소부** — `main-` 구역 담당과 `pr-` 구역 담당이 따로 있고, 자기 구역 밖은 쳐다보지 않는다. 그래서 구역 개편과 청소부 재배치는 동시에

## 한 줄 정리

- **repo는 계정에 1개, 환경 구분은 전부 태그.** prod terraform은 data source로 발견만 한다
- 태그 3계열: **`main-{sha7}`(배포분·30개) / `pr-{N}-{sha7}`(preview·30일) / untagged(찌꺼기·7일)** — sha가 불변성과 롤백을 만든다
- **태그 체계와 lifecycle 규칙은 한 몸** — 같은 PR로 바꾸지 않으면 청소 사각지대가 생긴다
- IAM은 태그 단위 push 제한이 불가능하고, lifecycle 변경은 plan에 add+destroy 쌍으로 떠도 무해하다
