# Brief: synapse-backend 적용 피드백 B1~B3

- SSOT: §3(지원 하네스), §5(upstream pi 비목표), §6 C5
- 작업 항목: M5-6
- 날짜: 2026-11-06

## 무엇을, 왜

synapse-backend 소유자가 orcstack을 직접 설치하면서 세 가지를 전했다(work-plan M5-6).

- **B1:** preflight와 guard가 `.claude/worktrees/` 같은 하위 git 작업 트리를 대상 저장소의 파일로 읽는다. 그래서 다른 브랜치의 SDD 문서가 대상 저장소의 산출물이나 `ignored-docs` 결정에 섞인다.
  - 고침: `.git`(파일이든 디렉터리든)을 가진 하위 디렉터리는 다른 저장소다. worktree, 서브모듈, 중첩 clone이 여기에 든다. 읽지 않고 `detect`의 `nested`로 보고한다.
- **B2:** preflight가 `.pi`를 하네스로 보고해 orcstack이 pi를 지원하는 것처럼 보인다.
  - SSOT §5 비목표("upstream pi를 지원하지 않는다")를 그대로 둔다. SSOT를 바꾸지 않는다.
  - preflight는 `.pi`를 `harnesses`에서 빼고 `unsupportedHarnesses`로 보고한다. oh-my-pi로 옮길지는 사람이 정하므로 `pi-harness` 결정으로 묻는다.
- **B3:** 설치되는 `orcstack-guard.yml`이 모든 브랜치의 push와 PR에서 돌아, PR 브랜치에서는 두 번 돈다.
  - 고침: push를 기본 브랜치로 한정한다. `adopt guard`가 기본 브랜치를 정하는 순서는 `--branch`, 다음이 `origin/HEAD`, 둘 다 없으면 `main`이다. 출처는 `defaultBranch.source`로 보고한다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | `detect`·`freeze`·설치된 guard가 하위 git 작업 트리 안의 파일을 읽지 않는다. `detect`는 그 경로를 `nested`로 보고한다 | worktree의 SDD 문서가 대상 산출물·`ignored-docs`·guard 실패에 섞임 | 🔒 `tests/adopt.test.mjs` |
| A2 | preflight가 `.pi`를 `harnesses`에 넣지 않고, `unsupportedHarnesses`와 `pi-harness` 결정으로 보고한다 | pi 지원처럼 보이는 출력 | 🔒 `tests/orcstack-cli.test.mjs` |
| A3 | 설치된 guard 워크플로의 push가 기본 브랜치로만 돈다. 기본 브랜치는 `--branch` → `origin/HEAD` → `main` 순서로 정하고, 출처를 보고한다 | 모든 브랜치 push에서 실행 | 🔒 `tests/adopt.test.mjs` |
| A4 | 이미 guard를 설치한 저장소는 `adopt guard`를 다시 실행하면 새 워크플로를 받는다 | 수동 편집 안내만 | 📎 adopt-orcstack SKILL.md 안내 |

## 범위 밖

- upstream pi 배포본. 필요해지면 SSOT §5부터 고친다.
- synapse-backend에 반영하는 일. 소유자가 직접 한다.

## 남은 위험

- `origin/HEAD`가 없는 clone(`git remote set-head`를 하지 않은 경우)은 `main`으로 가정한다. 출력의 `defaultBranch.source`가 `fallback`이면 사람이 확인한다.
