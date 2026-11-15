# Brief: 검증·기록 정책 반영 (M3-3, M3-4)

- SSOT: §4 F1, [철학](../philosophy.md) §2 지식 보존, §3 검증 전략
- 작업 항목: M3-3, M3-4
- 날짜: 2026-11-06

## 무엇을, 왜

upstream playbook과 skill에는 orcstack의 검증·기록 규칙이 없다. 크랭크와 래칫, 가장 낮은 안정 계층, red-before-green 6단계, 비계와 울타리, 계획은 임시·SSOT는 영속 같은 규칙이다. 대상 파일 14개를 모두 fork하면 fork가 19개에서 늘어난다. 이미 15개 한도를 넘었으므로 작업 계획 리스크 표의 대응을 따른다.

- 정책 본문은 orcstack 전용 reference 두 개에 둔다: `orc-mode/references/verification.md`, `references/records.md`. reference가 playbook보다 엄격하면 reference를 따른다.
- 이미 fork된 `orc-mode` 본문이 두 reference를 적용 대상과 함께 연결한다. Bug fix, Feature, Refactoring을 고르면 해당 절을 todo 항목으로 하나 더하고, PR 전에 크랭크와 래칫을 가르는 항목을 더한다.
- 이미 fork된 playbook 다섯 개에는 그 playbook에서 바로 필요한 한 줄만 넣는다.

| 파일 | 넣은 규칙 |
|---|---|
| `bug-fix` | 영구 래칫을 가장 낮은 안정 계층에 남기거나, 못 남기면 이유·잔여 위험·검증·승인자를 PR에 적는다 |
| `opening-a-pr` | `## Intent`(SSOT 절, brief 경로)와 acceptance 항목별 검증 줄 |
| `shipping` | 독립 검증 PASS가 필수 CI를 대신하지 않는다 |
| `multi-phase-plan` | 계획 파일은 임시다. 의도는 SSOT, PR마다 brief |
| `session-pickup` | 커밋된 기록(SSOT, brief, ADR)이 transcript보다 우선한다 |

fork하지 않은 `tdd`, `correct`, `refactoring`, `feature`, `prototype`, `pause-safely`, `recall`은 `orc-mode`가 라우팅할 때 reference를 적용한다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | fork 수가 19개 그대로이고, 같은 pin으로 upstream과 3-way sync하면 미등록 분기와 오래된 fork 항목이 0이다 | 등록 없는 분기, fork 증가 | 📎 sync 실행(아래). 🔒 등록 검사는 M5-1 주간 sync가 매번 한다 |
| A2 | reference 링크가 깨지지 않는다 | 끊긴 링크 | 🔒 Tier 0 링크 검사 |
| A3 | 정책 문구가 철학 §2·§3과 어긋나지 않는다 | 철학과 다른 규칙 | 📎 리뷰(이 brief의 표) |

## sync 기록 (2026-11-06)

저장소 사본에서 `node tools/sync.mjs --root <사본> --upstream <cursor/plugins> --to c742dd6`를 실행했다. 판정 통과. forked 19, own 15(새 reference 2개 포함), 미등록 분기 0, 오래된 fork 0, 충돌 0. `src/`는 바뀌지 않았다.

## 범위 밖

- 사용자가 슬래시로 직접 부른 `tdd`·`correct`·`recall`에는 reference가 적용되지 않는다. ADR-0004와 같은 한계다.
- 정책을 따르는지 보는 실제 세션 e2e는 M3-7 파일럿에서 본다.

## 남은 위험

- reference는 모델이 읽고 따라야 효과가 있다. `orc-mode`가 todo 항목으로 넣게 해 빠뜨릴 가능성을 줄였지만, 확인은 세션 기록으로만 한다.
