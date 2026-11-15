# Brief: 프로젝트 확장 지점

- SSOT: §4 F6, §6 C7 (보존: §6 C5, C2)
- 작업 항목: M3-8
- 날짜: 2026-11-06
- 결정: [ADR-0004](../adr/0004-project-extensions.md)

## 무엇을, 왜

프로젝트가 orcstack 플러그인을 고치지 않고 맞지 않는 playbook·skill을 끄고, 특정 항목을 확장·대체하고, 전용 playbook을 더할 수 있게 한다. 선언은 `.orcstack/config.json`에 둔다. `orc-mode`는 게이트 다음에 `extensions.mjs resolve`로 적용 표를 받는다. 프로젝트 CI guard가 같은 검사를 한다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | 끈 playbook·skill이 해석 결과의 `off`에 있고, 대체 playbook은 프로젝트 파일을, 확장은 프로젝트 파일 경로를, 추가는 `when`과 함께 나온다 | 끈 항목이 라우팅 후보로 남음, 기본 파일로 돌아감 | 🔒 unit(`tests/extensions.test.mjs`) |
| A2 | 모르는 이름, 잠긴 항목(`orc-mode`, `adopt-orcstack`, `opening-a-pr` 끄기), 없는 파일, `.orcstack/` 밖 경로, 기본 이름과 겹치는 추가, `when` 없는 추가, skill 대체·추가, 잘못된 JSON·버전이 오류다 | 설정 오류가 조용히 통과 | 🔒 unit |
| A3 | 프로젝트에 설치된 guard가 설정 오류에서 실패하고, 올바른 설정에서 통과한다 | CI가 설정 오류를 놓침 | 🔒 unit(설치된 guard 실행, red 먼저) |
| A4 | `scaffold`가 빈 설정과 안내 README를 만들고, `scaffold`·`guard`를 다시 실행해도 설정과 확장 파일이 그대로다 | 갱신이 프로젝트 맞춤을 덮음(C7) | 🔒 unit |
| A5 | `orc-mode`가 게이트 다음, playbook 선택 전에 확장을 적용한다 | 끈 playbook으로 라우팅, 확장 규칙 누락 | 📎 Claude Code 실제 세션(아래 기록) |

## e2e 기록 (2026-11-06, Claude Code 2.1.318, sonnet)

`tests/e2e/extensions.mjs`. 고객 문의 형태의 버그(쿠폰 할인이 소계를 넘어 총액이 음수)를 맡긴다. 프로젝트 확장 파일에는 표지 `EXT-7`이 붙은 단계("수정 전에 `repro/` 아래 node:test로 재현해 red를 본다")가 있다.

| 회차 | 경우 | 해석 실행 | 기본 bug-fix 열람 | 확장 열람 | 표지 단계 수행 | 판정 | 비용 |
|---|---|---|---|---|---|---|---|
| 1 | extend | `cd … &&` 복합 명령이 허용 목록에 걸려 실행 안 됨, 그대로 진행 | 아니오 | 아니오 | 아니오 | 실패 | $0.152 |
| 1 | off | 세 번째 시도에 실행 | 아니오 | (설정 확인용으로 읽음) | - | 판정 무의미 | $0.181 |
| 2 | extend | 실행 | 예 | 예 | 예: `repro/welcome-coupon.test.js`를 먼저 red로 확인 | 통과 | $0.216 |
| 2 | off | 실행 | 아니오. Feature playbook을 열었다 | - | - | 통과 | $0.436 |

1회차에서 고친 것:

- `orc-mode`가 스크립트를 `cd` 없이 절대 경로 한 줄로 실행하게 하고, 스크립트를 못 돌리면 `.orcstack/config.json`을 직접 읽어 같은 규칙을 적용하게 했다. 게이트의 `detect` 명령도 같은 형식으로 맞췄다.
- 한 줄짜리 버그는 어느 경우든 playbook을 열지 않아 off 판정이 의미가 없었다. 조사가 필요한 버그로 바꾸고, extend 통과 조건에 "기본 bug-fix playbook을 열었다"를 넣어 off와 대조되게 했다.

## 범위 밖

- skill 대체·추가: 하네스의 프로젝트 skill 디렉터리로 한다(ADR-0004 결정 2).
- 사용자가 슬래시로 직접 부른 skill에 확장 적용: 재검토 조건으로 둔다.
- Codex·oh-my-pi·opencode 실제 세션 확인: 같은 `orc-mode` 본문을 쓰므로 M4 설치 스모크에서 본다.

## 남은 위험

- off 경우에 "프로젝트가 껐다"고 한 번 말하는지는 기록하지 않았다. 판정은 기본 playbook을 열지 않은 것만 본다.
- 같은 실행에서 모델이 저장소 밖 `/tmp`에 검증용 파일을 만들었다. 확장과 무관한 기존 행동이다.
- A5는 모델의 지시 이행에 기댄다. 스크립트가 적용 표를 결정적으로 내므로 해석 오류는 unit으로 막지만, 표를 읽고도 따르지 않는 경우는 세션 기록으로만 본다. 반복 확인은 Tier 2 nightly(M5-3) 후보다.
