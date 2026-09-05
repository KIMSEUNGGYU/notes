---
title: Claude Code 플러그인 — Skill · Agent · Hook
description: 부품 셋이 각각 뭘 하고 왜 같이 있어야 하는가
updated: 2026-06-06
order: 1
outline: deep
---

# Claude Code 플러그인 — Skill · Agent · Hook

> 2026-06-06 발표 자료 중 부품 설명 부분. 이 부품으로 실제로 만든 것은
> [FE 에이전틱 하네스 v2](../fe-harness-v2.draft).

## Skill — 가장 작은 단위

### Skill은 왜 나왔나? + 만드는 법

Claude Code를 쓰다 보면 같은 지시를 매번 반복하게 됩니다.

예를 들어 회의록 정리를 시킬 때마다 이렇게 칩니다:

> "회의 내용 줄게. 참석자 / 안건 / 결정사항 / 액션아이템(담당자·기한)으로 정리해줘"

문제는 두 가지입니다:

- 매번 똑같은 지시를 길게 타이핑해야 함 (귀찮음)
- 매번 조금씩 다르게 적게 됨 → 결과 포맷도 들쑥날쑥 (어제는 액션아이템, 오늘은 담당자를 빠뜨림)

**그래서 Skill입니다.** 이 반복 지시를 파일에 한 번 적어두고, `/이름` 한 단어로 다시 꺼내 쓰는 거죠.

> 자주 하는 요리의 레시피 카드를 만들어두는 것과 같습니다. 매번 재료와 순서를 떠올리는 대신, 카드 한 장 꺼내면 끝.

정리하면 **Skill = AI 명령어 하나.** `/회의록`, `/커밋`처럼 `/이름`으로 부르는 나만의 명령어입니다.

만드는 법은 딱 2가지만 지키면 됩니다:

```
~/.claude/skills/
  └── 인사/              ← ① 폴더 이름 = /명령어 이름
       └── SKILL.md      ← ② 이 파일에 AI에게 시킬 내용을 적는다
```

`SKILL.md` 내용은 그냥 평범한 마크다운입니다:

```markdown
오늘 날짜를 확인하고 이렇게 인사해줘:
"좋은 아침이에요! 오늘은 {날짜} {요일}입니다."
```

이게 전부입니다. **폴더 하나 + 파일 하나 = `/인사` 명령어 완성.** 진짜 5분이면 됩니다.

### 자동 호출 vs 수동 호출

Skill을 부르는 방법은 두 가지입니다.

- **수동** — 내가 `/이름`을 직접 친다
- **자동** — Claude가 상황을 보고 알아서 부른다

자동 호출의 열쇠는 frontmatter(파일 맨 위 `---` 블록)의 **`description`** 필드입니다. Claude가 이 설명을 읽고 "지금 이 Skill을 쓸 때인가?"를 판단해요.

제 fe-plugin의 실제 예제를 보겠습니다.

**① 자동형 — `fe-principles`** (코드 짤 때 알아서 끼어든다)

```yaml
---
name: fe-principles
description: >
  FE 코드 작성 시 rules + patterns를 로드한다. ...
  "컴포넌트 만들어줘", "API 연동", "코드 작성해줘", "구현해줘" 등.
---
```

→ 제가 "로그인 컴포넌트 만들어줘"라고만 해도, Claude가 description의 키워드를 보고 **이 Skill을 알아서 로드**합니다. 제가 `/`를 칠 필요가 없어요.

**② 진입형 — `harness`** (보통 직접 부른다, 인자를 받으니까)

```yaml
---
name: harness
description: "FE 하네스 — ... '하네스 실행', '자동 구현' 등으로 트리거."
argument-hint: <요구사항 또는 파일 경로>
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, ...
---
```

→ `/fe:harness 주문 목록 페이지` 처럼 **인자(`argument-hint`)를 받아** 실행합니다. `allowed-tools`로 쓸 수 있는 도구도 정해뒀고요.

제어 필드 두 개만 알면 됩니다:

| 필드 | 효과 | 비유 |
| --- | --- | --- |
| `disable-model-invocation: true` | 자동 호출 끔 → **사용자만** `/`로 호출 | "묻기 전엔 나서지 마" |
| `user-invocable: false` | 수동 호출 끔 → **Claude만** 자동 호출 | "무대 뒤에서만 일해" |

(아무것도 안 적으면 둘 다 됩니다.)

