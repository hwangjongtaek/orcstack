# Brief: README 빠른 시작

- SSOT: §2(사용자), §4 F3(프로젝트 전환)
- 작업 항목: M5-7
- 날짜: 2026-11-09

## 무엇을, 왜

README는 하네스 설치와 전환 방법을 절마다 나눠 설명한다. 처음 도입하는 사람은 무엇을 어떤 순서로 하고, 언제 무엇을 결정해야 하는지 한눈에 볼 곳이 없다. synapse-backend 적용에서도 설치, preflight 결정, 컷오버, 갱신 뒤 `adopt guard` 재실행이 흩어져 있었다(M5-6 B3).

README 위쪽에 "빠른 시작"을 둔다. 설치 → preflight(읽기 전용) → 전환 → verify → 팀 설치·갱신의 다섯 단계와, preflight가 묻는 결정 목록을 담는다. 자세한 설명은 기존 절과 `ADOPTING.md`에 맡긴다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | README에 "빠른 시작" 절이 있고 설치, preflight, 전환, verify, `adopt guard` 갱신을 순서대로 보인다 | 도입 순서를 여러 절에서 맞춰 읽어야 함 | 🔒 `tests/readme.test.mjs` |
| A2 | README의 `tools/orcstack.mjs` 명령과 `adopt` 단계가 실제 CLI에 있다 | 없는 명령을 안내 | 🔒 같은 테스트 |
| A3 | 빠른 시작의 결정 표가 preflight가 내는 결정 id를 모두, 그것만 담는다 | 결정이 늘었는데 README가 모름 | 🔒 같은 테스트 |

## 범위 밖

- 하네스별 세팅, 프로젝트 맞춤, CI 절의 재작성.
- 영어 README.

## 남은 위험

- 하네스 CLI 명령 자체(`claude plugin install` 등)는 이 테스트가 아니라 Tier 2 install-smoke가 확인한다.
