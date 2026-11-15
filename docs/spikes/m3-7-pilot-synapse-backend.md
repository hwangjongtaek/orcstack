# M3-7 파일럿: synapse-backend 복사본 컷오버

- 날짜: 2026-11-06
- 대상: `datamaker-kr/synapse-backend` `main` `b0a4f11`. GitHub에서 scratch 디렉터리로 새로 받은 얕은 복사본(depth 50)이다. 원본과 개발자 작업 사본은 건드리지 않았고, 복사본은 push URL을 막았다.
- 실행: Claude Code 2.1.318, sonnet, `--plugin-dir dist/claude-code`, `/orcstack:adopt-orcstack`. 비대화형이라 확인 질문 대신 스스로 판단하고, 소유자 승인이 필요한 항목은 제안으로 남기라고 지시했다. 마일스톤은 2026-12, 커밋은 하지 않았다. 비용 $0.48, 도구 23회.
- cold-start 확인: 작업에 참여하지 않은 읽기 전용 검토자에게 저장소 경로와 다섯 질문만 주었다.

## 저장소 상태

- 실제 운영 규칙은 SDD(`sdd-helper`)였다. `specs/`는 gitignore돼 있어 SDD 문서 대부분이 개발자 로컬에만 있다. 로컬 사본 두 곳에서 세어 보니 각각 68개, 55개였다.
- 2026-11-05~06에 pstack 전환 **준비**가 들어왔다. `docs/product/README.md` SSOT 초안, `docs/operating-rule.md`, ADR-078, `AGENTS.md`의 `poteto-mode` 라우팅, Tier 0, test-rent PR들이다. 운영 규칙으로 자리 잡기 전이다.
- 기록 체계는 이미 있다. ADR 78개(3자리 번호, 영어 제목 규칙, README 색인), `docs/briefs/`(기본은 PR 본문), `docs/featuremap/`, `docs/system-architecture/`. `AGENTS.md`는 427줄의 의도 원장이다.

## 컷오버 결과

| 단계 | 결과 |
|---|---|
| detect | 커밋된 SDD 문서 3개(`specs/syn-6806-*/`)를 찾았다. 끝난 뒤 다시 돌린 detect는 0건이었다 |
| freeze | 3개를 `docs/archive/sdd/`로 옮기고 FROZEN 헤더를 붙였다. 원본과 비교하면 헤더 2줄만 다르다 |
| 의도 이전 | `docs/planning/SSOT.md`에 목적·사용자·기능 F1~F7·비목표·계약 C1~C10을 제안으로 썼다. 근거는 SSOT 초안, `AGENTS.md`, 동결 문서다. 빈 곳은 `(open)`으로 남겼다 |
| disable | `.claude/settings.json`에서 `sdd-helper`, `tmux-orchestrator`를 껐다 |
| scaffold·guard | ADR-0001(Proposed), brief 템플릿, `.orcstack/`, `AGENTS.md` orcstack 블록, `orcstack-guard` 워크플로를 만들었다. guard는 통과했다 |

## cold-start 5문항

| # | 질문 | 답 |
|---|---|---|
| 1 | 사용자 필요와 실패 비용 | **답 없음.** "왜 pstack이 아니라 orcstack인가"가 ADR-0001에 `(open)`이다. 이 변경의 brief가 없다 |
| 2 | 서브시스템과 소유자 | 부분. 서브시스템(저장소 전체 운영 규칙)은 답했다. 소유자는 팀, CODEOWNERS, `(open)`으로 갈렸다 |
| 3 | 버린 대안과 재검토 조건 | 부분. 대안은 있다. 재검토 조건에 임계값이 없고, "pstack 유지"를 버린 이유가 없다 |
| 4 | 영구 guard와 일회성 증거 | guard(`orcstack-guard`)는 답했다. 일회성 증거는 저장소에 남지 않았다 |
| 5 | 되돌리기 범위와 먼저 볼 데이터·계약 | **답 없음.** ADR-0001에 rollback 절이 없다 |

검토자가 찾은 모순:

- 라우터가 둘이다: `poteto-mode`(기존 §0)와 `orc-mode`(새 블록).
- SSOT가 둘이다: `docs/product/`와 `docs/planning/SSOT.md`.
- brief 위치가 PR 본문 기본과 `docs/briefs/` 필수로 갈린다.
- ADR 번호가 3자리 규칙(다음은 079)과 새 `0001`로 갈린다.
- 동결 헤더는 "since 2026-12"인데 guard는 지금부터 막는다.
- 설치 파일이 저장소에 없는 "ADR-0004"(orcstack의 ADR)를 가리킨다.

## orcstack 쪽 개선점

