---
title: Claude Code 플러그인 — 4가지 컴포넌트
description: Claude Code의 확장 포인트 4가지 — Hooks, Custom Slash Commands, MCP Servers, CLAUDE.md
outline: deep
---

# Claude Code 플러그인 — 4가지 컴포넌트

## 플러그인 이란?

Claude Code에 기능을 추가하는 설정 묶음. 4개 컴포넌트로 구성.

```
플러그인
 ├─ Skill     참고서 — 자동으로 기준/지식 로드
 ├─ Command   레시피 — 실행 절차 강제
 ├─ Agent     직원   — 전문가에게 작업 위임
 └─ Hook      알람   — 실시간 동작 교정
```


## 1. Skill — 자동 로드되는 참고서

### 개념

- Claude가 **알아서 감지하고 자동 로드**하는 지식
- `description` 필드가 매칭 키 역할
- 본문에 담는 것 = **기준 (What)**

### OMC 실제 설정: `skills/code-review/SKILL.md`

```yaml
---
name: code-review
description: Run a comprehensive code review
---
```

```markdown
# Code Review Skill

## When to Use
- User requests "review this code", "code review"
- Before merging a pull request

## Review Categories
- Security — XSS, SQL injection, 하드코딩된 시크릿
- Code Quality — 함수 크기, 복잡도, 네스팅

## Severity Rating
- CRITICAL / HIGH / MEDIUM / LOW
```

### 동작

```
사용자: "코드 리뷰해줘"
  → "code review" 매칭
  → 스킬 본문이 Claude 컨텍스트에 주입
  → Claude가 이 기준을 참고해서 리뷰
```

> Skill은 "뭘 봐야 하는지"만 알려줌. "어떤 순서로 할지"는 Claude 자유 → 품질 불안정할 수 있음


## 2. Command — 절차를 강제하는 레시피

### 개념

- 사용자가 `/플러그인명:커맨드명`으로 **직접 호출**
- 본문에 담는 것 = **절차 (How)**
- 메인 Claude에게 주는 대본

### OMC 실제 설정: `commands/autopilot.md`

```yaml
---
description: Fully autonomous workflow from idea to working code
---
```

```markdown
# Autopilot Command

**YOU ARE AN ORCHESTRATOR, NOT AN IMPLEMENTER**
- 파일 읽기, 진행 추적, 상태 전달만
- 모든 코드 변경은 전문 에이전트로 위임

## Phase 1. Expansion
아이디어를 상세 스펙으로 확장

## Phase 2. Planning
구현 전략 개발

## Phase 3. Execution
병렬 에이전트로 코드 빌드
- executor-low  (Haiku)  — 단순 단일 파일
- executor      (Sonnet) — 표준 기능
- executor-high (Opus)   — 복잡한 다중 파일

## Phase 4. QA
종합 테스트 및 검증

## Phase 5. Validation
다중 아키텍트 리뷰
```

### 동작

```
사용자: "/oh-my-claudecode:autopilot 로그인 페이지 만들어"
  → Command 로드 (절차)
  → 관련 Skill도 자동 로드 (기준) ← Command 실행 중에도 Skill은 자동 동작
  → Claude가 절차 + 기준을 합쳐서 실행
  → Phase 1 → 2 → 3 → 4 → 5 순서 강제
```

> Command를 호출하면 Skill도 함께 로드된다. 컨텍스트에 "code review", "architecture" 등의 키워드가 포함되면 해당 Skill이 자동으로 기준을 주입한다.
> → **Command(절차) + Skill(기준)이 항상 같이 동작**하는 구조.


## Skill + Command = 왜 둘 다 필요한가

같은 "코드 리뷰"를 시키는 3가지 시나리오:

**시나리오 A: Skill만 동작 (자연어)**

```
사용자: "코드 리뷰해줘"
  → Skill 자동 로드 (기준만 주입)
  → Claude가 알아서 리뷰
  → 어떤 순서로 할지는 Claude 마음 → 품질 들쑥날쑥 ⚠️
```

**시나리오 B: Command 직접 호출**

