# M0-6 혼용 프레임워크 감지 신호

- 측정일: 2026-11-05
- 대상: Superpowers `obra/superpowers` v7.0.2 (`22f0b46`), Spec Kit `github/spec-kit` 1.3.1.dev0 (`ec9a6f3`), `sdd-helper` 1.1.1 (`datamaker-kr/synapse-claude-marketplace`)
- 방법:
  - Spec Kit은 `specify init`을 하네스 5종(claude, codex, opencode, omp, pi)에 실제로 실행해 생성 파일을 확인했다.
  - Superpowers와 `sdd-helper`는 skill·hook·매니페스트 원문에서 산출물 경로와 부트스트랩 방식을 읽었다.
  - 작업 계획의 "한 사이클씩 실행"은 하지 않았다. 산출물 경로가 skill 본문에 고정 문자열로 적혀 있어 LLM 세션 없이 확정할 수 있었다. 실제 세션 흔적은 M3-1 fixture 테스트에서 확인한다.

## 결론

- 세 프레임워크 모두 **파일 신호만으로 감지된다.** 저장소에 남는 경로가 서로 겹치지 않는다. 다만 `specs/`는 SDD와 Spec Kit이 함께 쓰므로 안쪽 파일 이름으로 구분한다.
- 설치 방식이 다르다. Spec Kit은 **저장소 안**에 설치되고, Superpowers와 `sdd-helper`는 **하네스 플러그인**이다. 그래서 `adopt-orcstack`은 저장소 파일과 하네스 설정을 둘 다 봐야 한다.
- 런타임 신호가 있는 것은 Superpowers뿐이다. 세션 시작 때 고정 표지 문자열을 컨텍스트에 주입하므로, `orc-mode` 게이트가 이 문자열로 "다른 라우터가 살아 있음"을 판정할 수 있다.
- orcstack 내부 플러그인 두 개가 SDD 문서에 기대고 있다(`tmux-orchestrator`, `platform-dev-team-common`의 `tdd-workflow`). 둘 다 계획에는 없던 항목이다. 아래 "결정 필요".

## 감지 신호 표

### 저장소 파일 (Tier 0 재유입 guard와 `adopt-orcstack` 1단계 입력)

