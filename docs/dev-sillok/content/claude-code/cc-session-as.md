---
title: 사내 Claude Code 세션 A/S
description: Skills 만들기 → 고급 Skills(frontmatter) → 마켓플레이스 & 플러그인 설치 튜토리얼 (2026-03-07)
head:
  - - meta
    - name: keywords
      content: claude-code, skill, SKILL.md, plugin, marketplace, frontmatter
---

# 사내 Claude Code 세션 A/S

발표일: 2026년 3월 7일

::: tip
이전 세션에서 Skills 단계를 건너뛰고 바로 Plugin으로 갔습니다. 이 문서는 **Skills 만들기 → 고급 Skills → 마켓플레이스 & Plugin 설치** 순서로 차근차근 따라 할 수 있도록 정리한 튜토리얼입니다.
:::

## ~/.claude 폴더란?

`~`는 내 컴퓨터의 홈 폴더를 뜻한다. (예: `/Users/홍길동/`)

`~/.claude`는 **Claude Code가 사용하는 개인 설정 폴더**이다.

```text
~/.claude/                     ← Claude Code의 개인 작업 공간
  ├── CLAUDE.md                ← 모든 프로젝트에 적용되는 규칙 (선택)
  ├── skills/                  ← 내가 만든 개인 Skills (오늘 배울 것!)
  │   └── 인사/
  │       └── SKILL.md
  └── settings.json            ← Claude Code 설정 파일 (자동 생성)
```

- 이 폴더는 Claude Code를 처음 실행하면 자동으로 생성됨
- 여기에 넣은 설정/Skills는 **내 PC의 모든 프로젝트**에서 사용 가능

## 개념 구분

```text
Skills    = .claude/skills/<이름>/SKILL.md 로 만드는 AI 명령어 (핵심!)
Plugin    = Skills + Hooks + Agents + MCP 등을 묶어서 배포하는 패키지
```

::: tip
예전에는 `.claude/commands/`에 파일을 넣는 "Custom Command" 방식이 있었지만, 현재는 **Skills로 통합**되었습니다. 새로 만들 때는 Skills 방식을 사용하세요.
:::

### Skills의 세 가지 범위

| 구분 | 위치 | 실행 방법 | 용도 |
| --- | --- | --- | --- |
| 개인 Skill | `~/.claude/skills/<이름>/SKILL.md` | `/이름` | 모든 프로젝트에서 사용 |
| 프로젝트 Skill | `.claude/skills/<이름>/SKILL.md` | `/이름` | 해당 프로젝트(폴더)에서만 사용 (팀 공유 가능) |
| 플러그인 Skill | `<plugin>/skills/<이름>/SKILL.md` | `/플러그인명:이름` | 플러그인으로 배포/공유 |

**쉽게 말하면:**

- **개인 Skill** (`~/.claude/skills/`) = 내 PC 어디서든 쓸 수 있는 나만의 명령어
- **프로젝트 Skill** (`프로젝트/.claude/skills/`) = 프로젝트 폴더 안에 넣는 명령어. 같은 프로젝트를 쓰는 팀원이 자동으로 사용 가능. Git으로 코드를 공유하듯 `.claude/skills/` 폴더도 함께 커밋하면 팀 전체가 동일한 명령어를 쓸 수 있다
- **플러그인 Skill** = 마켓플레이스로 누구나 설치할 수 있게 배포한 명령어

::: tip
처음에는 **개인 Skill**로 시작하면 충분!
:::

## Part 1 — Skills (나만의 AI 명령어) 만들기

### Skills가 뭔가요?

- **SKILL.md 파일 하나 = AI 명령어 하나**
- `/내명령어` 형태로 실행하는 나만의 명령어
- 복잡한 프롬프트를 매번 입력할 필요 없이, 한 단어로 실행 가능
- 예: `/회의록`, `/일보`, `/메일작성` 등

### Skill을 만들기 위한 조건

Skill이 되려면 딱 2가지만 지키면 된다:

