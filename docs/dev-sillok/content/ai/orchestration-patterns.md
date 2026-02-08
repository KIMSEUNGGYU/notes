---
title: Claude Code 플러그인 — 에이전트 오케스트레이션 패턴
description: Claude Code에서 서브에이전트를 활용한 작업 오케스트레이션 패턴 정리
outline: deep
---

# Claude Code 플러그인 — 에이전트 오케스트레이션 패턴

## 지금 우리가 쓰는 Claude Code

```
사용자 → [Claude 1명] → 파일 읽기 → 생각 → 코드 작성 → 테스트 → ...
```

1명이 전부 한다. 작업이 커지면?
- 파일을 많이 읽을수록 **기억 공간(컨텍스트)이 차서** 앞의 지시를 잊음
- 설계 + 구현 + 검증을 한 Claude가 전부 → 불안정



## 멀티 에이전트: 왜?

**핵심: 기억 공간(컨텍스트) 분리.**

```
[메인 Claude] ──Task()──→ [새 Claude A] ──→ 결과만 반환
              ──Task()──→ [새 Claude B] ──→ 결과만 반환
              ──Task()──→ [새 Claude C] ──→ 결과만 반환
```

- Task = 새 Claude를 하나 더 띄우는 것 (독립 기억 공간)
- 각자 독립 컨텍스트에서 작업 → **메인의 기억 공간은 깨끗하게 유지**
- 메인은 결과만 받아서 종합 → 더 많은 작업을 안정적으로 처리



## 오케스트레이터: 지휘만 한다

멀티 에이전트에서 메인 Claude는 **오케스트레이터(지휘자)** 역할.

```
✅ 계획 수립
✅ 작업 분배 (Task 호출)
✅ 결과 종합 / 판단
✅ 실패 시 재시도 결정
❌ 직접 코드 작성 ← 에이전트에게 위임
```

> 직접 코드를 쓰면 파일 내용으로 컨텍스트가 차기 때문에,
> 오케스트레이터는 **읽기 + 판단 + 위임만** 한다.



## Autopilot 흐름 — OMC 실제 예시

### OMC 설정: `commands/autopilot.md`

```yaml
---
description: Fully autonomous workflow from idea to working code
---
```

```markdown
**YOU ARE AN ORCHESTRATOR, NOT AN IMPLEMENTER**
- 파일 읽기, 진행 추적, 상태 전달만
- 모든 코드 변경은 전문 실행 에이전트로 위임
```

### 실행 흐름

```
사용자: "/autopilot 로그인 페이지 만들어"
```

**Phase 1. 계획** — 메인 Claude가 직접

```
"로그인 페이지를 만들려면..."
→ API 연동 필요
→ 폼 컴포넌트 필요
→ 라우팅 설정 필요
```

**Phase 2. 설계** — architect에게 순차 위임

```
Task(architect) → "로그인 페이지 구조 설계해줘"
               → 결과: 파일 목록, 컴포넌트 구조, API 스펙
```

**Phase 3. 구현** — executor에게 병렬 위임

```
Task(executor, "LoginForm 컴포넌트 만들어")  ─┐
Task(executor, "useLogin 훅 만들어")          ├→ 동시 실행!
Task(executor, "login API 함수 만들어")       ─┘
```

에이전트 티어로 비용 최적화:
```
executor-low  (Haiku)  — 단순 단일 파일
executor      (Sonnet) — 표준 기능
executor-high (Opus)   — 복잡한 다중 파일
```

**Phase 4. 검증** — verifier에게 순차 위임

```
Task(verifier) → "빌드 돌려보고 결과 알려줘"
→ 실패 시 Phase 3로 돌아감
→ 성공 시 결과 보고
```

**Phase 5. Validation** — 다중 아키텍트 리뷰



## 순차 vs 병렬

전체 Phase는 **순차**. 병렬은 **같은 Phase 안에서** 독립 작업끼리만.

```
순차: 계획 ──→ 설계 ──→ 구현 ──→ 검증
                         │
                         └─ Phase 내에서만 병렬
                            ├ LoginForm
                            ├ useLogin
                            └ login API
```

> 설계가 끝나야 구현할 수 있고, 구현이 끝나야 검증할 수 있다.
> 하지만 구현 Phase 안에서 LoginForm과 useLogin은 서로 의존하지 않으니 동시에 가능.



## 위임은 실제로 어떻게 동작하나?

