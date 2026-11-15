# Brief: `adopt-orcstack` 컷오버 skill

- SSOT: §4 F4, §6 C5
- 작업 항목: M3-1
- 날짜: 2026-11-06

## 무엇을, 왜

SDD(`sdd-helper`), Spec Kit, Superpowers를 쓰던 저장소가 마일스톤 경계에서 orcstack으로 전환하게 한다. 절차는 [boilerplate-plan 2절](../boilerplate-plan.md#adopt-orcstack-컷오버-skill-최우선-구현)의 7단계다. 결정적인 단계는 스크립트로, 판단이 필요한 단계는 skill 본문으로 나눈다.

| 단계 | 담당 |
|---|---|
| 1 감지 | 스크립트 `detect` |
| 2 동결: `docs/archive/<framework>/`로 이동, FROZEN 헤더, 목록 파일 | 스크립트 `freeze` |
| 3 의도 승격: 제품 의도 → SSOT, 기술 결정 → ADR 후보, 회귀 약속 → guard 후보 | skill 본문 |
| 4 비활성화: 프로젝트 설정에서 플러그인 끄기, opencode 플러그인 항목 제거 | 스크립트 `disable` |
| 5 기록: SSOT·ADR-0001·brief 템플릿 생성 | 스크립트 `scaffold` + 본문(내용 채우기) |
| 6 재유입 차단: 대상 저장소에 Tier 0 guard 설치 | 스크립트 `guard` |
| 7 orc-mode 게이트 | M3-2 |

감지 로직은 `src/skills/adopt-orcstack/scripts/signals.mjs` 한 곳에 둔다. 이 저장소의 `tools/check-no-sdd.mjs`와 대상 저장소에 설치되는 guard가 같은 파일을 쓴다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | SDD·Spec Kit·Superpowers fixture 각각에서 `detect`가 산출물을 찾는다 | 놓친 산출물 | 🔒 unit |
| A2 | `freeze` 후 산출물이 `docs/archive/<framework>/`로 옮겨지고, Markdown에 FROZEN 헤더가 붙고, 다시 `detect`하면 0이다 | 동결 문서가 작업 경로에 남음 | 🔒 unit |
| A3 | `disable`이 프로젝트 설정에서 플러그인을 끄고, 유저 전역에서 켜진 것도 프로젝트에서 끈다 | 플러그인이 켜진 채 남음 | 🔒 unit |
| A4 | `scaffold`가 SSOT·ADR-0001·brief 템플릿을 만들고, 다시 실행해도 기존 파일을 덮어쓰지 않는다 | 작성 중인 SSOT 덮어쓰기 | 🔒 unit |
| A5 | `guard` 설치 후 대상 저장소에 새 SDD 문서를 추가하면 guard가 실패한다 | 컷오버 후 재유입 | 🔒 e2e |
| A6 | 이 저장소의 `check-no-sdd`가 같은 감지 모듈을 쓴다 | 감지 규칙이 두 벌 | 🔒 기존 테스트 통과 |
| A7 | skill 본문으로 실제 컷오버를 한 번 돌린다 | 스크립트만 있고 판단 단계 미검증 | 📎 세션 기록(SDD fixture) |

## 범위 밖

- `orc-mode` 진입 게이트(M3-2).
- 유저 전역 설정 파일 직접 수정. 프로젝트 설정으로 덮고, 전역 제거는 안내만 한다.

## A7 세션 기록 (2026-11-06)

Claude Code 2.1.318, sonnet, `--plugin-dir dist/claude-code`. SDD로 운영하던 가상 저장소(로그인 기능 `requirements.md`·`specs.md`·`plans.md`, `sdd-helper` 활성)에서 `/orcstack:adopt-orcstack`을 M7 경계로 실행했다. `-p` 모드라 확인 질문은 "유지"로 간주하게 했다. 비용 $0.197.

| 단계 | 결과 |
|---|---|
| 감지 → 동결 | 세 문서를 `docs/archive/sdd/specs/login/`으로 이동, FROZEN 헤더와 `FROZEN.md` 목록 |
| 의도 승격 | SSOT에 목적·사용자·기능 3개, 계약 4개(5회 실패 15분 잠금, 토큰 24시간 만료, p95 300ms, 강제 로그아웃)를 guard 후보로 기록 |
| ADR 후보 | opaque 토큰(강제 로그아웃 때문에 JWT를 버림), Redis 잠금 카운터(DB 컬럼은 해제 배치가 필요해 버림). 둘 다 Proposed |
| 옮기지 않은 것 | `plans.md`의 Step 목록, FR/NFR/TS ID와 문서 구조 |
| 공백 처리 | 원문에 없는 소유자, 잠금 해제 방식, 범위 밖 로그인 수단은 지어내지 않고 SSOT open question으로 남김 |
| 비활성화 | 프로젝트 설정에서 `sdd-helper`, `tmux-orchestrator`(유저 전역에서 켜져 있었음)를 `false` |
| 기록·guard | ADR-0001, brief 템플릿, `AGENTS.md` orcstack 블록(`tdd-workflow`가 켜져 있어 tdd 우선 규칙 포함), `.orcstack/check-no-sdd.mjs`와 CI 워크플로 |
| 마무리 | `detect` 산출물 0 |

관찰: `-p` 모드에서는 확인 질문을 할 수 없어 ADR 후보를 바로 썼다. 대화형에서는 3단계가 사용자 확인을 거친다. 이 부분은 대화형 세션으로 한 번 더 볼 가치가 있다.