| 프레임워크 | 경로 | 확실도 |
|---|---|---|
| SDD (`sdd-helper`) | `specs/<slug>/requirements.md`, `specs/<slug>/specs.md`, `specs/<slug>/plans.md` | 확정. 세 이름이 skill 본문에 고정 |
| SDD | 문서 안 `FR-n`, `TS-n`, `Step n` 추적 ID | 보조 신호. 단독으로는 판정하지 않는다 |
| Spec Kit | `.specify/` (`memory/constitution.md`, `templates/`, `scripts/`, `integration.json`) | 확정. `specify init`이 항상 만든다 |
| Spec Kit | `specs/NNN-<name>/` 안의 `spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/` | 확정. `create-new-feature.sh`가 `specs/`에 번호 디렉터리를 만든다 |
| Spec Kit | 하네스별 명령 파일: `.claude/skills/speckit-*/`, `.agents/skills/speckit-*/`(Codex), `.opencode/commands/speckit.*.md`, `.omp/commands/speckit.*.md`, `.pi/prompts/speckit.*.md` | 확정 (5종 실측) |
| Superpowers | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` (`brainstorming`) | 확정 |
| Superpowers | `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` (`writing-plans`) | 확정 |

`.worktrees/`·`worktrees/`(Superpowers `using-git-worktrees`)는 감지 신호로 쓰지 않는다. 다른 도구도 같은 이름을 쓴다.

SDD와 Spec Kit 구분 규칙: `specs/*/` 안에 `requirements.md`·`specs.md`·`plans.md`(복수형)가 있으면 SDD, `spec.md`·`plan.md`·`tasks.md`(단수형)가 있거나 `.specify/`가 있으면 Spec Kit.

### 하네스 설정 (`adopt-orcstack` 4단계 비활성화 대상)

| 하네스 | Superpowers | `sdd-helper` | 설정 위치 |
|---|---|---|---|
| Claude Code | `superpowers@claude-plugins-official` 또는 `superpowers@superpowers-marketplace` | `sdd-helper@synapse-marketplace` | `enabledPlugins` (유저 `~/.claude/settings.json`, 프로젝트 `.claude/settings.json`). 프로젝트에서 `false`로 끌 수 있다 |
| Codex | 공식 Codex 마켓플레이스 플러그인 | 해당 없음 (Claude 전용) | `~/.codex/config.toml`의 `[plugins."<name>@<marketplace>"] enabled = …`. 프로젝트 단위로 끌 수 있는지는 M0-3에서 확인 |
| opencode | `"plugin"`(V1) 또는 `"plugins"`(V2)에 `superpowers@git+https://github.com/obra/superpowers.git` | 해당 없음 | `opencode.json` (프로젝트 또는 `~/.config/opencode/`) |
| Pi (oh-my-pi) | `pi install git:github.com/obra/superpowers` (패키지 `"pi"` 필드: skills + extension) | 해당 없음 | 설치 기록 위치는 M0-4에서 확인 |

Spec Kit은 플러그인이 아니므로 설정에서 끌 것이 없다. 명령 파일과 `.specify/`를 동결 위치로 옮기면 비활성화가 끝난다.

### 런타임 신호 (`orc-mode` 게이트, `adopt-orcstack` 7단계)

| 프레임워크 | 하네스 | 방식 | 표지 문자열 |
|---|---|---|---|
| Superpowers | Claude Code | `SessionStart` 훅(`startup|clear|compact`)이 `using-superpowers` SKILL.md 전문을 `additionalContext`로 주입 | `<EXTREMELY_IMPORTANT>` + `You have superpowers.` |
| Superpowers | opencode | 플러그인(`.opencode/plugins/superpowers.js`)이 user 메시지로 주입 | 같음 |
| Superpowers | Pi | extension이 `session_start`·`session_compact`와 매 요청에 주입 | `superpowers:using-superpowers bootstrap for pi` |
| Superpowers | Codex | 훅 없음(`"hooks": {}`). `using-superpowers` skill이 description으로 트리거 | 없음. skill 목록에 `using-superpowers`가 있는지로 판정 |
| `sdd-helper`, Spec Kit | 전부 | 주입 없음 | 세션의 skill·명령 목록에 `sdd-helper:*`, `speckit-*`·`speckit.*`가 있는지로 판정 |

## orcstack 내부 인접 플러그인

이 머신에 설치된 플러그인 중 SDD와 엮인 것이다. 2절 혼용 금지 표의 판단 기준("작업 순서를 정하거나, 별도의 계획·명세 문서를 권위로 만드는가")으로 분류했다.

| 플러그인 | 관계 | 분류 |
|---|---|---|
| `tmux-orchestrator` (`orchwang-marketplace`) | 오케스트레이터가 `requirements/specs/plans`를 직접 쓰고 `plans.md`에서 역할·서브태스크를 뽑는다 | **충돌.** SDD 산출물을 만들고 그것을 작업 순서의 권위로 쓴다 |
| `platform-dev-team-common`의 `tdd-workflow` | "Always follow the TDD cycle", "Always write one test at a time" | **부분 충돌.** orcstack의 조건부 test-first와 crank/ratchet 구분과 다른 순서를 강제한다. 같은 플러그인의 다른 skill(`commit-with-message` 등)은 도구 성격이라 문제없다 |
| `local-memory`의 `sync-specs` | `specs/{task-name}/`를 외부 저장소로 복사 | 도구. 컷오버 후에는 입력이 없어질 뿐이다 |

## 결정 필요

1. **`tmux-orchestrator`**: orcstack 저장소에서는 끈다. 장기적으로는 입력을 SDD `plans.md` 대신 orcstack work brief로 바꾸는 방안이 있다. 이 플러그인을 바꾸는 일은 orcstack 범위 밖이다.
2. **`tdd-workflow`**: Claude Code는 플러그인 단위로만 끌 수 있다. 이 skill 하나 때문에 `platform-dev-team-common` 전체를 끌지, orcstack의 `tdd` skill이 우선한다고 `AGENTS.md`에 적고 함께 둘지 정해야 한다.
   - 권장: 플러그인은 켜 두고 `adopt-orcstack`이 "검증 순서는 orcstack `tdd`가 정한다"는 프로젝트 규칙을 쓴다. 감지 대상에는 넣되 차단하지는 않는다.

## 계획 반영

- boilerplate-plan 2절 표의 감지 신호 칸을 위 표로 교체한다. "superpowers 설계·계획 문서(경로는 버전별 상이, P0에서 확인)"는 확정됐다.
- `adopt-orcstack` 1단계 감지 대상에 orcstack 인접 플러그인을 추가한다.
- `check-no-sdd.mjs`(M1-7)의 검사 경로는 "저장소 파일" 표를 그대로 쓴다.
- M3-1 fixture는 이 표로 만든다. 이번에 만든 scratch 저장소는 세션이 끝나면 사라지므로 fixture 원본으로 쓰지 않는다. `specify init` 출력은 Spec Kit 버전을 pin해 fixture 생성 스크립트로 재현한다.
- 참고: Superpowers도 한 저장소에서 10여 개 하네스(Claude Code, Codex, opencode, Pi, Cursor, Gemini 등)를 지원한다. 하네스별 매니페스트 디렉터리를 루트에 나란히 둔다.
