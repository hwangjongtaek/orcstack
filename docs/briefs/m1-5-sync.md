# Brief: upstream sync (3-way 판정과 pin 갱신)

- SSOT: §4 F2, §6 C3·C4
- 작업 항목: M1-5
- 날짜: 2026-11-06

## 무엇을, 왜

upstream이 바뀌면 `derive(옛 pin)`, `derive(새 커밋)`, 현재 `src/`를 파일 단위로 3-way 비교해 `src/`를 갱신한다. orcstack이 일부러 고친 파일(fork)은 지키고, 이유가 등록되지 않은 분기는 막는다(C4). 판정이 하나라도 실패하면 pin을 바꾸지 않는다.

판정 규칙(base = derive(옛 pin), theirs = derive(새 커밋), ours = `src/`):

| 상황 | 결과 |
|---|---|
| ours = base | theirs를 따른다(갱신·추가·삭제) |
| base = theirs, ours ≠ base | ours 유지. `forks.json`에 없으면 실패 |
| 셋 다 다름 | 줄 단위 3-way 병합. 성공하면 merged(fork 등록 필요), 실패하면 충돌 마커와 함께 conflict |
| upstream이 지운 파일을 orcstack이 고쳤음 | conflict |
| upstream에 있는데 `src/`에 없음 | 실패. 빼려면 `exclude`에 넣는다 |
| base·theirs 어디에도 없는 파일 | orcstack 고유 파일. 건드리지 않는다 |

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | 위 표의 판정 경로가 각각 기대대로 동작한다 | fork가 조용히 덮임 | 🔒 unit(`syncTrees`) |
| A2 | `forks.json`에 없는 분기가 있으면 실패하고 pin이 그대로다 | 이유 없는 drift 머지 | 🔒 unit + e2e |
| A3 | 등록됐지만 더는 분기하지 않는 fork를 stale로 보고한다 | 죽은 fork 항목 누적 | 🔒 unit |
| A4 | 충돌이 있으면 마커를 남기고 pin을 바꾸지 않는다 | 충돌 상태로 pin 진행 | 🔒 e2e(가짜 upstream git 저장소 두 커밋) |
| A5 | 성공하면 `sync/upstream.json`의 pin 커밋과 날짜가 새 커밋으로 바뀐다 | 수동 pin 편집 | 🔒 e2e |
| A6 | `--init`으로 빈 `src/`에 pin 커밋을 처음 반입한다(M2-1용) | 반입 경로 없음 | 🔒 e2e |

## 범위 밖

- upstream을 원격에서 가져오는 일. CLI는 로컬 git 저장소를 받고, 주간 Action(M5-1)이 clone한다.
- denylist 잔존으로 sync를 막는 일. 잔존은 보고만 하고, Tier 0 validate(M1-7)가 `src/` 잔존으로 PR을 막는다.
- pin의 `version`은 upstream `plugin.json`에서 읽는다.