### 그런데 Command는 어디 갔지?

예전 자료를 보면 `.claude/commands/` 에 파일을 넣는 **Custom Command**가 따로 있었습니다. "Skill이랑 뭐가 다르지?" 헷갈리셨을 텐데, 공식 문서가 정리해줍니다:

> **Custom commands have been merged into skills.**
> `.claude/commands/deploy.md` 와 `.claude/skills/deploy/SKILL.md` 는 **둘 다 똑같은 `/deploy`** 를 만들고 동일하게 작동한다.

즉 **Command는 죽은 게 아니라, Skill이 Command를 흡수한 상위호환**입니다.

```
Command  =  슬래시로 부르는 기능                        (옛 이름)
Skill    =  Command + 자동 호출 + 디렉토리 + 제어 필드   (지금)
```

그래서 제 fe-plugin도 `commands/` 폴더 없이 **전부 `skills/`로** 만들었습니다.

### Skill의 한계 — 그래서 플러그인이 필요하다

Skill은 강력하지만 한 가지 약점이 있습니다. **Skill은 "무엇을 보라"는 기준은 주지만, "어떤 순서로, 누가" 할지는 강제하지 못합니다.**

예를 들어 "코드 리뷰해줘"를 Skill로만 시키면:

```
"코드 리뷰해줘"
  → Skill이 기준은 로드함 (보안, 복잡도, 네이밍…)
  → 근데 어떤 순서로 볼지는 Claude 마음
  → 대화가 길어지면 기준을 잊기도 함
  → 결과 품질이 들쑥날쑥 ⚠️
```

혼자 다 하는 만능 비서에게 "알아서 잘해줘"라고 맡긴 셈이라, 매번 결과가 다릅니다.

**그래서 부품을 더합니다.** 일을 쪼개서 전문가(Agent)에게 맡기고, 실시간으로 교정(Hook)하고, 이걸 하나로 묶는 것 — 그게 바로 **Plugin**입니다.

→ 그래서 부품을 더합니다.

---

## 플러그인 — 부품을 더해 한계를 넘는다

Skill 혼자서는 "기준"은 줘도 "절차와 역할"을 강제하지 못합니다. 이걸 풀려면 부품 두 개가 더 필요합니다 — **Agent**(전문가)와 **Hook**(교정 장치). 그리고 이걸 하나로 묶은 게 Plugin입니다.

### 먼저 알 것 — Agent 도구 (예전엔 Task)

Agent를 이해하려면 도구 하나를 먼저 알아야 합니다. **Agent 도구**(예전엔 `Task`라고 불렀습니다)는 **새 Claude를 하나 더 띄우는 것**입니다. 별도의 대화창이 열린다고 보면 돼요.

```
메인 Claude ──Agent()──→ [새 Claude 인스턴스] ──→ 결과만 반환
                          독립된 기억 공간(컨텍스트)
                          서로 뭘 하는지 모름
```

세 가지 특징:

- **독립 컨텍스트** — 새 Claude는 자기만의 기억 공간을 가짐. 메인의 대화 기록을 안 물려받아서, 메인의 기억 공간을 아낄 수 있음
- **병렬 가능** — 여러 개를 동시에 띄울 수 있음
- **위임** — 메인은 "지시"만 하고, 실제 작업은 새 Claude가 함

이 "새 Claude"에 전문 역할을 부여한 게 바로 Agent입니다.

### Agent — 도구가 제한된 전문가

 한 Claude가 설계도 하고, 코드도 짜고, 자기가 짠 걸 자기가 평가까지 하면 두 가지 문제가 생깁니다:

- **컨텍스트가 꼬임** — 한 대화에 모든 게 쌓여 길어지고, 앞에 한 말을 잊음
- **자기 채점의 함정** — 자기가 짠 코드를 자기가 평가하면 후하게 봄 (자기 선호 편향 - Self Bias ???)(사람도 그렇죠)

**그래서 Agent입니다.** 일을 쪼개서, 각 역할을 **독립된 전문가 Claude**에게 맡깁니다. 코드 짜는 Claude 따로, 평가하는 Claude 따로. 서로의 사고 과정을 모르니 평가가 객관적이죠.

**How — 역할을 "프롬프트"가 아니라 "도구"로 강제한다.**

