# orcstack 프로젝트의 AGENTS.md

Codex, oh-my-pi, opencode에는 세션 시작 훅이 없거나 기본으로 꺼져 있다. 그래서 이 세 하네스에서는 `AGENTS.md`가 orcstack 라우팅의 유일한 경로이고, 이 파일의 품질이 곧 라우팅 품질이다. Claude Code도 훅과 함께 이 파일을 읽는다.

## 구조

| 순서 | 부분 | 누가 쓰나 | 담는 것 |
|---|---|---|---|
| 1 | 프로젝트 소개 | 팀 | 한두 문장. 무엇을 하는 저장소인가 |
| 2 | 하지 않는 것 | 팀 | 일부러 하지 않는 일과 그 이유. 에이전트가 "개선"하려다 되돌리기 쉬운 것 |
| 3 | orcstack 블록 | `adopt-orcstack scaffold` | 라우팅, 기록 위치, 검증 명령, 금지 사항. `<!-- orcstack:begin -->`과 `<!-- orcstack:end -->` 사이 |
| 4 | 아키텍처 포인터 | 팀 | 서브시스템별 책임과 원본 문서 링크. 내용은 링크한 문서에 둔다 |
| 5 | 프로젝트 규칙 | 팀 | 이 저장소만의 규칙. 규칙마다 무엇이 강제하는지(lint, 테스트, 리뷰)를 적는다 |
| 6 | 언어 | 팀 | 코드, 문서, 커밋 메시지의 언어 |

### orcstack 블록

`adopt-orcstack scaffold`가 쓰고 다시 실행하면 갱신한다. 손으로 고치지 않는다. 블록이 담는 것은 다음과 같다.

- **라우팅:** 코드나 문서를 바꾸는 작업 전에 `orc-mode`를 불러온다. `ORCSTACK_AUTO_ACTIVATE=0`이면 끈다.
- **기록 위치:** `.orcstack/config.json`의 `records`가 정한 SSOT, ADR, brief 경로와 각자의 규칙. 프로젝트 확장 위치(`.orcstack/config.json`).
- **검증:** 커밋 빌드를 돌리는 로컬 명령 하나. `package.json`의 `check`·`commit-build`·`verify`·`test`, 또는 `Makefile`의 같은 이름 목표에서 찾는다. 없으면 `ci-tiers` skill을 가리킨다.
- **금지:** 다른 프레임워크 문서와 다른 라우터. 동결 문서 수정. git이 무시하는 프레임워크 문서 커밋.
- **TDD 우선순위:** `tdd-workflow`가 켜져 있으면 orcstack `tdd` skill이 테스트 순서를 정한다는 한 줄.

블록은 30줄 이하로 유지한다. 🔒 `tests/agents-md.test.mjs`가 이 형태를 지킨다.

## 원칙

- **짧게.** 에이전트는 매 세션 이 파일을 읽는다. 긴 설명은 링크한 문서로 보낸다. 파일이 길어지면 규칙이 서로 부딪히기 시작한다.
- **라우터 하나, 원천 하나.** 블록 밖에서 다른 라우터(`poteto-mode` 등)를 부르거나, 다른 SSOT 경로를 말하거나, 다른 운영 규칙(`SDD-governed` 등)을 선언하지 않는다. `scaffold`가 이런 줄을 `agentsConflicts`로 보고한다. 교체는 소유자 승인 뒤에 한다.
- **규칙에는 강제 수단을 붙인다.** "하지 마라"만 있는 규칙은 지켜지지 않는다. lint, 타입, 테스트, CI로 강제할 수 있으면 그렇게 하고, 남는 것은 판단 규칙으로 적는다(`correct` skill의 규칙 표).
- **사실과 결정을 섞지 않는다.** 결정의 이유는 ADR에, 제품 의도는 SSOT에 둔다. `AGENTS.md`는 그곳을 가리킨다.

## 예시

```markdown
# Synapse Backend

Django 기반 데이터 중심 머신러닝 워크플로 백엔드. 데이터 수집, 어노테이션, 모델 분석을 맡는다.

## 하지 않는 것

- 같은 변경에 두 운영 규칙을 쓰지 않는다. 이유: docs/adr/079-adopt-orcstack.md
- 뷰에서 직접 ORM 쿼리를 조립하지 않는다. 서비스 계층을 거친다. 강제: lint 규칙 `no-orm-in-views`

<!-- orcstack:begin -->
...adopt-orcstack scaffold가 쓴 블록...
<!-- orcstack:end -->

## 아키텍처

| 서브시스템 | 책임 | 원본 |
|---|---|---|
| v2 API | SDK·CLI·에이전트용 공개 API | docs/system-architecture/v2-api.md |

## 프로젝트 규칙

| 규칙 | 강제 |
|---|---|
| 마이그레이션은 되돌릴 수 있어야 한다 | CI `migration-check` |

## 언어

코드 주석과 커밋 메시지는 한국어, 공개 API 문서는 영어.
```

## 기존 AGENTS.md와 합치기

- orcstack은 표식 사이만 쓰고, 나머지는 그대로 둔다. 블록이 없으면 파일 끝에 붙인다.
- 기존 파일이 길면(수백 줄), 컷오버 PR에서는 블록만 넣고 충돌 줄 교체를 제안한다. 구조 정리는 별도 PR로 한다.
