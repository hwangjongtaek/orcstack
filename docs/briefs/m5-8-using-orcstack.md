# Brief: orcstack 활용하기 가이드

- SSOT: §2(사용자), §4 F1(라우팅)·F2(기록)·F4(프로젝트 확장)
- 작업 항목: M5-8
- 날짜: 2026-11-09

## 무엇을, 왜

README는 설치와 도입까지 다룬다. 도입을 마친 프로젝트에서 팀원이 매일 무엇을 하면 되는지는 아직 정리된 곳이 없다. 무엇을 하면 되는지는 다섯 가지다. 요청하는 법, 게이트가 멈췄을 때 할 일, playbook·skill 고르기, SSOT·brief·ADR을 쓰는 시점, 프로젝트 맞춤이다. 지금은 이 내용이 `orc-mode` 본문(영어)과 `.orcstack/README.md`, ADR에 흩어져 있다.

`docs/guides/using-orcstack.md`에 사람이 읽는 한국어 가이드를 둔다. README에서 링크한다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | 가이드가 일상 흐름, 게이트가 멈출 때, playbook, 기록, 검증, skill, 프로젝트 맞춤, 끄기·갱신, 문제 해결을 다룬다 | 도입 뒤 쓰는 법을 skill 본문에서 찾아야 함 | 📎 리뷰 |
| A2 | 가이드 표에 적은 skill과 playbook이 실제로 있다 | 없는 이름을 안내 | 🔒 `tests/guides.test.mjs` |
| A3 | README가 가이드를 링크한다 | 가이드를 찾을 길이 없음 | 🔒 같은 테스트 |

## 범위 밖

- skill 본문 번역. skill 본문은 영어로 유지한다(AGENTS.md).
- 하네스별 설치 절차. README에 있다.

## 남은 위험

- 가이드의 설명 문장은 skill 본문이 바뀌면 낡을 수 있다. 이름은 테스트가 막고, 내용은 릴리스마다 CHANGELOG를 보며 사람이 맞춘다.
