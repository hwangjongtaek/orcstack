# M0-1 derive 잔존 측정

- 측정일: 2026-11-05
- 대상: `cursor/plugins` `pstack/` @ `c742dd6` (2026-11-05 기준 upstream `main`도 pstack은 이 커밋이 최신)
- 방법: exclude → rename → 중립 치환을 적용한 뒤 denylist 토큰이 남은 줄을 센다. 스파이크 코드는 머지하지 않는다. 규칙 초안은 아래 표에 남겨 M1-2·M1-4의 입력으로 쓴다.

## 결론

- 기계 처리로 **565곳**이 해결된다(rename 417, 중립 치환 148).
- 남는 것은 **102줄**이다. 그중 54줄은 어차피 통째로 다시 쓰는 파일(README, guide, `orc-help`, `setup-orcstack`)에 있고, 22줄은 `watch-pr` 스크립트 코드다.
- 그 밖의 skill 본문에서 손볼 곳은 **17개 파일, 35줄**이다. M2-2·M2-3 범위가 계획보다 작다.
- 계획에 없던 Cursor 의존 세 가지를 찾았다: 내부 forge **Origin**, 다른 Cursor 플러그인 **`cursor-team-kit`** 의존, Cursor 내장 skill(`create-skill`, `babysit`, `/loop`) 참조.

## 숫자

| 단계 | 수 |
|---|---|
| upstream 파일 | 573 |
| exclude | 27 (`automations/` 12, `docs/harness`·guide 이미지 7, 제외 skill 5, `assets`, `.cursor-plugin`, `bugbot-triage.md`) |
| 남은 파일 / 그중 텍스트 | 546 / 293 |
| rename | 417 (`poteto-mode` 246, `pstack` 90, `setup-pstack` 36, `poteto-agent` 15, `poteto-help` 13, `pstack-models.mdc` 12, 제목형 `Poteto mode/help/subagent` 3, `poteto-mode-tools` 2) |
| 중립 치환 | 148 (아래 표) |
| denylist 잔존 | 102줄 (111건) |

### 잔존 102줄의 위치

| 위치 | 줄 | 처리 |
|---|---|---|
| 통째로 다시 쓰는 파일: `README.md`, `docs/guide/*`, `orc-help`, `setup-orcstack` | 54 | M2-3 재작성. 개별 수정하지 않는다 |
| `skills/orc-mode/scripts/watch-pr/*.ts` (Bugbot 22) | 22 | 아래 "결정 필요" 1 |
| 그 밖의 skill·agent 본문 | 35 (17개 파일) | 아래 체크리스트 |

## 기계 처리 규칙 초안

### rename (`sync/rename.json`)

순서대로, 단어 경계로 적용한다. 출처 문맥(`github.com/cursor/plugins`, `github.com/poteto`, `Lauren Tan`, `@poteto`)이 있는 줄은 건너뛴다.

`pstack-models.mdc`→`orcstack-models.md`, `poteto-mode-tools`→`orc-mode-tools`, `poteto-mode`→`orc-mode`, `poteto-help`→`orc-help`, `poteto-agent`→`orc-agent`, `setup-pstack`→`setup-orcstack`, `pstack`→`orcstack`, `Poteto (mode|help|subagent)`→`Dama $1`. 디렉터리 이름도 같은 규칙으로 바꾼다.

### 중립 치환 (`sync/substitutions.json`)

| 중립 토큰 | upstream 표현 | 건수 |
|---|---|---|
| `{{spawn-subagent}}` | `` `Task` ``, `Task tool/subagent/call` | 21 |
| `{{model-default}}` | 백틱 안의 모델 slug(`grok-4.7-xhigh-fast`, `claude-opus-5-5-xhigh` 등) | 33 |
| `{{model-inherit}}` | `inherit-parent` | 20 |
| `{{skill-dir}}` | `.cursor/skills/`, `~/.cursor/skills/` | 15 |
| `{{todo}}` | `todo list`, `todolist` | 14 |
| `{{transcripts}}` / `{{transcripts-root}}` | `agent-transcripts`, `~/.cursor/projects/*/` | 10 / 4 |
| `{{model-sheet}}` | `~/.cursor/rules/orcstack-models.md` (rename 후) | 8 |
| `{{subagent-general}}` | `generalPurpose` | 8 |
| `{{plugin-dir}}` | `~/.cursor/plugins/` | 4 |
| `{{ask-user}}` | `AskQuestion` | 4 |
| `{{background}}` | `run_in_background: true` | 3 |
| `{{project-rule}}` | `.cursor/rules/…`, `always-applied rule` | 3 |
| `{{spawn-readonly}}` | `readonly: true` | 1 |

보완할 것:
- 백틱 없는 `Task spawn`(`agents/orc-agent.md:9`)이 빠졌다. 패턴에 추가한다.
- `{{model-default}}`는 D4(세션 모델 상속)에 따라 Claude Code에서는 "세션 모델"로 렌더링한다. 모델 slug가 표 형태로 나열된 곳(`reflect` 역할 표, `setup-orcstack`)은 치환이 아니라 재작성 대상이다.

### denylist 보완

