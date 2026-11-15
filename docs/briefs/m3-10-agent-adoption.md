# Brief: 에이전트용 전환 진입점과 CLI (1단계)

- SSOT: §4 F4, §6 C5
- 작업 항목: M3-10
- 날짜: 2026-11-06

## 무엇을, 왜

에이전트에게 orcstack 저장소만 주고 "이 프로젝트를 orcstack으로 옮겨라"라고 맡겨도, 플러그인 없이 같은 결과가 나오게 한다. 결정은 [ADR-0006](../adr/0006-agent-adoption-entry.md)에 있다.

- 진입 문서 `ADOPTING.md`(에이전트용, 영어): 단계, 명령, 사람 승인 지점(**Ask**), 금지 사항만 적는다. 절차 본문은 `adopt-orcstack` skill을 가리킨다.
- `tools/orcstack.mjs`:
  - `preflight`: 상태와 사람이 정할 것을 보고한다.
  - `adopt <step>`: skill 스크립트를 대상에 실행한다.
  - `verify`: 컷오버 점검표를 판정한다.
- `work-brief check --file`: 컷오버 brief 하나만 검사한다.

하네스별 설치(`install`)는 2단계(M4-2·M4-3 뒤)다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | `preflight`가 git 상태, 하네스 흔적, orcstack 운영 여부, 결정 목록(작업 트리 변경, 마일스톤 경계, SSOT 선택, 라우팅 줄, 무시된 문서)을 근거와 함께 낸다 | 사람 결정 없이 진행 | 🔒 unit(`tests/orcstack-cli.test.mjs`, red 먼저) |
| A2 | `adopt <step>`이 대상에 skill 스크립트를 실행한다 | 스크립트 이중 구현 | 🔒 unit |
| A3 | `verify`가 컷오버 전에는 실패 항목을 이름으로 내고, 모든 단계와 결정이 끝나야 통과한다 | 라우팅 줄이나 brief SSOT 줄이 남아도 통과 | 🔒 unit |
| A4 | 플러그인 없이 `ADOPTING.md`만 받은 에이전트가 synapse-backend 복사본을 전환하고, 미승인 결정에서 멈춘다 | 승인 지점 건너뜀, skill 못 찾음 | 📎 세션 기록(아래) |
| A5 | 세션이 보고한 F1·F2·F4·F5가 고쳐졌다 | 같은 막힘 반복 | 🔒 unit(`tests/orcstack-cli.test.mjs` 3개, red 먼저) |

## 세션 기록 (2026-11-06, Claude Code 2.1.318, sonnet, 플러그인 없음)

synapse-backend 복사본을 초기화하고 orcstack 저장소 경로와 `ADOPTING.md`만 주었다(`--add-dir`, `--plugin-dir` 없음). Ask 항목의 답은 미리 주었다.

- 답한 것: 마일스톤 2026-12, SSOT `docs/product/README.md`, freeze 승인.
- 승인하지 않은 것: 라우팅 줄 교체.

비용 $0.71, 도구 31회.

- **절차:** `ADOPTING.md` → preflight → 렌더링된 `adopt-orcstack` skill → records → freeze → disable → scaffold → guard → verify 순서를 따랐다.
- **승인 지점:** 승인하지 않은 `AGENTS.md:99` 라우팅 줄은 건드리지 않고, 교체 전후 제안만 컷오버 brief에 남겼다.
- **저장소 관례:** 컷오버 ADR-079를 저장소 ADR 관례(영문 제목, `## Status`)로 쓰고 ADR 색인에 등록했다.
- **verify:** `agents-block`, `cutover-adr`, `cutover-brief`는 통과했다. 라우팅 줄 때문에 `no-framework-artifacts`·`guard`가, 기존 ADR 형식 문제 때문에 `adr-check`가 실패했다.

세션이 보고한 막힌 곳과 고친 것:

| # | 막힌 곳 | 고친 것 |
|---|---|---|
| F1 | 승인 대기 중이면 verify가 구조적으로 통과하지 못하는데 문서에 설명이 없다 | verify가 승인 대기로 실패한 항목에 `awaiting`(예: `routing-lines`)을 붙인다. `ADOPTING.md`에 "우회하지 말고 대기로 보고"를 적었다 |
| F2 | `adr-check`가 컷오버 전 ADR의 형식 문제(번호 중복, `ADR-?` 제목)로 실패한다 | verify는 컷오버 ADR만 판정한다. 기존 문제는 `legacyAdrProblems`로 따로 보고한다. `adr check --file`을 추가했다 |
| F3 | 추적 중인 파일이 `.gitignore` 패턴에 걸려도 무시 대상이 아닌 이유가 문서에 없다 | `ADOPTING.md`에 설명을 적었다 |
| F4 | preflight의 `records`가 기본값인지 설정값인지 알 수 없다 | `records.source`(`default` 또는 `config`)를 낸다 |
| F5 | 끊긴 참조 약 190줄을 처리할 기준이 없다 | 참조마다 `kind`를 붙인다: `history`(changelog, ADR)는 두고 `live`는 고친다 |

## 범위 밖

- `install --harness`: M4-2·M4-3 뒤.
- 사람용 README: M4-4.

## 남은 위험

- `ADOPTING.md`는 에이전트가 읽고 따라야 효과가 있다. 승인 지점을 건너뛰는지는 세션 기록으로만 본다.
