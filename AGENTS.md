# orcstack 저장소 작업 규칙

이 저장소는 **orcstack-governed**로 운영한다([ADR-0001](docs/adr/0001-orcstack-governed.md)). 이 저장소에서 작업하는 에이전트와 사람 모두 아래 규칙을 따른다.

## 기준 문서

| 문서 | 역할 |
|---|---|
| [`docs/planning/SSOT.md`](docs/planning/SSOT.md) | 제품 의도의 단일 원천. 의도가 바뀌면 구현 전에 여기부터 고친다 |
| [`docs/adr/`](docs/adr/) | 오래 가는 결정. 승인된 ADR은 덮어쓰지 않고 새 ADR로 대체한다 |
| [`docs/briefs/`](docs/briefs/) | 변경마다 쓰는 짧은 brief. 참조하는 SSOT 절과 acceptance를 담는다 |
| [`docs/philosophy.md`](docs/philosophy.md) | 판단 기준. 다른 문서와 충돌하면 이 문서가 기준이다 |
| [`docs/work-plan.md`](docs/work-plan.md) | 임시 작업 계획. 영속 기록이 아니다 |

## 라우팅

이 저장소는 `.workflow-stack.json`으로 orcstack을 선택한다. dstack 자동 활성화가 함께 보이면 이 선택을 먼저 확인한다. 코드나 문서를 바꾸는 작업 전에 이 플러그인의 절대 경로로 `orc-mode` skill을 불러와 따른다. 공통 이름의 skill도 같은 패키지 경로에서 읽는다. 질문만 하는 작업은 건너뛴다. 모범 구조는 [AGENTS.md 가이드](docs/guides/agents-md.md)에 있다.

## 작업 순서

1. 변경이 어느 SSOT 절에서 나왔는지 확인한다. 없으면 SSOT부터 고친다.
2. `docs/briefs/`에 brief를 쓴다. acceptance마다 영구 guard인지 일회성 증거인지 적는다.
3. 구현한다. guard를 추가하면 그 guard가 실패하는 상태를 먼저 보인다(red-before-green).
4. `npm run check`가 green인지 확인한다. 로컬과 CI가 같은 명령을 쓴다.
5. PR로 올린다. `main`은 ruleset으로 보호돼 직접 push할 수 없고, `tier0`·`tier1` 통과와 리뷰 대화 해결이 머지 조건이다. 병합은 squash 또는 rebase.
6. 오래 가는 결정이 생겼으면 ADR을 쓴다.

## 금지

- **다른 워크플로 프레임워크를 쓰지 않는다.** SDD(`sdd-helper`), Spec Kit, Superpowers, `tmux-orchestrator`의 산출물(`specs/**/requirements.md`, `.specify/`, `docs/superpowers/` 등)을 만들지 않는다. 이 저장소의 `.claude/settings.json`은 `sdd-helper`와 `tmux-orchestrator`를 끈다.
- **`dist/`를 손으로 고치지 않는다.** `src/`와 `harness/`를 고치고 빌드한다(M1-6 이후).
- **`src/`의 upstream 파생 파일 변경을 기록한다.** 의도적으로 다르게 할 때는 `sync/forks.json`에 이유를 남긴다(M1-5 이후).

## 언어

- skill 본문(`src/skills/**`)은 영어로 쓴다.
- 사람이 읽는 문서(README, `docs/`)와 커밋 메시지는 한국어로 쓴다.

## 도구

- orcstack 도구(`tools/`)는 node 22 이상, 외부 의존성 없이 쓴다. 테스트는 `node --test`.
- upstream skill 스크립트는 upstream대로 bun을 쓴다. 고치지 않는다.