```text
조건 1. skills/ 폴더 아래에 "이름 폴더"를 만든다
조건 2. 그 폴더 안에 SKILL.md 파일을 넣는다
```

이게 전부다! 이 구조만 맞으면 Claude Code가 자동으로 `/명령어`로 인식한다.

```text
~/.claude/skills/          ← 여기 아래에
  └── 인사/                 ← 조건 1: 폴더를 만들고 (폴더명 = /명령어 이름)
      └── SKILL.md          ← 조건 2: 이 파일 안에 AI에게 시킬 내용을 적는다
```

**정리:**

- **폴더명** = `/명령어` 이름 (예: `인사/` → `/인사`)
- **SKILL.md** = AI에게 시킬 내용 (마크다운으로 자유롭게 작성)
- 그 외에는 아무것도 필요 없음!

::: tip
실습하시다가 잘 모르겠으면, 해당 섹션 영역을 복사해서 Claude Code에게 붙여넣고 "이 부분 설명해주고 수행해줘"라고 해도 좋습니다!
:::

### 실습 A — 첫 번째 Skill 만들기 (2분)

> 목표: `/인사` 라고 치면 AI가 오늘 날짜와 함께 인사해주는 명령어 만들기

**Step 1. 폴더 만들기**

```bash
# 터미널에서 아래 명령어 실행
mkdir -p ~/.claude/skills/인사
```

**Step 2. SKILL.md 파일 만들기**

아래 내용을 `~/.claude/skills/인사/SKILL.md` 파일로 저장한다.

```markdown
오늘 날짜를 확인하고, 아래 형식으로 인사해줘:

"좋은 아침이에요! 오늘은 {날짜} {요일}입니다.
오늘도 화이팅하세요!"
```

파일을 만드는 방법:

1. Claude Code 안에서 직접 요청: `"~/.claude/skills/인사/SKILL.md 파일을 만들어줘, 내용은..."`
2. 또는 메모장/텍스트 편집기로 직접 작성

**Step 3. 잘 만들어졌는지 확인하기**

```bash
# Claude Code에서 아래 입력:
/skills
```

`/skills`를 치면 현재 사용 가능한 모든 Skill 목록이 나온다. 방금 만든 `/인사`가 목록에 보이면 성공!

**Step 4. 실행하기**

```bash
# Claude Code에서 아래 입력:
/인사
```

::: tip
끝! 이게 Skills의 전부입니다. **폴더 하나 + SKILL.md 파일 하나 = AI 명령어가 생긴다.**
:::

### 실습 B — $ARGUMENTS 활용하기 (5분)

> 목표: `/슬랙요약` 이라고 치면 슬랙 메시지를 요약해주는 명령어 만들기

**폴더 & 파일 만들기**

```bash
mkdir -p ~/.claude/skills/슬랙요약
```

**파일: `~/.claude/skills/슬랙요약/SKILL.md`**

```markdown
아래 슬랙 메시지들을 분석해서 정리해줘:

$ARGUMENTS

## 정리 형식
1. 핵심 내용 (3줄 이내)
2. 나에게 해당하는 액션 아이템
3. 답장이 필요한 메시지
```

`$ARGUMENTS`는 특별한 변수이다. `/슬랙요약` 뒤에 입력하는 텍스트가 여기에 들어간다.

**사용 방법**

```text
/슬랙요약 [슬랙에서 복사한 메시지들을 여기에 붙여넣기]
```

즉, `$ARGUMENTS`에 붙여넣은 메시지가 할당된다.

### 실습 C — 나만의 업무 Skill 만들기 (10분)

> 이전 세션에서 작성한 "출근 후 하는 행동" 목록을 꺼내세요! 그 중 반복적인 작업 하나를 골라서 Skill로 만들어봅시다.

**예시 아이디어**

