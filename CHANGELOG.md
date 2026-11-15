# Changelog

[Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 형식을 따르고, 버전은 [SemVer](https://semver.org/lang/ko/)를 쓴다. 릴리스마다 기준 upstream을 `upstream: pstack <버전> (<커밋>)`으로 함께 적는다.

## [Unreleased]

### Bootstrap

- dstack 0.1.1 기준으로 개인 프로젝트용 orcstack을 구성했다. `orc-mode` 진입점과 제공 PNG를 사용한다.
- 두 플러그인 공존 시 선택을 요청하는 훅, 프로젝트 선택 파일, 세션 실행기를 추가했다.
- 회사 기록과 자산을 보존하는 dstack 변경 묶음 내보내기와 적용 확인을 추가했다.

아래 기존 항목과 0.1.1 이하 이력은 참조 dstack에서 가져온 기록이다. orcstack 게시나 실제 설치 실측을 뜻하지 않는다.

### Added

- **orcstack 활용하기 가이드:** `docs/guides/using-orcstack.md`. 도입 뒤 매일 쓰는 법과 문제 해결(M5-8).
- **README 빠른 시작:** 설치, preflight 점검, 전환, verify, 갱신 뒤 `adopt guard`까지의 순서와 preflight가 묻는 결정 표(M5-7).

## [0.1.1] - 2026-11-06

upstream: pstack 0.15.36 (`c742dd6`)

### Fixed

- **orc-mode:** SSOT 없는 저장소에서 게이트 뒤 playbook을 건너뛰던 문제. 코드나 문서를 바꾸는 작업은 playbook 단계를 할 일 목록에 옮긴 뒤 시작한다(M5-5).
- **adopt-orcstack:** `.claude/worktrees/` 같은 하위 git 작업 트리·서브모듈·중첩 clone의 파일을 대상 저장소 산출물로 세던 문제. 이제 읽지 않고 `detect`의 `nested`로 보고한다(M5-6).
- **preflight:** upstream pi(`.pi/`)를 지원 하네스처럼 보고하던 문제. `unsupportedHarnesses`와 `pi-harness` 결정으로 보고한다(SSOT §5, M5-6).

### Changed

- **guard 워크플로:** push는 기본 브랜치에서만 돈다. PR 브랜치에서 두 번 돌지 않는다. 기본 브랜치는 `adopt guard`가 `--branch` → `origin/HEAD` → `main` 순서로 정한다. 설치한 저장소는 `adopt guard`를 다시 실행하면 반영된다(M5-6).

## [0.1.0] - 2026-11-06

upstream: pstack 0.15.36 (`c742dd6`)

### Added

- **orc-mode 라우팅:** 작업을 받으면 유형(버그 수정, 기능, 리팩터링 등)에 맞는 playbook을 할 일 목록으로 연다. pstack `poteto-mode`를 orcstack용으로 옮겼다.
  - 게이트: 다른 워크플로 프레임워크(SDD, Spec Kit, Superpowers, pstack 라우터)가 섞여 있으면 멈춘다.
  - 정책: Planning SSOT에서 출발하고, 변경마다 brief를 쓰고, 오래 갈 결정은 ADR로 남긴다. 버그는 같은 표면에서 red를 본 뒤 고치고, 회귀 guard를 가장 낮은 안정 계층에 둔다(검증·기록 reference).
- **하네스 배포본 네 개:** Claude Code(SessionStart 훅), Codex(`AGENTS.md` 라우팅, 신뢰 승인 뒤 훅), oh-my-pi(`orcstack-omp`), opencode(skill 디렉터리 링크). 같은 원본을 하네스별 도구 이름으로 빌드한다(ADR-0003).
- **마켓플레이스:** `.claude-plugin/marketplace.json`(Claude Code, oh-my-pi), `.agents/plugins/marketplace.json`(Codex).
- **orcstack skill:** `adopt-orcstack`, `work-brief`, `adr`, `contract-inventory`, `cold-start-review`, `ci-tiers`, `test-audit`.
- **프로젝트 전환:**
  - `adopt-orcstack`: 기존 프레임워크 문서를 `docs/archive/`에 동결하고, 제품 의도를 SSOT로 옮기고, `AGENTS.md`의 orcstack 블록과 CI guard를 만든다.
  - 기존 기록 체계 채택: `.orcstack/config.json`의 `records`(ADR-0005).
  - git이 무시하는 문서는 옮기거나 세지 않는다.
  - 컷오버 brief와 되돌리기 기록을 남긴다.
- **에이전트용 전환 진입점:** `ADOPTING.md`와 `tools/orcstack.mjs`(`preflight`, `adopt`, `verify`, `install`)(ADR-0006, ADR-0007).
- **프로젝트 확장 지점:** 프로젝트가 `.orcstack/config.json`으로 orcstack playbook·skill을 끄고, 확장·대체하고, 전용 playbook을 더한다(ADR-0004).
- **모범 `AGENTS.md`:** orcstack 블록 계약(30줄 이하, 라우팅·기록 위치·검증 명령·금지 사항)과 가이드. 블록과 충돌하는 기존 줄을 `scaffold`가 보고한다.
- **upstream 파생과 sync:**
  - `tools/derive.mjs`·`tools/sync.mjs`: 결정적 파생과 3-way sync. fork는 `sync/forks.json`에 이유와 함께 둔다.
  - 주간 sync Action: 바뀐 것이 있으면 PR을 연다. 충돌을 푼 뒤에는 `sync.mjs --resolved`로 pin을 옮긴다.
- **릴리스:** `tools/release.mjs`(`prepare`, `notes`)와, `main`에 `VERSION`이 바뀌면 태그와 GitHub Release를 만드는 워크플로.
- **CI:**
  - Tier 0: 구조 검사(`validate`), 다른 프레임워크 산출물 차단, brief·ADR 입력 게이트, 승인된 ADR 수정 차단, 버전 일치.
  - Tier 1: 전체 테스트.
- **문서:** 사용자 기준 README와 하네스별 세팅, 운영 철학, Planning SSOT, ADR-0001~0007, 하네스 실측 기록, synapse-backend 파일럿 기록, upstream sync 운영 가이드.
