# M0-2~M0-5 하네스 실측

- 측정일: 2026-11-05
- 버전: Claude Code 2.1.318, Codex CLI 0.163.0, oh-my-pi (`omp`) 18.15.0, opencode 1.18.25
- 방법: 손으로 만든 최소 플러그인을 각 하네스에 올리고 headless로 실행했다. 사용자 설정은 건드리지 않았다(Claude Code는 `--plugin-dir`, Codex는 scratch `CODEX_HOME`, opencode는 프로젝트 로컬 디렉터리, omp는 마켓플레이스를 잠시 추가했다가 제거하고 원래 설정과 diff로 복원 확인).
  - 플러그인 구성: `orc-mode` skill 하나와 playbook 3개(`bug-fix`, `feature`, `refactoring`), SessionStart 훅.
  - 판정 방법: 각 playbook 파일 안에 추측할 수 없는 토큰을 넣었다. 응답에 그 토큰이 나오면 skill이 playbook 파일을 실제로 읽은 것이다.
- 스파이크 코드는 머지하지 않는다. 결과만 남긴다.

## 결론

- **네 하네스 모두 `orc-mode` → playbook 라우팅이 동작한다.** 세 경로(bug-fix, feature, refactoring)와 자연어 호출 모두 맞는 playbook 토큰을 돌려줬다.
- **세션 시작 훅은 Claude Code에서 바로, Codex에서는 사용자가 한 번 신뢰를 승인한 뒤 동작한다.** omp는 Claude 형식 훅을 실행하지 않고, opencode는 훅이 없다. 대신 **`AGENTS.md` 지시만으로 세 하네스 모두 프롬프트에 orc-mode를 언급하지 않아도 라우팅됐다.**
- **`.agents/skills/`는 Codex, omp, opencode가 공통으로 읽는다.** 플러그인 없이 프로젝트에 이 디렉터리와 `AGENTS.md`만 두면 세 하네스에서 동작한다.
- **omp는 Claude Code 마켓플레이스 형식을 그대로 읽는다.** boilerplate-plan이 가정한 `package.json`의 `"pi"` 필드는 omp에 필요 없었다. Pi 지원 대상은 oh-my-pi로 확정했다.
- **질문 도구는 네 하네스 모두 대화형에서 있다**(`AskUserQuestion`, `request_user_input_async`, `ask`, `question`). headless에서는 Codex만 남는다.
- 도구 이름은 네 하네스가 모두 다르고, 질문·todo 도구 유무도 다르다. 하네스별 렌더링(빌드 타임 번역)은 여전히 필요하다.

## 하네스별 결과

| 하네스 | 설치 | 호출 | 라우팅 결과 | 세션 훅 |
|---|---|---|---|---|
| Claude Code | `.claude-plugin/plugin.json` (`--plugin-dir`로 확인. 마켓플레이스는 M2-5) | `/orcstack:orc-mode`, 자연어 | 4/4 (세 경로 + 자연어) | ✅ `SessionStart` `additionalContext` 주입 확인 |
| Codex | `codex plugin marketplace add <path>` → `codex plugin add orcstack@<marketplace>`. 설치 시 플러그인을 `$CODEX_HOME/plugins/cache/`로 **복사**한다 | `$orc-mode`, 자연어 | 4/4 | ❌ `.codex-plugin`의 `hooks` 지정만으로는 실행되지 않음. `plugin_hooks` 기능 플래그가 `removed`, hook trust 우회는 이번 측정에서 쓰지 않았다 |
| omp | `omp plugin marketplace add <path>` → `omp plugin install orcstack@<marketplace> --scope=project` (Claude 마켓플레이스 형식) | `/skill:orc-mode`, 자연어 | 2/2 + `AGENTS.md` 1/1 | ❌ Claude 형식 `hooks.json` 미실행 |
| opencode | 매니페스트 없음. `.opencode/skills/` 또는 `.agents/skills/` (심볼릭 링크 가능) | `skill` 도구, 자연어 | 3/3 + `AGENTS.md` 1/1 | 없음 |

`AGENTS.md`만으로 라우팅(프롬프트에 orc-mode 언급 없음): Codex ✅, omp ✅, opencode ✅. Codex는 플러그인을 끈 상태에서도 프로젝트 `.agents/skills/`를 읽었다.