| 업무 | Skill 이름 | 설명 |
| --- | --- | --- |
| 회의록 정리 | `/회의록` | 회의 내용 붙여넣으면 → 요약 + 액션아이템 정리 |
| 메일 작성 | `/메일` | 키워드만 넣으면 → 비즈니스 메일 초안 작성 |
| 일일 보고 | `/일보` | 오늘 한 일 키워드 → 보고서 형식으로 변환 |

**직접 만들어보기**

1. 어떤 업무를 자동화할지 정하기
2. Claude Code에게 요청하기:

```text
나는 매일 [업무 내용]을 하는데,
이걸 /명령어 하나로 실행할 수 있는 Skill을 만들어줘.
~/.claude/skills/ 폴더에 만들어줘.
```

::: tip
Claude Code가 알아서 적절한 Skill 폴더와 SKILL.md를 만들어준다! 만들어진 파일이 마음에 안 들면 "좀 더 ~하게 바꿔줘"라고 수정 요청하면 된다.
:::

### Skills 정리

```text
~/.claude/skills/              ← 여기에 폴더를 만들면
  ├── 인사/
  │   └── SKILL.md             ← /인사 로 실행 가능
  ├── 슬랙요약/
  │   └── SKILL.md             ← /슬랙요약 으로 실행 가능
  ├── 회의록/
  │   └── SKILL.md             ← /회의록 으로 실행 가능
  └── 원하는이름/
      └── SKILL.md             ← /원하는이름 으로 실행 가능
```

::: tip
팀 프로젝트 폴더에 `.claude/skills/`를 만들면 팀원 모두가 같은 명령어를 쓸 수 있다!
:::

## Part 2 — 고급 Skills: frontmatter 활용하기

### frontmatter란?

SKILL.md 파일 맨 위에 `---`로 감싼 설정 블록이다. 이걸 추가하면 Skill이 더 똑똑하게 동작한다.

**기본 Skill (frontmatter 없음)**

```markdown
회의 내용을 요약해줘

$ARGUMENTS
```

**고급 Skill (frontmatter 있음)**

```markdown
---
name: 회의록정리
description: 회의 내용을 구조화된 형식으로 요약합니다. "회의록 정리해줘", "미팅 내용 요약" 등의 요청에 사용하세요.
---

회의 내용을 아래 형식으로 정리해줘:

$ARGUMENTS

## 출력 형식
### 참석자
### 안건
### 논의 내용
### 결정 사항
### 액션 아이템 (담당자 / 기한)
```

### frontmatter 필드

::: tip
사실 frontmatter는 전부 선택사항이다. 없어도 Skill은 잘 동작한다! 처음에는 `description`만 알면 충분하다.
:::

**이것만 알면 됨**

| 필드 | 역할 | 예시 |
| --- | --- | --- |
| `description` | AI가 "이 Skill을 써야 하나?" 판단하는 기준 | `회의 내용을 구조화된 형식으로 요약` |

**`description`이 핵심!**

- 잘 쓰면 → AI가 관련 상황에서 자동으로 이 Skill을 추천/실행
- 없으면 → 사용자가 직접 `/명령어`로 호출해야만 실행됨
- 나머지 필드는 없어도 됨. 익숙해진 후 필요할 때 추가하면 된다

**더 알고 싶다면 (선택)**

| 필드 | 역할 | 예시 |
| --- | --- | --- |
| `name` | Skill의 표시 이름 (생략 시 폴더명 사용) | `회의록정리` |
| `argument-hint` | 사용자에게 보여주는 인자 힌트 | `[회의 내용]` |
| `disable-model-invocation` | `true`면 사용자가 직접 `/명령어`로만 실행 가능 | `true` |
| `user-invocable` | `false`면 AI만 호출 가능 (사용자 실행 불가) | `false` |
| `allowed-tools` | 이 Skill에서 사용할 수 있는 도구 제한 | `Read, Grep` |

## Part 3 — 마켓플레이스 & 플러그인 설치 튜토리얼

### 마켓플레이스란?

