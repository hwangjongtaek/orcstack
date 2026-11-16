# Brief: orcstack 0.2.0 릴리스

- SSOT: §4 F2 F3 F7, §6 C2 C3 C4 C6 C8
- 작업 항목: release 0.2.0
- 날짜: 2026-11-16

## 무엇을, 왜

orcstack `0.2.0`은 첫 실제 pstack 갱신과 하네스별 모델 설정 계약을 사용자에게 배포한다. 릴리스 PR에서 버전, CHANGELOG, 네 하네스 매니페스트를 함께 올리고, 보호된 `main`에 병합된 뒤 자동화가 태그와 GitHub Release를 만든다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | `VERSION`, `package.json`, 네 하네스 매니페스트가 모두 `0.2.0`이고 CHANGELOG 절이 pstack `0.15.42`(`bf0c7cd`)를 기록한다 | 일부 파일만 버전이 올라가거나 upstream 근거가 빠짐 | 🔒 `tests/release.test.mjs`, `tests/validate.test.mjs` |
| A2 | 릴리스 후보가 Tier 0과 전체 테스트를 통과한다 | 실패한 guard나 낡은 `dist/`를 포함한 릴리스 | 🔒 `npm run check` |
| A3 | release PR의 독립 검증과 필수 CI가 green인 상태에서 `main`에 squash merge된다 | 검증되지 않은 patch 또는 red CI 병합 | 📎 PR verdict, GitHub 필수 check |
| A4 | 병합 뒤 `v0.2.0` 태그와 GitHub Release가 CHANGELOG 본문으로 생성된다 | 태그만 있거나 Release 본문이 다른 버전을 가리킴 | 📎 `gh release view v0.2.0`, `gh api repos/hwangjongtaek/orcstack/git/ref/tags/v0.2.0` |

## 범위 밖

- `0.2.0` 이후의 사용자 설치본 갱신과 다른 프로젝트의 `adopt guard` 재실행은 다루지 않는다.

## 남은 위험


태그와 GitHub Release는 `main` 병합 뒤 GitHub Actions가 만든다. 로컬 guard로 워크플로 계약을 확인하고, 병합 뒤 실제 태그와 Release를 직접 조회한다.