여기가 핵심입니다. "코드 고치지 마"라고 프롬프트로 부탁하면? 대화가 길어지면 잊고 고쳐버립니다. 그래서 아예 **도구 자체를 빼버립니다.**

제 fe-plugin의 실제 두 에이전트를 보죠.

**generator (코드 짜는 전문가)**

```yaml
---
name: generator
model: opus
disallowedTools: Bash, NotebookEdit
---
```

→ Write/Edit는 있어서 코드는 짜되, **Bash(실행)는 막음.** 직접 테스트 돌리지 말고 코드 구현에만 집중하라는 거죠.

**evaluator (평가하는 전문가)**

```yaml
---
name: evaluator
model: opus
disallowedTools: Write, Edit, Bash, NotebookEdit
---
```

→ **Write, Edit를 막음.** 평가자가 코드를 못 고치니, 고칠 생각 안 하고 **평가에만 집중**할 수밖에 없습니다.

```
프롬프트로 "고치지 마"     →  대화 길어지면 무시 가능 ❌
도구에서 Write/Edit 제거   →  물리적으로 불가능 ✅
```

비유하면, 채점하는 시험 감독관에게 **빨간펜만 주고 연필은 안 주는** 겁니다. 고칠 수단이 없으니 채점만 하죠. (그리고 `model: opus`로 작업 난이도에 맞는 모델도 지정합니다.)

### Hook — 실시간 교정 장치

**아쉬움부터.** AI에게 "TS 파일 고치면 타입체크 꼭 해"라고 프롬프트로 한 번 말해두면? 역시 대화가 길어지면 잊습니다. 한 번 말한 규칙은 시간이 지나면 묻혀요.

**그래서 Hook입니다.** Hook은 **특정 사건이 일어날 때마다 외부 코드(스크립트)를 자동 실행**하는 장치입니다. AI가 아니라 **컴퓨터가** 매번 끼어들어 챙기니까 절대 안 잊죠.

```
프롬프트에 한 번:  "타입체크 해" → 대화 길어지면 잊음 ❌
Hook으로 매번:     파일 고칠 때마다 자동 실행 → 절대 안 잊음 ✅
```

**How — 언제(이벤트) + 무엇을(스크립트).**

Hook은 정해진 "사건(이벤트)"에 걸어둡니다. 자주 쓰는 것들:

| 이벤트                | 언제                         |
| ------------------ | -------------------------- |
| `SessionStart`     | 세션 시작할 때                   |
| `UserPromptSubmit` | 내가 메시지를 보낼 때               |
| `PreToolUse`       | 도구 실행 **직전** (여기서 막을 수 있음) |
| `PostToolUse`      | 도구 실행 **직후**               |
| `Stop`             | Claude가 답변을 끝냈을 때          |

입출력은 단순합니다. 스크립트가 **stdin으로 정보(JSON)를 받고**, 결과를 돌려줍니다.

> 여기서 **"도구(tool)"**는 Claude의 내장 도구를 말합니다 — `Read`(읽기) · `Write`(생성) · `Edit`(수정) · `Bash`(명령 실행) · `Grep`(검색) 등. 맞아요, 그 bash/write/edit이요. "Edit 직전에 끼어들기", "Bash 직후 검사하기" 식으로 겁니다.

```
이벤트 발생 (예: Edit 도구 실행 직후)
  → stdin   { "tool_name": "Edit", "tool_input": { "file_path": "a.ts" } }
  → 스크립트 실행
  → 돌려주는 것 2가지:
     ① exit code            exit 0 = 통과  /  exit 2 = 차단
     ② additionalContext    Claude에게 추가로 넣어줄 한마디
```

**`additionalContext`가 뭔가요?** hook이 Claude에게 말을 거는 통로입니다. 작업을 막는(차단) 게 아니라, **"참고로 이거 해"라고 Claude 귀에 한마디 더 넣는 것**이에요. 그러면 Claude가 그 문장을 읽고 다음 행동에 반영합니다. (바로 아래 예제 2에서 실제 코드로 보겠습니다.)

**실제 예제 — 제가 쓰는 hook입니다.** (`~/.claude/hooks/post-edit.sh`)

```bash
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')

# Edit/Write로 .ts/.tsx 파일을 고치면
if [ "$TOOL_NAME" = "Edit" ] || [ "$TOOL_NAME" = "Write" ]; then
  FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path')
  if [[ "$FILE" == *.ts ]] || [[ "$FILE" == *.tsx ]]; then
    echo "typecheck 권장: pnpm typecheck" >&2   # 알림 띄우기
  fi
fi
```