모델: Claude Code sonnet. Codex는 기본 모델. omp는 사용자 기본 모델. opencode는 `opencode/glm-5.3-flash-free`를 썼다. 기본 설정인 사내 LLM(`datamaker/glm-4.7-flash`)은 엔드포인트가 404를 반환했고, `github-copilot`은 PAT 미지원 오류였다. 둘 다 사용자 환경 문제다. 약한 무료 모델로도 라우팅이 정확했다.

## 중립 능력 → 하네스 매핑 (boilerplate-plan 7절 표 갱신본)

도구 이름은 headless 세션의 도구 목록에서 확인했다. Claude Code는 stream-json `init` 이벤트, 나머지는 모델에게 자기 도구 목록을 그대로 나열하게 했다. "대화형 확인"은 headless에서 빠지는 도구라 대화형 세션에서 다시 봐야 하는 칸이다.

| 중립 능력 | Claude Code | Codex | omp | opencode |
|---|---|---|---|---|
| `spawn-subagent` | `Agent` (stream-json `init`에는 `Task`로 표시) | `spawn_agent` (+ `wait_agent`, `send_message`, `list_agents`, `interrupt_agent`, `followup_task`) | `task` (+ `wait`) | `task` |
| `ask-user` | `AskUserQuestion` (대화형만. `-p`에는 없음) | `request_user_input_async`. `request_user_input`은 Plan 모드 전용 | `ask` (질문 + 선택지 + 권장 표시, 대화형만. 바이너리의 도구 정의로 확인) | `question` (TUI·app·desktop만. `opencode serve`의 tool registry API로 확인. `opencode run`에서는 빠진다) |
| `todo` | 이 버전 도구 목록에 없음 → 본문 체크리스트로 대체 | 없음. `create_goal`·`update_goal`·`get_goal`이 가장 가깝다 | `todo` | `todowrite` |
| `isolated-worktree` | `EnterWorktree`/`ExitWorktree`, `Agent`의 worktree 격리 | `codex exec --worktree`, 그 외 `git worktree` | `git worktree` | `git worktree` |
| `run-skill` | `/orcstack:<name>`, `Skill` 도구 | `$<name>` | `/skill:<name>`, `read skill://<name>` | `skill` 도구 |
| `project-rule` | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` (`CLAUDE.md`도 읽음) | `AGENTS.md` |
| `session-hook` | 플러그인 `SessionStart` ✅ | 플러그인 `SessionStart` ✅ (대화형 신뢰 승인 후. 아래 "Codex 훅") | 미동작 | 없음 |
| `transcripts` | `~/.claude/projects/<slug>/*.jsonl` | `$CODEX_HOME/sessions/YYYY/MM/DD/rollout-*.jsonl` | `~/.omp/agent/sessions/<cwd-slug>/` | SQLite `~/.local/share/opencode/opencode.db` (파일 아님) |
| `model-sheet` | `settings.json` `model`, `Agent`의 `model` 인자 | `config.toml` `model` | `~/.omp/agent/config.yml` `modelRoles` (`--smol`·`--slow`·`--plan` 역할) | `opencode.json` `model`·`small_model` |
| `loop` / `schedule` | `/loop`, `ScheduleWakeup`, `Cron*` | 없음 | 없음 (확인한 도구 목록 기준) | 없음 |

## 후속 확인 (2026-11-05)

| 항목 | 결과 |
|---|---|
| omp `ask-user` | 있음. `ask` 도구(`questions[]`, 선택지, `multi`, `recommended`). 대화형 전용이라 `-p`에서는 빠진다 |
| opencode `ask-user` | 있음. `question` 도구. 클라이언트가 `app`·`cli`·`desktop`이거나 `OPENCODE_ENABLE_QUESTION_TOOL`일 때 등록된다. `opencode serve` tool registry에 `question`이 있고 `opencode run`에서는 빠진다 |
| Pi 지원 대상 | **oh-my-pi로 확정.** 최초 요구사항이 "pi(oh my pi)"다. upstream pi와 `package.json` `"pi"` 필드는 지원 대상에서 뺀다 |
| opencode의 Claude Code 호환 | opencode는 `CLAUDE.md`(`~/.claude/CLAUDE.md` 포함)와 Claude Code skills도 읽는다(`OPENCODE_DISABLE_CLAUDE_CODE*` 플래그로 끔). 같은 저장소에 `.claude/skills/`와 `.agents/skills/`를 둘 다 두면 opencode에 orc-mode가 두 벌 보일 수 있다. M4-3에서 확인한다 |

### Codex 훅 (대화형 승인 후 재측정)

scratch `CODEX_HOME`에서 TUI를 열고 정식 검토 화면에서 승인했다. 우회 플래그는 쓰지 않았다.

- TUI가 훅 2개를 검토 대상으로 표시했다: `.codex-plugin`이 가리킨 **플러그인 훅**(`Source: Plugin - orcstack@orcstack-spike`)과 `$CODEX_HOME/hooks.json`의 **사용자 설정 훅**. Codex는 플러그인 훅을 지원한다. `plugin_hooks` 기능 플래그가 `removed`인 것은 기본 동작으로 흡수됐다는 뜻으로 보인다.
- 플러그인 훅 하나만 신뢰한 뒤 `codex exec`를 실행하자 `SessionStart` 훅이 돌고 `DAMA-HOOK-SEEN`을 답했다. 처음 측정에서 `NO-HOOK`이었던 이유는 **신뢰되지 않은 훅을 headless에서 조용히 건너뛰기** 때문이다.
- Claude Code 형식 `hooks.json`(`hookSpecificOutput.additionalContext`)을 그대로 쓸 수 있다.
- 신뢰는 `config.toml`의 `[hooks.state."<plugin>:hooks/hooks.json:session_start:0:0"] trusted_hash = "sha256:…"`로 기록된다. 훅 정의가 바뀌면 해시가 달라져 다시 검토해야 한다.

orcstack에 주는 의미:
- Codex에서도 SessionStart 라우팅을 쓸 수 있다. 다만 **사용자가 한 번 대화형으로 승인해야** 하고, 훅을 바꾸는 릴리스마다 다시 승인해야 한다. 승인 전에는 아무 경고 없이 꺼져 있다.
- 그래서 Codex 라우팅의 기본값은 `AGENTS.md` 지시로 두고, 훅은 보조 경로로 쓴다. 설치 문서(M4-4)에 승인 절차를 적고, 훅 정의는 릴리스 사이에 바꾸지 않는다.

## 미확정

1. **Claude Code `todo`**: 이 버전 도구 목록에 todo 도구가 없다. 대체 경로(본문 체크리스트)를 기본으로 둔다.

작업 계획 M0 종료 기준 "매핑 표 '확인 필요' 0개"를 충족했다.

## 계획에 주는 영향

1. **배포 경로를 셋으로 줄일 수 있다.**
   - Claude Code: `.claude-plugin` 마켓플레이스 (훅 포함)
   - Codex: `.agents/plugins/marketplace.json` + `.codex-plugin`
   - omp: Claude 마켓플레이스 형식을 그대로 읽는다. 단 Claude용으로 렌더링된 도구 이름을 받게 되므로 같은 `marketplace.json`에 omp용 플러그인 항목(예: `orcstack-omp`)을 따로 둔다.
   - opencode: `.agents/skills/` 설치 스크립트
2. **라우팅은 하네스 둘로 나뉜다.** Claude Code는 SessionStart 훅, 나머지 셋은 `adopt-orcstack`/`setup-orcstack`이 쓰는 `AGENTS.md` 지시. D3(자동 라우팅 기본 on)은 Claude Code에서는 훅, 나머지에서는 `AGENTS.md` 블록으로 구현한다.
3. **하네스별 렌더링은 유지한다.** 도구 이름이 넷 다 다르고 질문·todo 유무가 갈린다. 공유 skill 디렉터리 하나로 가면 본문이 네 하네스를 모두 설명해야 한다. M1-3(ADR-0002)의 입력이다.
4. **Codex는 설치본이 복사본이다.** 업데이트는 `codex plugin marketplace upgrade` 후 재설치다. 릴리스 문서(M5-2)에 적는다.
5. **`orc-mode` 게이트(혼용 프레임워크 감지)를 세션 시작에 자동으로 돌릴 수 있는 것은 Claude Code와, 훅을 승인한 Codex뿐이다.** 다른 하네스에서는 `AGENTS.md`가 "작업 전에 orc-mode를 먼저 불러라"고 지시하고, orc-mode 진입 시 게이트를 돈다.
