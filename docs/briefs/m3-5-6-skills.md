# Brief: 지식·검증·CI skill 여섯 개

- SSOT: §4 F3, §4 F1
- 작업 항목: M3-5, M3-6
- 날짜: 2026-11-06

## 무엇을, 왜

철학 §2·§3·§4의 산출물 사슬(SSOT → brief → 코드와 증거, ADR, guard)을 실제로 만드는 skill이 없었다. M3-3·M3-4는 규칙만 reference로 넣었다. 이번에 그 규칙을 실행하는 skill 여섯 개를 더한다. 판단은 skill 본문에, 결정적인 부분(번호, 형식 검사, 수집, 워크플로 생성)은 스크립트에 둔다.

| skill | 판단 (본문) | 결정적 부분 (스크립트) |
|---|---|---|
| `work-brief` | SSOT 절 고르기, acceptance 작성 | `brief.mjs new`, `check`(SSOT 절·ID 존재, acceptance 행마다 🔒/📎) |
| `adr` | ADR이 필요한지, 대안과 재검토 조건 | `adr.mjs new`(다음 번호), `supersede`, `check --base`(승인된 ADR 수정 금지) |
| `contract-inventory` | 화면에 안 드러나는 후보 계약, 빈칸의 우선순위 | `inventory.mjs collect`(SSOT 계약 행과 이를 이름으로 가리키는 brief·ADR·테스트, guard 없는 계약) |
| `cold-start-review` | 맥락 없는 검토자가 다섯 질문에 인용으로 답하고, 빈칸을 orcstack 기록으로 채운다 | 없음 |
| `ci-tiers` | 계층별 로컬 명령 하나, 일부러 red를 만들어 게이트 확인 | `ci-tiers.mjs write`(Tier 0·1·2 GitHub Actions, 하네스 무관) |
| `test-audit` | 여섯 질문, 일부러 깨 보기, keep·move·rewrite·delete | 없음 |

`orc-mode`가 상황별로 여섯 skill로 라우팅하고, `orc-help` 표에 여섯 skill과 `adopt-orcstack`을 더했다.

이 저장소에도 적용했다.

- Tier 0에 입력 게이트(`npm run input-gate`: brief·ADR 검사)를 넣었다. PR에서는 승인된 ADR 수정을 막는다.
- inventory가 찾은 guard 미연결 계약 C5·C6·C7은 이미 테스트로 지켜지고 있었다. 그 테스트 머리 주석에 계약 ID를 적어 연결했다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | `brief check`가 없는 SSOT 절·ID, 증거 표시 없는 행, acceptance 없는 brief를 잡는다 | 입력 게이트 통과 누락 | 🔒 unit(`tests/knowledge-skills.test.mjs`, red 먼저) |
| A2 | `adr new`가 다음 번호를 쓰고, `supersede`는 상태 줄만 바꾸고, `check --base`는 승인된 ADR의 본문 수정·삭제를 잡는다 | 승인된 ADR 덮어쓰기 | 🔒 unit |
| A3 | `inventory collect`가 계약 행과 참조를 모으고, guard 없는 계약만 빈칸으로 낸다 | node_modules 등 잡음, 오탐 | 🔒 unit |
| A4 | `ci-tiers write`가 계층별 트리거·예산·명령을 쓰고, 기존 워크플로는 `--force` 없이 건드리지 않는다 | 팀 워크플로 덮어쓰기 | 🔒 unit(`tests/ci-tiers.test.mjs`) |
| A5 | 이 저장소의 brief 16개와 ADR 4개가 검사를 통과하고, Tier 0이 같은 검사를 돈다 | 자기 규칙 미준수 | 🔒 Tier 0 `input-gate` |
| A6 | 판단 단계(cold-start 검토, test audit의 일부러 깨 보기)가 실제 세션에서 동작한다 | 본문만 있고 실행되지 않음 | 📎 M3-7 파일럿에서 확인 |

## 범위 밖

- 프로젝트의 `orcstack-guard` CI에 입력 게이트를 넣는 일: M3-7 템플릿 작업에서 `adopt-orcstack guard`와 함께 정한다.
- Feature Map 생성: upstream `create-verification-skill`이 맡는다.

## 남은 위험

- inventory는 계약 ID를 이름으로 가리키는 테스트만 찾는다. ID를 적지 않은 guard는 빈칸으로 나온다. skill 본문이 행동을 직접 찾아 확인한 뒤 ID를 적게 한다.
- `cold-start-review`와 `test-audit`에는 스크립트가 없다. 효과는 세션 기록으로만 확인한다.
