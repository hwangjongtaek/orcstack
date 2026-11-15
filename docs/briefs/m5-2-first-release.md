# Brief: 첫 릴리스와 릴리스 절차

- SSOT: §4 F2, §6 C6
- 작업 항목: M5-2
- 날짜: 2026-11-06

## 무엇을, 왜

M4까지 네 하네스의 설치와 라우팅을 확인했고, M5-1로 upstream 갱신 경로가 생겼다. 그런데 버전은 아직 `0.0.0`이고 태그가 없다. 그래서 설치한 사람이 어느 상태를 받았는지, 어떤 upstream에서 파생됐는지 말할 수 없다. 첫 릴리스 `0.1.0`을 내고, 다음 릴리스도 같은 절차로 나오게 한다.

- **준비는 `tools/release.mjs prepare --version <x.y.z>`.**
  - `VERSION`과 `package.json`을 올린다.
  - CHANGELOG의 `[Unreleased]`를 `[x.y.z] - 날짜` 절로 옮기고, 그 절의 upstream 줄을 `sync/upstream.json` pin에서 쓴다. 손으로 적은 pin이 실제 pin과 어긋나지 않게 하기 위해서다.
  - `dist/`를 다시 빌드한다. 하네스 매니페스트의 `version`이 `VERSION`에서 나오기 때문이다.
- **태그는 사람이 아니라 `main`이 붙인다.** `.github/workflows/release.yml`은 `main`에 `VERSION`이 바뀌어 들어오면 `v<VERSION>` 태그와 GitHub Release를 만든다. 본문은 CHANGELOG의 해당 절(`release.mjs notes`)이다. 이미 있는 태그는 건드리지 않는다.
- **tier0 validate가 버전 일치를 막는다.** `package.json`과 `VERSION`이 다르거나, `VERSION`(0.0.0 제외)에 해당하는 CHANGELOG 절이나 그 절의 upstream 줄이 없으면 실패한다. 하네스 매니페스트는 기존 `dist` 최신 검사가 잡는다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | `prepare`가 `VERSION`·`package.json`·`dist/` 매니페스트를 새 버전으로 바꾸고, Unreleased를 날짜 붙은 절로 옮기며, upstream 줄을 pin에서 쓴다. 새 빈 Unreleased가 생긴다 | 손으로 적은 upstream 줄, 낡은 매니페스트 | 🔒 e2e `tests/release.test.mjs` |
| A2 | 현재보다 크지 않은 버전, 비어 있는 Unreleased는 거부하고 아무것도 바꾸지 않는다 | 빈 릴리스, 버전 역행 | 🔒 e2e |
| A3 | `notes`가 해당 버전 절의 본문만 출력한다 | Release 본문에 다른 버전이 섞임 | 🔒 e2e |
| A4 | validate가 `package.json`·`VERSION` 불일치, 버전 절 누락, upstream 줄 누락을 보고한다 | 버전이 어긋난 채 머지 | 🔒 `tests/validate.test.mjs` |
| A5 | release 워크플로는 `main` push에서만 돌고, 태그가 없을 때만 태그와 Release를 만든다 | PR에서 태그 생성, 기존 태그 덮기 | 🔒 contract `tests/release-workflow.test.mjs` |
| A6 | `v0.1.0` 태그와 GitHub Release가 생기고, 본문에 upstream 줄이 있다 | 태그 없는 릴리스 | 📎 머지 뒤 `gh release view v0.1.0` |

## 범위 밖

- 하네스 설치본의 버전 갱신 동작 확인(Claude Code `plugin update`, Codex 재설치). Tier 2 설치 스모크(M5-3)에서 본다.
- 공개 배포. 저장소는 비공개로 유지한다.

## 남은 위험

- 태그 생성 권한: 현재 ruleset(`main-protection`)은 브랜치만 대상으로 한다. 태그 ruleset이 생기면 release 워크플로가 실패할 수 있다. 실패는 Actions에 드러나고, 그때 `ORCSTACK_SYNC_TOKEN`처럼 별도 토큰을 쓴다.