```
사용자: "/oh-my-claudecode:code-review"
  → Command 로드 (절차 주입)
  → Skill도 자동 로드 (기준 주입) ← 컨텍스트에 "code review"가 있으니까
  → 절차 + 기준이 합쳐져서 실행 → 품질 일정 ✅
```

**시나리오 C: Hook이 자연어 → Command 연결 (OMC 방식)**

```
사용자: "리뷰해줘"
  → Hook이 "리뷰" 키워드 감지
  → Command 워크플로우 자동 트리거
  → 시나리오 B와 동일하게 실행 → 품질 일정 ✅
```

**정리:**

```
Skill만     → 기준 O 절차 X → 품질 들쑥날쑥
Command만   → 절차 O 기준 X → 판단 근거 없음
둘 다       → 기준 + 절차   → 일관된 품질 ✅
Hook + 둘 다 → 자연어로도 워크플로우 트리거 ✅✅
```

| | Skill | Command |
|---|---|---|
| 담는 것 | "코드리뷰는 이 6가지를 봐" (기준) | "1단계: diff, 2단계: 에이전트 위임" (절차) |
| 비유 | 참고서 | 레시피 |
| 트리거 | 자동 감지 (+ `/`호출) | `/`호출만 (Hook으로 자동화 가능) |


## 먼저 알 것: Task 도구

Agent를 이해하려면 Task 도구를 먼저 알아야 한다.

**Task = 새 Claude를 하나 더 띄우는 것.** 별도 대화창이 열린다고 생각하면 된다.

```
메인 Claude ──Task()──→ [새 Claude 인스턴스] ──→ 결과만 반환
                         독립된 기억 공간(컨텍스트)
                         서로 뭐 하는지 모름
```

- 여러 Task를 **동시에** 띄울 수 있음 (병렬 실행)
- 각 인스턴스는 독립 컨텍스트 → 메인의 기억 공간을 아낄 수 있음
- 내장 에이전트(`"Explore"`) 또는 플러그인 에이전트(`"plugin:architect"`) 지정 가능

```
// 내장 에이전트
Task(subagent_type = "Explore", prompt = "로그인 관련 파일 찾아줘")

// 플러그인 에이전트
Task(subagent_type = "plugin:fe-workflow:architect", prompt = "로그인 페이지 설계해줘")
```


## 3. Agent — 역할이 제한된 전문가

### 개념

- Task()로 띄운 새 Claude에 **전문 역할을 부여**
- `disallowedTools`로 할 수 있는 행동을 물리적으로 제한
- `model`로 작업 난이도에 맞는 모델 지정

### OMC 실제 설정: `agents/architect.md`

```yaml
---
name: architect
description: Strategic Architecture Advisor (READ-ONLY)
model: opus
disallowedTools: Write, Edit
---
```

```markdown
# Architect Agent

읽기 전용 컨설턴트. 코드 분석, 진단, 권장사항 제공.

## 4단계 프로토콜
1. 컨텍스트 수집 — 코드베이스 탐색
2. 심층 분석 — 패턴, 의존성, 문제점 파악
3. 권장사항 — 구체적 개선안 제시
4. 검증 — 실현 가능성 확인
```

### OMC 실제 설정: `agents/executor.md`

```yaml
---
name: executor
description: Focused implementation task executor
model: sonnet
disallowedTools: Task
---
```

```markdown
# Executor Agent

직접 실행. 위임 없음.
- Todo 중심 워크플로우
- 완료 전 검증 필수 (빌드/테스트)
```

### 왜 프롬프트가 아니라 도구를 차단하나?

```
프롬프트: "코드 수정하지 마" → 대화 길어지면 무시 가능 ❌
도구 차단: Write, Edit 제거  → 물리적으로 불가능 ✅
```

OMC는 이 원칙으로 각 Agent의 역할 경계를 설계한다:

| Agent | model | 차단 도구 | 효과 |
|---|---|---|---|
| architect | opus | Write, Edit | 코드를 **못 고치니까** 분석에만 집중 |
| executor | sonnet | Task | 위임을 **못 하니까** 직접 구현할 수밖에 없음 |
| verifier | — | Write, Edit | 코드를 **못 고치니까** 검증에만 집중 |

