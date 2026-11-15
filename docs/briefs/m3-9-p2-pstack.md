# Brief: pstack 라우터 감지와 전환

- SSOT: §6 C5 C1, §4 F4
- 작업 항목: M3-9 P2, P7, P8
- 날짜: 2026-11-06

## 무엇을, 왜

파일럿 저장소의 `AGENTS.md`는 pstack `poteto-mode`로 라우팅하라고 지시했다. 그런데 orcstack은 이를 다른 라우터로 감지하지 못했고, 컷오버 뒤에도 두 라우팅 지시가 함께 남았다([파일럿](../spikes/m3-7-pilot-synapse-backend.md) P2).

- **감지(`signals.mjs`):** `AGENTS.md`·`CLAUDE.md`·`GEMINI.md`에서 orcstack 블록 밖의 `poteto-mode` 지시를 줄 번호와 함께 `routing instruction`으로 보고한다. `pstack@…` 플러그인도 감지하고 `disable`이 끈다.
- **`adopt-orcstack` 3b단계:** 라우팅 지시를 교체할 때는 바꾸기 전과 후를 보여 주고 승인을 받는다. 옛 운영 규칙 ADR은 수정하지 않고 supersede한다. pstack 저장소는 기존 SSOT·brief·ADR을 `records`로 이어 쓴다.
- **`orc-mode` 게이트:** pstack `poteto-mode` 라우팅 지시도 다른 라우터로 보고 멈춘다.
- **C1 예외:** 다른 라우터로 지칭하는 문구 "pstack's `poteto-mode`"가 들어간 줄만 denylist 예외로 둔다(`sync/attribution.json`, SSOT C1 문구 갱신). 파생 결과가 바뀌지 않는 것은 같은 pin의 3-way sync로 확인했다.
- **P7:** `tmux-orchestrator`를 끄는 이유(SDD 계획을 실행한다)를 주석과 본문에 적었다.
- **P8:** 설치 파일의 ADR 참조를 "orcstack ADR-0004"와 링크로 바꿨다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | `detect`가 pstack 라우팅 지시를 줄 번호와 함께, pstack 플러그인을 `enabled plugin`으로 보고한다 | 라우터 둘이 남은 채 컷오버 | 🔒 unit(`tests/adopt.test.mjs`, red 먼저) |
| A2 | `disable`이 pstack 플러그인을 끄고, orcstack 블록 안의 `poteto-mode` 언급은 신호가 아니다 | 교체 문구 때문에 guard가 영구 실패 | 🔒 unit |
| A3 | `freeze`는 지시 파일을 옮기지 않는다 | `AGENTS.md`가 archive로 이동 | 🔒 unit(이미 통과하던 동작의 회귀 guard) |
| A4 | denylist 예외는 정확한 문구가 있는 줄로 한정되고, 파생 결과는 그대로다 | upstream 잔존 누수, C3 위반 | 🔒 Tier 0 denylist, 📎 같은 pin sync(forked 19, 미등록 0, `src/` 변화 없음) |

## 범위 밖

- 실제 라우팅 줄 교체: 판단이라 `adopt-orcstack` 본문이 맡는다.
- SessionStart 훅 문구: Codex 재승인이 필요해 바꾸지 않았다. 훅은 일반적인 "다른 워크플로 프레임워크" 표현을 이미 쓴다.

## 남은 위험

- "pstack's `poteto-mode`" 문구를 쓴 upstream 줄이 앞으로 생기면 rename이 건너뛴다. 지금 upstream에는 없다. 주간 sync의 denylist 보고에서 본다.