| # | 문제 | 개선 |
|---|---|---|
| P1 ✅ | 기존 기록 체계를 무시하고 SSOT·ADR·brief를 새 경로에 하나 더 만든다 | 프로젝트의 기존 경로와 번호 규칙을 채택한다. `.orcstack/config.json`에 `records`(SSOT 경로, ADR 디렉터리와 번호 자릿수, brief 위치)를 두고, `scaffold`와 `work-brief`·`adr`·`contract-inventory` 스크립트가 이를 따른다. SSOT 절 번호 `## 1.` 형식도 읽는다 |
| P2 ✅ | pstack(`poteto-mode`)도 라우터인데 감지하지 않는다 | pstack 플러그인과 `AGENTS.md`의 `poteto-mode` 라우팅을 다른 라우터로 감지한다. 컷오버는 라우팅 지시를 `orc-mode`로 바꾸는 것이고, pstack 산출물(SSOT, brief, ADR)은 그대로 이어 쓴다 |
| P3 ✅ | gitignore된 SDD 문서를 `docs/archive/`로 옮기면 개인 기록이 컷오버 PR에 커밋된다 | `freeze`는 추적되는 파일만 옮긴다. 무시된 파일은 따로 보고하고, 의도만 SSOT로 옮긴 뒤 로컬에 두거나 지우게 한다 |
| P4 ✅ | 옮긴 경로를 가리키는 참조(CHANGELOG, 기능 문서, Codex agent 설정)가 끊긴다 | `freeze`가 옮긴 경로를 가리키는 참조 목록을 낸다 |
| P5 ✅ | 컷오버 자체의 brief와 rollback 기록이 없어 cold-start 1·5번에 답하지 못한다 | `scaffold`가 컷오버 brief를 만든다. ADR-0001 템플릿에 rollback 절과 재검토 임계값 칸을 둔다 |
| P6 ✅ | 기존 `AGENTS.md`의 상충 지시(`poteto-mode` 라우팅, 다른 SSOT 경로)가 그대로 남는다 | `scaffold`가 orcstack 블록과 충돌하는 줄을 찾아 보고하고, 교체는 소유자 승인 뒤 한다. M4-5 모범 AGENTS.md와 함께 다룬다 |
| P7 ✅ | `tmux-orchestrator`를 끄는 이유가 설명되지 않는다 | SDD 계획을 실행하는 오케스트레이터라서 끈다는 이유를 skill 본문과 guard 메시지에 적는다 |
| P8 ✅ | 설치 파일이 프로젝트에 없는 "ADR-0004"를 가리킨다 | "orcstack ADR-0004"와 링크로 적는다 |
| P9 ✅ | 동결 마일스톤과 guard 시작 시점이 어긋난다 | 헤더는 "frozen on <날짜>, cutover milestone <m>"으로 쓰고, guard는 설치하는 순간부터 막는다고 문서에 적는다 |

## 2차 컷오버 (M3-9 반영 후, 2026-11-06)

같은 복사본을 초기화하고 같은 지시로 다시 실행했다. 비용 $0.43, 도구 21회.

- **P1:** `records`로 `docs/product/README.md`, 기존 ADR 디렉터리, `docs/briefs`를 채택했다. 두 번째 SSOT는 생기지 않았고, 컷오버 ADR은 `079-adopt-orcstack.md`로 기존 번호를 이었다.
- **P2:** `AGENTS.md:99`의 `poteto-mode` 라우팅을 잡았다. 승인 전이라 교체하지 않았고, guard는 의도대로 실패 상태로 남았다.
- **P5:** 컷오버 brief에 why, 교체 전후안, 되돌리기, guard 후보가 채워졌다.

cold-start 5문항(새 검토자):

| # | 1차 | 2차 |
|---|---|---|
| 1 | 답 없음 | 부분. 실패 비용은 답함. 사용자 필요는 SSOT가 소유자 작성 대기 |
| 2 | 부분 | 부분. 서브시스템은 답함. 결정 소유자 이름 없음 |
| 3 | 부분 | 답함. 임계값은 제안값 |
| 4 | 부분 | 답함 |
| 5 | 답 없음 | 답함 |

남은 빈칸(사용자 필요, 결정 소유자)은 소유자가 채울 내용이다. 2차에서 나온 orcstack 쪽 결함은 바로 고쳤다.

- **R1:** 컷오버 ADR의 "이전 운영 규칙"에 pstack이 빠졌다.
- **R2:** ADR 템플릿에 SSOT 경로가 하드코딩돼 있었다.
- **R3:** 에이전트가 `records`를 손으로 쓰다 `version`을 빠뜨렸다. `adopt.mjs records` 명령을 더했다.
- **R4:** 이동 후 비게 된 상위 디렉터리(`specs/`)를 가리키는 참조를 놓쳤다.
- **기타:** 컷오버 brief의 A2를 🔒로 고쳤다. skill 본문에 "저장소의 ADR 관례(템플릿, 상태 형식, 색인)를 따르라", "운영 규칙 문서 등 다른 문서의 옛 규칙도 찾아 교체를 제안하라"를 더했다. `.orcstack/README.md`의 orcstack ADR 참조에 링크를 걸었다.

## 소유자가 정할 일 (orcstack 범위 밖)

- ~~synapse-backend를 pstack이 아니라 orcstack으로 운영할지.~~ **결정(2026-11-06): orcstack으로 운영한다.** 실제 컷오버 때 ADR-078을 대체하는 ADR과 마일스톤 경계를 함께 정한다. 실제 컷오버는 M3-9의 P3·P1·P2·P5를 반영하고 복사본에서 다시 검증한 뒤에 한다.
- 로컬 `specs/`(gitignore)에 있는 SDD 문서에서 SSOT로 옮길 의도.

## 남은 위험

- 비대화형 실행이라, 확인 질문(마일스톤 경계, SSOT 승인)을 실제 사용자와 주고받는 흐름은 보지 못했다.
- 복사본은 얕은 클론이고 로컬 `specs/`가 없다. 실제 작업 사본에서는 P3 때문에 결과가 달라진다.