→ TS 파일을 고칠 때마다 "타입체크 권장" 알림이 자동으로 뜹니다. **PostToolUse** 이벤트에 걸어둔 거죠.

남이 만든 화려한 예시도 있습니다 (oh-my-claudecode 플러그인).

**예제 2 — `additionalContext`로 Claude 행동 교정** (`PreToolUse`)

도구를 쓰기 **직전**에, 도구 종류에 따라 다른 리마인더를 Claude에게 주입합니다:

```js
// 도구 이름별로 다른 한마디를 준비
const messages = {
  Bash: "독립적 작업은 병렬로. 긴 작업은 백그라운드로",
  Edit: "수정 후 반드시 동작을 검증하라",
  Read: "여러 파일을 읽을 때는 병렬로 읽어라",
};

console.log(JSON.stringify({
  hookSpecificOutput: {
    additionalContext: messages[toolName],   // ← 이게 Claude에게 주입됨
  },
}));
```

→ Claude가 `Bash`를 쓰려고 하면, 실행 직전에 *"독립적 작업은 병렬로"*라는 문장이 컨텍스트에 자동으로 끼어듭니다. 바로 이게 `additionalContext`예요.

**예제 3 — 자연어를 명령으로 연결** (`UserPromptSubmit`)

```
"리뷰해줘"
  → UserPromptSubmit hook이 "리뷰" 키워드 감지
  → additionalContext로 "코드리뷰 워크플로우를 실행하라" 주입
  → Claude가 그 지시를 읽고 리뷰 절차를 시작
```

사용자는 자연어로 편하게 말하고, 실행은 정해진 워크플로우로 정확하게 — 이걸 hook이 이어줍니다.

**그런데 — 제 fe-plugin은 정작 hook을 안 씁니다.**

"어? 타입체크 자동으로 하지 않았나?" 싶을 텐데, 위 `post-edit.sh`는 제 **개인 전역 설정**이지 fe-plugin이 아닙니다. 게다가 저건 "권장 알림"만 띄울 뿐, 실제로 타입체크를 *돌리진* 않아요.

솔직히 처음부터 "hook 쓰지 말자"고 결정한 건 아니었습니다. 만들다 보니 안 쓰게 됐고, **돌아보니 이 일엔 hook보다 "절차"가 더 맞았더라고요.** 왜 그런지는 [FE 에이전틱 하네스 v2](../fe-harness-v2.draft) 에서 실제 구조로 볼 수 있습니다.

### 그래서 플러그인이란?

지금까지의 부품을 정리하면:

| 부품        | 한 줄                        | 비유         |
| --------- | -------------------------- | ---------- |
| **Skill** | 자동/수동으로 부르는 기준·명령          | 레시피 카드     |
| **Agent** | ~~도구가 제한된~~  특정 전문가        | 빨간펜만 든 감독관 |
| **Hook**  | 특정 이벤트(도구 실행·세션 시작 등)에 자동 실행되는 외부 스크립트. Claude 동작을 막거나(차단) 메시지를 주입(교정)한다 | 자동 알람      |
| **MCP**   | 외부 서비스 연동 (Slack, Notion…) | 외부 콘센트     |

**Plugin = 이 부품들을 하나로 묶어 배포하는 패키지**입니다. 마켓플레이스에서 설치하면 그 안의 Skill/Agent/Hook이 한 번에 딸려옵니다.

참고로 **모든 부품을 다 써야 하는 건 아닙니다.** 제 fe-plugin은 이렇게 골라 썼어요:

| 부품    | fe-plugin에서                                                           |
| ----- | --------------------------------------------------------------------- |
| Skill | ✅ 4개 (harness · fe-principles · review · reflect)                     |
| Agent | ✅ 5개 (planner-spec · planner-todo · generator · evaluator · reviewer) |
| Hook  | ❌ 안 씀 (절차로 대체)                                                        |
| MCP   | ❌ 안 씀                                                                 |

> ⚠️ 단, 이건 **현재 시점** 기준입니다. fe-harness 는 계속 발전 중이라 구조가 바뀔 수 있습니다.

→ 이 부품들이 실제로 어떻게 맞물려 도는지는 [FE 에이전틱 하네스 v2](../fe-harness-v2.draft) 가 보여줍니다.

---
