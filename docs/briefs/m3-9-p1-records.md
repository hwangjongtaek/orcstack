# Brief: 프로젝트의 기존 기록 체계 채택

- SSOT: §6 C5, §4 F4
- 작업 항목: M3-9 P1
- 날짜: 2026-11-06

## 무엇을, 왜

파일럿에서 `adopt-orcstack`이 기존 SSOT(`docs/product/README.md`) 옆에 SSOT를 하나 더 만들고, 3자리 ADR 체계에서 `0001`로 번호를 새로 시작했다. 결정은 [ADR-0005](../adr/0005-project-record-layout.md)에 있다.

- `.orcstack/config.json`에 `records`(ssot, adr, briefs)를 더했다. 공통 모듈 `adopt-orcstack/scripts/records.mjs`를 `adopt-orcstack`, `work-brief`, `adr`, `contract-inventory`가 함께 쓴다.
- ADR 번호 자릿수는 기존 파일에서 추론한다.
- 형식을 넓게 읽는다: SSOT `## 3.`, ADR `## Status`·`# ADR-078 —`.
- brief 검사는 `--base` 이후 바뀐 것만 볼 수 있다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | `records`에 기본값이 있고, 저장소 밖 경로·`.md`가 아닌 SSOT·모르는 키가 오류다 | 설정 오류 통과 | 🔒 unit(`tests/records.test.mjs`, 8개 red 먼저) |
| A2 | `detect`가 SSOT 후보와 ADR 번호 체계(개수, 자릿수, 다음 번호)를 보고한다 | 기존 체계를 모른 채 컷오버 | 🔒 unit |
| A3 | `scaffold`가 설정한 SSOT가 있으면 새로 만들지 않고, 컷오버 ADR은 기존 번호를 잇는다. `AGENTS.md` 블록이 실제 경로를 쓴다 | SSOT 둘, ADR 번호 둘 | 🔒 unit |
| A4 | `work-brief`, `adr`, `contract-inventory`가 `records`와 기존 형식을 따른다 | 스크립트마다 다른 경로 | 🔒 unit |
| A5 | 기존 기본 경로를 쓰는 저장소의 동작은 그대로다 | 회귀 | 🔒 기존 `adopt`·`knowledge-skills`·`extensions` 테스트 |

## 범위 밖

- pstack 라우터 감지(P2), 컷오버 brief와 rollback(P5): 다음 PR.
- synapse-backend 복사본 재컷오버: P2·P5 뒤에 한 번에 한다.

## 남은 위험

- SSOT 후보 탐지는 `docs/` 아래 첫 제목에 "SSOT"가 있는 파일만 찾는다. 다른 이름의 SSOT는 에이전트가 직접 찾아 `records.ssot`에 적어야 한다.
