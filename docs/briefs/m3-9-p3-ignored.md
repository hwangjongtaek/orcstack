# Brief: git이 무시하는 프레임워크 문서는 옮기지도 세지도 않는다

- SSOT: §6 C5, §4 F4
- 작업 항목: M3-9 P3
- 날짜: 2026-11-06

## 무엇을, 왜

synapse-backend 파일럿에서 `specs/`가 gitignore돼 있고, 실제 SDD 문서는 개발자 로컬에만 수십 개씩 있다는 것을 확인했다([파일럿](../spikes/m3-7-pilot-synapse-backend.md) P3). `detect`·`freeze`·`guard`는 파일 시스템을 훑어서 이 문서까지 잡았다. 그래서 작업 사본에서 컷오버하면 `freeze`가 이 문서들을 `docs/archive/`로 옮기고, 개인 기록이 컷오버 PR에 커밋된다.

`signals.mjs`에 `splitIgnored`를 더했다. git이 무시하는 산출물을 따로 나눈다(`git check-ignore`, 이미 추적 중인 파일은 무시로 보지 않는다).

- `detect`는 `ignored`로 따로 보고한다.
- `freeze`는 옮기지 않고 `leftIgnored`로 보고한다.
- 설치된 guard는 세지 않는다.

추적되지 않았지만 무시 대상도 아닌 새 파일은 커밋될 수 있으므로 계속 잡는다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | `detect`가 추적되는 문서와 무시되는 문서를 나눈다 | 무시된 개인 문서를 컷오버 대상으로 보고 | 🔒 unit(`tests/adopt.test.mjs`, red 먼저) |
| A2 | `freeze`는 추적되는 문서만 옮기고, 무시된 문서는 제자리에 두고 보고한다 | 개인 문서가 `docs/archive/`로 옮겨져 커밋됨 | 🔒 unit |
| A3 | 설치된 guard가 무시된 로컬 문서 때문에 실패하지 않는다 | 개발자 로컬에서 guard가 늘 실패 | 🔒 unit |
| A4 | 이미 추적 중인 문서는 gitignore 패턴에 맞아도 추적 문서로 다룬다 | 공유 문서를 놓침 | 🔒 unit(A1 fixture가 `git add -f`한 문서) |

## 범위 밖

- 무시된 문서에서 의도를 옮기는 판단: `adopt-orcstack` 3단계 본문에 적었다.

## 남은 위험

- git이 없는 디렉터리에서는 무시 판단을 하지 않고 모두 추적 대상으로 본다.