- `pstack`은 단어 경계로 검사한다. 그러지 않으면 `upstack`(watch-pr 코드 13건)이 오탐된다.
- `Automations`는 `Automations?`, `automations/benny`, `automation pack`, `benny`로 좁힌다. `browser automation` 같은 일반 표현은 잡지 않는다.
- 추가: `Origin`/`` `origin `` (Cursor 내부 forge, 8개 파일 20줄), `cursor-team-kit`, `create-skill`·`babysit` 내장 skill 언급, `Application Support/Cursor`.

## 체크리스트: 그 밖의 skill 본문 (M2-2·M2-3)

| 파일 | 내용 | 처리 |
|---|---|---|
| `orc-mode/SKILL.md:3` | description "poteto's agent style … Use for poteto" | 오크 화자로 재작성 |
| `orc-mode/SKILL.md:27`, `playbooks/authoring-a-skill.md:5`, `reflect/SKILL.md:56` | Cursor 내장 `create-skill` skill | 하네스의 skill 작성 경로로. Claude Code는 내장 skill-creator 계열, 없으면 `authoring-a-skill` playbook 본문으로 |
| `orc-mode/SKILL.md:33` | Cursor 내장 babysit skill과 충돌 경고, "bugbot comments" 예시 | 경고 문장 삭제, 예시는 "review bot comments" |
| `orc-mode/SKILL.md:35`, `playbooks/babysit.md:7,20,21`, `multi-phase-plan.md:60,129`, `reflect/references/synthesizer.md:27` | Bugbot triage | 일반 리뷰 봇·보안 리뷰어 triage로. `bugbot-triage.md`는 제외했으므로 회의적 triage 기준을 `babysit.md`에 짧게 흡수 |
| `orc-mode/SKILL.md:146`, `playbooks/session-pickup.md:5` | cloud-agent URL에서 이어받기 | 삭제. transcript와 push된 브랜치만 |
| `orc-mode/SKILL.md:147` | "Cursor restart" | "하네스 재시작" |
| `playbooks/autopilot-full.md:8`, `shipping.md:5`, `swarm/SKILL.md:27,29`, `orchestrate.md:10` | 소유자·검증자가 Cursor cloud agent, `environment: "cloud"`, `cloud_base_branch` | `{{isolated-worktree}}` subagent. 기준 브랜치는 worktree 생성 시 지정 |
| `shipping.md:5`, `orchestrate.md:10` | `cursor-team-kit`의 `control-ui`·`control-cli` | 아래 "결정 필요" 2 |
| `playbooks/autonomous-run.md:6`, `bug-fix.md:8` | Cursor `/loop` | `{{loop}}` 능력. 없는 하네스는 외부 스케줄러 안내 |
| `opening-a-pr.md:24–30`, `multi-phase-plan.md:56–57`, `shipping.md:5–9`, `babysit.md`, `autopilot-full.md`, `SKILL.md:141`, `worktree-audit.sh` | 내장 PR 도구와 Origin forge 분기 | 삭제. forge는 `gh` 하나 |
| `playbooks/worktree-cleanup.md:3,8` | `.cursor/worktrees/`, `~/Library/Application Support/Cursor` | 하네스별 worktree 경로(`{{worktree-root}}`)와 캐시 경로. 능력 표에 추가 |
| `why/SKILL.md:35` | "MCPs from the Cursor environment" | "이 세션에서 쓸 수 있는 MCP" |
| `reflect/references/synthesizer.md:28` | `gpt-4` → `gpt-4o` 예시 | 오탐. 예시 문장이라 그대로 둔다(allowlist에 줄 단위 등록) |
| `agents/orc-agent.md:7,9` | "Poteto subagent", `Task spawn` | rename·치환 규칙 보완으로 해결 |

## 결정 필요

1. **`watch-pr` 코드의 Bugbot 처리 (22줄)**: 이 스크립트는 PR 리뷰 코멘트 작성자가 Bugbot인지 구분해 우선순위를 정한다. Bugbot이 없는 저장소에서는 그 분기가 그냥 돌지 않는다.
   - 권장: **코드는 fork하지 않는다.** denylist를 skill 본문(`.md`)에만 적용하고 `scripts/`는 제외한다. 코드를 고치면 upstream이 `watch-pr`을 바꿀 때마다 충돌한다.
2. **`cursor-team-kit` 의존**: `shipping`·`orchestrate`가 `control-ui`·`control-cli` skill로 제품 표면을 확인한다. orcstack에는 없는 skill이다.
   - 권장: 표면 확인을 `{{surface-check}}` 능력으로 추상화하고, 기본값은 "저장소의 Feature Map과 verify skill(`create-verification-skill`로 만든 것)"로 둔다. Tier 3 독립 검증과 같은 자리다.

## 계획 반영

- boilerplate-plan 7절: Cursor 전용 기능 표에 Origin forge, `cursor-team-kit`, Cursor 내장 skill(`create-skill`, `babysit`, `/loop`)을 추가한다. 중립 능력 표에 `worktree-root`, `surface-check`, `model-default`를 추가한다.
- boilerplate-plan 1절 리스크 2의 숫자(Cursor 44개 파일 148회 등)는 원시 grep 수다. 실제로 손볼 양은 이 문서의 숫자를 쓴다.
- work-plan 4절 리스크 "재작성 분량 200줄 초과"는 해당 없음. 통째 재작성 파일을 빼면 35줄이다.
