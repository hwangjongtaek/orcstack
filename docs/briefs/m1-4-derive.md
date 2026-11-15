# Brief: upstream 트리 파생(derive)

- SSOT: §4 F2, §6 C1·C3
- 작업 항목: M1-4
- 날짜: 2026-11-06

## 무엇을, 왜

`sync/` 규칙을 upstream 트리에 적용해 orcstack 트리를 만드는 순수 함수를 만든다. sync(M1-5)의 3-way 판정은 `derive(old)`와 `derive(new)`를 비교하므로, derive가 결정적이어야 한다(C3). denylist 잔존은 사람이 손볼 목록이 된다(C1).

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | 같은 입력이면 입력 순서와 관계없이 같은 출력이 나온다 | 실행마다 다른 파생 결과 | 🔒 unit |
| A2 | `exclude` glob에 걸린 upstream 경로는 출력에 없다 | 제외 skill이 배포본에 섞임 | 🔒 unit |
| A3 | rename은 단어 경계로만 적용되고, 파일 내용과 경로 모두에 적용된다 | `upstack` → `uorcstack` 같은 오치환 | 🔒 unit |
| A4 | 출처 문맥 줄은 rename하지 않고 denylist에서도 면제한다 | 출처 고지가 지워짐(C2) | 🔒 unit |
| A5 | 중립 치환은 Markdown에만 적용하고 스크립트는 rename만 한다 | 스크립트 코드의 식별자 치환으로 실행 불가(ADR-0002 D6) | 🔒 unit |
| A6 | denylist 잔존을 경로·줄·규칙 id와 함께 보고한다 | 잔존이 조용히 통과 | 🔒 unit |
| A7 | 바이너리 파일은 그대로 통과한다 | 이미지 손상 | 🔒 unit |
| A8 | `c742dd6` 전체 derive 결과가 M0-1 측정과 맞는다. 다르면 차이를 규칙 변경으로 설명한다 | 근거 없는 수치 변화 | 📎 아래 "실측" |

## 범위 밖

- 3-way 판정과 pin 갱신(M1-5), 하네스 렌더링(M1-6).

## 실측

`node tools/derive.mjs <c742dd6 pstack>` 결과(2026-11-06):

| 항목 | M0-1 스파이크 | M1-4 | 차이의 이유 |
|---|---|---|---|
| exclude | 27 | 28 | 루트 `plugin.json` 추가(Cursor 매니페스트) |
| rename | 417 | 532 | 스파이크는 일부 확장자만 읽었다. derive는 바이너리가 아닌 모든 파일을 rename한다. 늘어난 115건 대부분은 statechart 테스트 기대 출력(`.out`)의 `pstack/skills/…` 경로(118건)다 |
| 중립 치환 | 148 | 147 | 스크립트 안의 `agent-transcripts` 2건은 이제 치환하지 않는다(D6). `Task spawn` 1건이 새로 치환된다 |
| 잔존(기존 규칙만) | 102줄 / 111건 | 80줄 / 89건 | denylist를 `.md`에만 적용해 `watch-pr` 코드의 Bugbot 22건이 빠졌다(D6) |
| 잔존(전체) | — | 107줄 / 134건 | 새 규칙 `origin-forge` 18, `cursor-team-kit` 14, `cursor-builtin-skill` 13건 |

새 규칙으로 늘어난 잔존은 [derive 잔존](../spikes/derive-residue.md) 체크리스트에 이미 있는 항목(Origin, `cursor-team-kit`, Cursor 내장 skill)이다. M2-2·M2-3에서 0으로 만든다.
