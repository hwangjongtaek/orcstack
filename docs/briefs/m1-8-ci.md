# Brief: CI (Tier 0·1)

- SSOT: §6 전체
- 작업 항목: M1-8
- 날짜: 2026-11-06

## 무엇을, 왜

commit build(Tier 0 + Tier 1)를 모든 push·PR에서 로컬과 같은 명령으로 돌린다. red면 머지하지 않는다.

- `.github/workflows/tier0.yml`: `npm run tier0`, 제한 2분
- `.github/workflows/tier1.yml`: `npm test`, 제한 10분
- 로컬은 `npm run check` 하나가 둘을 합친다

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | 두 워크플로가 로컬과 같은 npm 스크립트를 부른다 | CI 전용 명령이 생겨 로컬과 어긋남 | 📎 워크플로 파일 |
| A2 | 워크플로 문법이 맞다 | push 후에야 아는 문법 오류 | 📎 actionlint 통과 |
| A3 | Tier 0이 2분 안에 끝난다 | 느린 구조 게이트 | 📎 첫 CI 실행(`cb9a729`): tier0 job 7초, tier1 job 9초 |
| A4 | `main`에 두 job이 필수 검사로 걸린다 | red 상태 머지 | 📎 ruleset `main-protection` (아래) |

## `main` 보호 (2026-11-06)

GitHub ruleset `main-protection`(Active, 대상: 기본 브랜치 `main`, 우회 목록 없음):

| 규칙 | 값 |
|---|---|
| 삭제 제한, 강제 push 차단 | 켬 |
| 선형 이력 | 켬. 병합 방식은 Squash, Rebase |
| PR 필수 | 켬. 필수 승인 0명, 리뷰 대화 해결 필수 |
| 상태 검사 필수 | `tier0`, `tier1`(GitHub Actions), 브랜치 최신 상태 필수 |

필수 승인을 0명으로 둔 이유: 지금은 작성자가 한 명이라, 1명 이상이면 자기 PR을 머지할 수 없다. 대신 CI와 대화 해결이 머지를 막는다. 리뷰어가 생기면 1명으로 올린다.

## 결과

- 이후 모든 변경은 PR로만 `main`에 들어간다. 이 brief를 담은 PR이 첫 사례다.
