# Brief: 능력 토큰 렌더링의 관사·"tool" 중복 수정

- SSOT: §3 (네 하네스에서 읽히는 본문)
- 작업 항목: M3-8에서 발견한 결함
- 날짜: 2026-11-06
- 관련: [ADR-0003](../adr/0003-neutral-capability-tokens.md)

## 무엇을, 왜

배포본 본문에 "Open a a checklist", "If the the `Agent` tool tool rejects"처럼 관사와 "tool"이 겹친 문장이 하네스마다 50곳 안팎 있었다. upstream 문장은 "Open a todolist", "the `Task` tool"처럼 관사와 "tool"을 스스로 가진다. 그런데 `todo`·`spawn-subagent` 렌더링도 관사와 "tool"을 붙여 냈다.

규칙을 정한다. **문장이 관사를 가지고, 렌더링은 그 뒤에 들어갈 명사만 낸다.**

- `spawn-subagent`: 도구 이름만 낸다(`` `Agent` ``, `` `spawn_agent` ``, `` `task` ``).
- `todo`: `todo list (…)`. 괄호 안에 하네스별 수단을 적는다.
- "into {{todo}}"처럼 관사 없이 쓰던 orcstack 문장 두 곳(`orc-help`, `orc-mode`)에는 "the"를 붙였다.

치환 규칙(`sync/substitutions.json`)은 그대로이므로 `src/`를 다시 파생할 필요가 없다.

앞으로 치환 규칙을 바꿀 때를 위해 `tools/sync.mjs --base-rules <dir|git ref>`를 더했다. 같은 pin에서 옛 규칙으로 base를, 새 규칙으로 theirs를 파생한다. 그러면 규칙 변경이 upstream 변경처럼 3-way로 fork에 병합된다. 이 옵션이 없으면 규칙 변경은 `unregisteredForks`로 실패한다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | 네 배포본의 Markdown에 관사 중복(`a a`, `the the`, `a the` 등)과 `tool tool`이 없다 | 렌더링이 관사·"tool"을 다시 붙임 | 🔒 unit(`tests/build.test.mjs`, red 먼저) |
| A2 | `--base-rules`로 규칙만 바꾼 재파생이 비fork 파일은 갱신하고, fork 파일은 3-way 병합하며, pin은 그대로다 | 규칙 변경이 `src/`에 반영되지 않음 | 🔒 unit(`tests/sync-cli.test.mjs`, red 먼저) |
| A3 | `--base-rules` 없이 규칙만 바꾸면 분기로 실패한다 | 규칙 변경이 조용히 무시됨 | 🔒 unit |

## 범위 밖

- "a `Agent` subagent"처럼 a/an이 맞지 않는 경우: 뜻은 통하고, 고치려면 upstream 문장을 fork해야 한다.

## 남은 위험

- guard는 알려진 두 형태(관사 중복, `tool tool`)만 잡는다. 다른 문법 어색함은 렌더링 표를 바꿀 때 리뷰로 본다.
