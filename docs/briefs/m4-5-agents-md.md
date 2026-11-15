# Brief: 모범 AGENTS.md와 orcstack 블록 계약

- SSOT: §4 F1 F4, §6 C5
- 작업 항목: M4-5, M3-9 P6
- 날짜: 2026-11-06

## 무엇을, 왜

Codex, oh-my-pi, opencode에서는 `AGENTS.md`의 orcstack 블록이 라우팅의 유일한 경로다. 블록이 담은 것은 라우팅 한 줄과 SSOT 경로뿐이었다. 검증 명령, 기록 규칙, 프로젝트 확장 위치는 없었다. 그리고 기존 팀 `AGENTS.md`에 남은 다른 운영 규칙 줄(파일럿 P6)은 아무도 보고하지 않았다.

- **블록 다시 쓰기:** 라우팅, 기록 위치 표(SSOT·ADR·brief·`.orcstack/config.json`, `records` 경로 반영), 검증 명령, 금지 사항, TDD 우선순위를 30줄 이하로 담는다.
  - 검증 명령은 `package.json`(`check`·`commit-build`·`verify`·`test`)이나 `Makefile`의 같은 이름 목표에서 찾는다.
  - 찾지 못하면 `ci-tiers` skill을 가리킨다.
- **충돌 보고:** `scaffold`가 블록 밖에서 orcstack과 충돌하는 줄을 `agentsConflicts`로 보고한다. 다른 운영 규칙(`SDD-governed` 등), `spec-orchestrator`, 다른 프레임워크 도구, `poteto-mode`가 대상이다. 교체는 승인 뒤에 한다.
- **가이드:** [AGENTS.md 가이드](../guides/agents-md.md)에 팀 부분과 orcstack 블록의 구조, 원칙, 예시, 기존 파일과 합치는 규칙을 적었다. 이 저장소의 `AGENTS.md`에도 라우팅 절을 더했다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | 블록이 라우팅, `records` 경로를 쓴 기록 표, 확장 위치, 검증 명령, 금지 사항을 30줄 이하로 담고, 남은 자리표시자가 없다 | 라우팅에 필요한 정보 누락, 블록 비대 | 🔒 unit(`tests/agents-md.test.mjs`, red 먼저) |
| A2 | 검증 명령을 npm → make 순서로 찾고, 없으면 `ci-tiers`를 가리킨다 | 틀린 명령 안내 | 🔒 unit |
| A3 | 블록 밖 충돌 줄을 줄 번호와 함께 보고하고, 팀 줄은 지우지 않는다 | 라우터·운영 규칙 둘, 팀 규칙 손실 | 🔒 unit |
| A4 | 새 블록만으로 훅 없는 하네스가 `orc-mode`에 진입하고 게이트를 돈다 | 라우팅 없음 | 📎 omp·opencode 세션(아래) |

## 세션 기록 (2026-11-06)

같은 요청("장바구니 총액이 항상 1원 적게 나온다. 고쳐줘.")을 새 블록이 있는 scratch 저장소에서 실행했다.

| 하네스 | 모델 | 결과 |
|---|---|---|
| omp 18.15.0 | 사용자 기본 | `orc-mode` 진입 → 게이트·확장 해석 → `bug-fix` playbook → 재현 → SSOT 승인을 요청하고 멈춤 |
| opencode 1.18.25 | `opencode/glm-5.3-flash-free` | `orc-mode` 진입 → 게이트·확장 해석 → `bug-fix` playbook → 재현 → 회귀 테스트 red(`npm run check`) → 수정 → green → brief |

M4-3에서 같은 opencode 모델은 옛 블록으로 게이트를 건너뛰었다. 새 블록에서는 게이트를 돌았고, 블록이 알려 준 검증 명령으로 red-before-green을 했다. 다만 비어 있는 SSOT에 대한 승인은 묻지 않고 §1을 스스로 인용했다. omp 설정은 백업과 diff로 원래대로 돌렸다.

## 범위 밖

- 기존 팀 `AGENTS.md`의 구조 정리: 컷오버 PR과 나눠 별도 PR로 한다(가이드에 적음).

## 남은 위험

- `agentsConflicts`는 알려진 이름만 찾는다. 다른 표현으로 쓴 옛 규칙은 skill 본문의 "다른 문서의 옛 규칙도 찾아라" 단계가 맡는다.
- 각 하네스를 한 번씩만 실행했다.