**executor의 Task 차단이 특히 중요한 이유:**

```
Task 가능하면:  executor → Task(다른 executor) → Task(또 다른 executor) → ...
               아무도 구현 안 하고 위임만 돌림 ❌

Task 차단하면:  executor → 직접 코드 작성 → 완료
               위임할 수단이 없으니 직접 할 수밖에 없음 ✅
```


## 4. Hook — 실시간 교정 장치

### 개념

- 이벤트 발생 시 **외부 스크립트(Node.js)가 자동 실행**
- Claude 동작에 메시지를 주입하거나, 실행을 차단할 수 있음
- Claude가 아닌 **외부 코드**가 실행됨

### OMC 실제 설정: `hooks/hooks.json`

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/keyword-detector.mjs\"",
        "timeout": 5
      }]
    }],
    "PreToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/pre-tool-enforcer.mjs\"",
        "timeout": 3
      }]
    }],
    "Stop": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/persistent-mode.cjs\"",
        "timeout": 5
      }]
    }]
  }
}
```

### OMC 실제 설정: `scripts/pre-tool-enforcer.mjs` (핵심 발췌)

```javascript
const input = await readStdin();
const toolName = extractJsonField(input, 'toolName');

const messages = {
  Task: "병렬 실행 가능한 작업은 동시에 실행하라",
  Bash: "독립적 작업은 병렬로. 긴 작업은 백그라운드로",
  Edit: "수정 후 반드시 동작 검증하라",
  Read: "여러 파일을 읽을 때는 병렬로 읽어라",
};

console.log(JSON.stringify({
  continue: true,
  hookSpecificOutput: {
    additionalContext: messages[toolName]
  }
}));
```

### 입출력 구조

```
이벤트 발생
  ↓
stdin  → { toolName: "Task", toolInput: {...} }
  ↓
스크립트 실행
  ↓
stdout → { continue: true,  ← true=진행, false=차단
           hookSpecificOutput: {
             additionalContext: "병렬로 해"  ← Claude에 주입할 메시지
           }}
```

### 사용 가능한 이벤트

| 이벤트 | 시점 |
|---|---|
| UserPromptSubmit | 사용자 메시지 전송 |
| SessionStart | 세션 시작 |
| PreToolUse | 도구 실행 직전 |
| PostToolUse | 도구 실행 직후 |
| SubagentStart/Stop | 서브 에이전트 시작/종료 |
| PreCompact | 컨텍스트 압축 직전 |
| Stop | Claude 응답 완료 |
| SessionEnd | 세션 종료 |

### OMC가 Hook을 쓰는 이유

```
프롬프트에 한 번:  "병렬로 해" → 대화 길어지면 잊음 ❌
Hook으로 매번:     도구 쓸 때마다 주입 → 절대 안 잊음 ✅
```

**자연어 → Command 연결도 Hook이 한다:**

```
"리뷰해줘"
  → [Hook: keyword-detector] "리뷰" 감지
  → Claude에게 "code-review Command를 실행해" 주입
  → Command 워크플로우 동작
```

→ 사용자는 자연어로 편하게, 실행은 Command 절차로 정확하게.

## 전체 흐름

```
"리뷰해줘"
  │
  ↓
[Hook]    키워드 감지 → Command 연결
  ↓
[Command] 절차 로드 + [Skill] 기준 로드
  ↓
메인 Claude (지휘자)
  ↓ Task()
[Hook]    리마인더 주입
  ↓
[Agent]   독립 실행
  ↓
[Hook]    결과 검증
  ↓
메인 Claude → 다음 판단
```

## 정리

| 컴포넌트 | 한 줄 | OMC에서 배울 포인트 |
|---|---|---|
| **Skill** | 자동 로드되는 기준 | description으로 자동 매칭 |
| **Command** | 절차를 강제하는 대본 | Phase 나열 + 에이전트 위임 지시 |
| **Agent** | 도구가 제한된 전문가 | disallowedTools로 역할 강제, 모델 티어로 비용 최적화 |
| **Hook** | 매번 끼어드는 교정 장치 | 리마인더 반복 주입, 자연어→Command 연결 |