- 다른 사람이 만든 Plugin(Skills + 자동화 기능 묶음)을 **앱스토어처럼 설치**할 수 있는 곳
- 직접 만들 필요 없이, 이미 잘 만들어진 도구를 바로 사용 가능

### Step 1. 마켓플레이스 추가하기

> 마켓플레이스는 "앱스토어를 등록하는 것"이다. 한 번만 추가하면 그 안의 모든 플러그인을 설치할 수 있다.

```bash
# Claude Code 실행 후 아래 입력:
/plugin marketplace add team-attention/plugins-for-claude-natives
```

- 이렇게 하면 team-attention 마켓플레이스가 등록된다.
- 공식 마켓플레이스(claude-plugins-official)는 기본으로 등록되어 있다.

### 조작법 (터미널 메뉴 UI)

`/plugin` 등을 실행하면 선택 메뉴가 뜬다. 아래 키로 조작:

| 키 | 동작 |
| --- | --- |
| `↑` `↓` (화살표) | 메뉴 항목 이동 |
| `Enter` | 선택/확인 |
| `Space` | 체크박스 토글 (활성화/비활성화) |
| `Esc` | 뒤로 가기 / 취소 |

### Step 2. `/plugin` 메뉴 흐름 따라가기

`/plugin`을 입력하면 아래와 같은 메뉴가 나온다.

```text
/plugin 입력 → 메인 메뉴가 뜸:

  ┌─────────────────────────────────┐
  │  Manage installed plugins       │  ← 설치된 플러그인 관리
  │  Manage marketplaces            │  ← 마켓플레이스 관리 (여기서 Browse)
  │  Install a plugin               │  ← 플러그인 직접 설치
  └─────────────────────────────────┘
  (↑↓로 이동, Enter로 선택)
```

**마켓플레이스에서 둘러보기**

```text
"Manage marketplaces" 선택 (Enter)
  → 등록된 마켓플레이스 목록이 나옴
    → 마켓플레이스 하나 선택 (Enter)
      → "Browse plugins" 선택 (Enter)
        → 설치 가능한 플러그인 목록이 나옴!
          → 원하는 플러그인 선택 → Install
```

### Step 3. 플러그인 설치하기

```bash
# 방법 1: 명령어로 직접 설치 (가장 빠름!)
/plugin install clarify

# 방법 2: 메뉴에서 설치
# /plugin → "Install a plugin" 선택 → 플러그인 이름 입력

# 방법 3: Browse에서 설치
# /plugin → "Manage marketplaces" → 마켓플레이스 선택 → "Browse plugins" → 플러그인 선택 → Install
```

::: tip
가장 쉬운 방법은 **방법 1**! 설치할 플러그인 이름을 알면 바로 설치 가능.
:::

### Step 4. 설치 확인 & 활성화 관리

`/plugin` 메뉴에서 확인:

```text
/plugin 입력 → "Manage installed plugins" 선택 (Enter)

  ┌─────────────────────────────────┐
  │  ✓ clarify                      │  ← ✓ 표시 = 활성화된 상태
  │  ✓ plugin-dev                   │
  │    superpowers                  │  ← 표시 없음 = 비활성화 상태
  └─────────────────────────────────┘
  (↑↓로 이동, Space로 활성화/비활성화 토글)
```

- **설치만 하면 자동으로 활성화**된다 (따로 켤 필요 없음)
- 나중에 끄고 싶으면: `/plugin` → "Manage installed plugins" → 해당 플러그인에서 `Space`
- `Space`를 누를 때마다 ✓가 붙었다 빠졌다 함 = 활성화/비활성화 토글

### 설치된 플러그인의 Skills 확인하기

```bash
# 설치한 플러그인이 어떤 /명령어를 제공하는지 확인:
/skills
```

`/skills`를 치면 내가 만든 개인 Skills + 설치된 플러그인의 Skills가 전부 나온다. 예: clarify를 설치했으면 `/clarify` 같은 명령어가 목록에 보임.

::: tip
질문이나 막히는 부분이 있으면 슬랙으로 편하게 물어보세요!
:::