```
1. Command(autopilot.md)가 로드됨
2. 메인 Claude가 지침을 읽음
3. 지침에 "architect 에이전트에게 위임하라"고 적혀있음
4. Task(subagent_type="plugin:architect") 호출
5. architect.md의 역할 지시가 적용된 새 Claude 생성
6. 새 Claude가 독립 컨텍스트에서 작업 수행
7. 결과를 메인 Claude에게 반환
8. 메인 Claude가 다음 단계 판단
```

> Command가 대본, Agent가 배우, Task가 배우를 무대에 세우는 행위.



## 오케스트레이션 패턴: 누가 지휘하나?

### 패턴 A: 메인 Claude가 지휘

```
메인 Claude (= 지휘자)
  ├→ Task(설계)
  ├→ Task(구현)
  └→ Task(검증)
```

### 패턴 B: 서브 에이전트가 지휘 (OMC 방식)

```
메인 Claude
  └→ Task(오케스트레이터 에이전트)  ← 지휘자도 서브 에이전트
        ├→ Task(설계)
        ├→ Task(구현)
        └→ Task(검증)
```

### 비교

| | 패턴 A | 패턴 B |
|---|---|---|
| **메인 컨텍스트** | 오케스트레이션 로직으로 소모 | 깨끗 유지 |
| **구조** | 단순 (1단계) | 중첩 (2단계) |
| **적합** | 단순한 작업 | 오케스트레이션 자체가 복잡할 때 |

**비유:**
- 패턴 A = 사장이 직접 직원들한테 업무 지시
- 패턴 B = 사장이 팀장한테 위임, 팀장이 팀원들 관리

**OMC가 패턴 B를 쓰는 이유:**
오케스트레이션 로직(작업 분해 → 의존성 파악 → 병렬/순차 판단 → 실패 재시도 → 결과 종합)이 복잡해서, 메인에서 하면 그것만으로 컨텍스트가 찬다.



## Swarm 패턴 — 또 다른 오케스트레이션

> GYU: 아직 해당 내용 개념 부족 

Autopilot은 오케스트레이터가 순서를 지정한다. Swarm은 다르다.
**N개 에이전트가 공유 작업 목록에서 스스로 작업을 가져간다.**

### OMC 설정: `commands/swarm.md`

```yaml
---
description: N coordinated agents on shared task list with SQLite-based atomic claiming
aliases: [swarm-agents]
---
```

```bash
/oh-my-claudecode:swarm 3:executor "린트 에러 전부 수정"
```

### 동작

```
┌─────────────────────────────────────┐
│       SQLite 공유 작업 목록           │
│  [task1: pending] [task2: pending]  │
│  [task3: pending] [task4: pending]  │
└──────┬──────────┬──────────┬───────┘
       ↓          ↓          ↓
   Agent 1    Agent 2    Agent 3
   claimTask  claimTask  claimTask
   → task1    → task2    → task3
   완료 →     완료 →     완료 →
   claimTask  claimTask
   → task4    (없음, 끝)
```

### 핵심 메커니즘

- **SQLite DB**로 작업 목록 관리 (tasks, heartbeats, swarm_session 테이블)
- **원자적 트랜잭션**으로 동일 작업 중복 수령 방지
- **하트비트**로 죽은 에이전트 감지 → 해당 작업 재할당

### Autopilot vs Swarm

| | Autopilot | Swarm |
|---|---|---|
| **조율 방식** | 오케스트레이터가 순서 지정 | 에이전트가 자율적으로 수령 |
| **적합한 작업** | 의존성 있는 순차 작업 | 독립적인 대량 작업 |
| **비유** | 감독이 촬영 순서 지시 | 뷔페에서 각자 음식 가져감 |
| **예시** | 기능 개발 (설계→구현→검증) | 린트 에러 수정, 대규모 리팩토링 |



## 정리

| 개념 | 핵심 |
|---|---|
| **멀티 에이전트의 본질** | 성능이 아니라 **컨텍스트 분리** — 기억 공간 한계를 우회하는 전략 |
| **오케스트레이터** | 직접 구현 안 함. 계획 + 분배 + 종합만 |
| **순차 vs 병렬** | Phase 간 순차, Phase 내 독립 작업만 병렬 |
| **패턴 A vs B** | 오케스트레이션이 복잡하면 지휘자도 서브 에이전트로 위임 |
| **Autopilot** | 오케스트레이터가 순서 지정 — 의존성 있는 작업 |
| **Swarm** | 에이전트가 자율 수령 — 독립적 대량 작업 |
