# Brief: `orc-mode` 게이트

- SSOT: §6 C5, §4 F1
- 작업 항목: M3-2
- 날짜: 2026-11-06

## 무엇을, 왜

`orc-mode`가 playbook을 고르기 전에 세 가지를 확인한다. 이 확인이 없으면 다른 프레임워크와 섞인 채 작업이 시작되거나(C5), SSOT에 없는 의도로 구현이 시작된다.

1. **운영 규칙 하나.** 다른 라우터의 지시가 컨텍스트에 있으면 보고하고 멈춘다. 저장소에 SDD·Spec Kit·Superpowers 산출물이 있고 컷오버 ADR이 없으면 `adopt-orcstack`으로 보낸다. 감지는 `adopt-orcstack`의 `detect` 스크립트를 그대로 쓴다.
2. **의도는 SSOT에서.** 변경이 따르는 SSOT 절을 짚는다. SSOT에 없는 의도가 필요하면 SSOT 수정과 소유자 승인이 먼저다.
3. **변경마다 brief.** 읽기 전용 질문과 Investigation은 2·3을 건너뛴다.

SSOT도 다른 프레임워크도 없는 저장소는 아직 orcstack-governed가 아니다. 작업은 하되 `adopt-orcstack`을 한 번 안내한다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | 컷오버하지 않은 SDD 저장소에서 작업을 시작하지 않고 `adopt-orcstack`을 안내한다 | SDD 문서와 orcstack이 섞인 채 구현 | 📎 세션 A |
| A2 | Superpowers가 함께 켜져 있으면 보고하고 멈춘다 | 두 라우터가 각자 순서를 정함 | 📎 세션 B |
| A3 | 전환된 저장소에서 SSOT 범위 밖 요청이면 SSOT 수정과 brief를 구현보다 먼저 둔다 | SSOT에 없는 의도로 구현 | 📎 세션 C |
| A4 | 게이트가 가리키는 `adopt-orcstack` 경로가 배포본에 있다 | 죽은 링크 | 🔒 Tier 0 링크 검사 |

## 세션 기록 (2026-11-06, Claude Code 2.1.318, sonnet, `dist/claude-code`)

| 세션 | 조건 | 결과 | 비용 |
|---|---|---|---|
| A | `specs/login/requirements.md`가 있는 저장소, "500 에러 고쳐줘" | 훅의 지시만으로 멈춤. `orc-mode`를 불러오기 전에 SDD 문서를 짚고 `adopt-orcstack` 또는 orcstack 끄기를 제안. 코드 미열람 | $0.091 |
| B | Superpowers 원본(`obra/superpowers` 7.0.2)을 함께 `--plugin-dir`로 로드 | `orc-mode` 게이트가 "You have superpowers" 부트스트랩을 짚고 멈춤. 세 선택지 제시 | $0.148 |
| C | M3-1에서 전환한 저장소, "Google OAuth 추가" | `detect` 0과 컷오버 ADR 확인 후 통과. OAuth가 SSOT §3 범위 밖이고 §4에 open question이 있음을 짚고, SSOT 수정·승인 → brief → 구현 순서 제시 | $0.152 |

## 남은 위험

- 세션 B에서 멈추기 전에 Superpowers의 `systematic-debugging` skill을 한 번 불러왔다. 작업은 하지 않았다. 다른 라우터의 skill은 부르지 말라고 게이트에 더 분명히 적을지는 반복 관찰 후 정한다.
- 세션 A의 선택지 중 "orcstack 끄고 진행"은 사용자가 고를 수 있는 정당한 경로다. 혼용이 아니라 orcstack을 쓰지 않는 선택이다.
