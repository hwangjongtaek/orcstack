# orcstack Planning SSOT

- 소유자: orcstack maintainer
- 최종 변경: 2026-11-15. §8 bootstrap 의도 추가
- 변경 규칙: 의도가 바뀌면 구현 전에 이 문서를 먼저 고치고 소유자 승인을 받는다. brief는 이 문서의 절 번호(`SSOT §n`)를 참조한다.

## §1 목적

orcstack 엔지니어가 AI 코딩 에이전트와 일할 때 **하나의 운영 규칙**으로 작업을 시작하고, 제품 의도부터 구현·검증·결정 기록까지 끊기지 않게 한다.

- 빠르게 많이 만드는 것보다, 합의한 동작이 조용히 퇴행하지 않고 결정의 이유가 남는 것을 우선한다.
- 판단 기준은 [`docs/philosophy.md`](../philosophy.md)다.

## §2 사용자

| 사용자 | 필요 |
|---|---|
| orcstack 엔지니어 | 버그 수정·기능·리팩터링 등 작업 유형에 맞는 절차를 에이전트가 따르게 하기 |
| 저장소 소유자 | 다른 워크플로 프레임워크에서 orcstack으로 마일스톤 경계에서 전환하기 |
| 리뷰어·후속 담당자 | 구현에 참여하지 않고도 저장소·이슈·PR만으로 변경의 이유와 증거를 복원하기(cold-start) |

## §3 지원 하네스

Claude Code, Codex, oh-my-pi, opencode를 1급으로 지원한다. Cursor 전용 기능에 의존하지 않는다.

- 하네스별 설치·호출·라우팅은 [boilerplate-plan 6절](../boilerplate-plan.md#6-하네스별-제공-방식)을 따른다.
- 하네스에 없는 능력은 건너뛰지 않고 선언된 대체 경로로 내려간다.

## §4 기능 범위

| ID | 기능 | 성공 신호 |
|---|---|---|
| F1 | `orc-mode` 단일 진입점과 playbook 라우팅 | 네 하네스에서 작업 유형에 맞는 playbook이 선택된다 |
| F2 | upstream pstack 주기 수용 | upstream 갱신이 sync PR로 들어오고, rename·Cursor 제거가 결정적으로 적용된다 |
| F3 | Dama 철학 skill: work brief, ADR, CI tier, test audit, cold-start review, contract inventory | 각 skill이 orcstack 산출물 사슬(SSOT → brief → 코드 + 증거, ADR, guard)을 만든다 |
| F4 | `adopt-orcstack` 컷오버 | SDD·Spec Kit·Superpowers를 쓰던 저장소가 마일스톤 경계에서 전환되고, 재유입이 Tier 0에서 막힌다 |
| F5 | 오크 화자와 포팅 출처 명시 | 사용자 노출 문구가 오크 화자이고, pstack과 Lauren Tan 출처가 항상 남는다 |
| F6 | 프로젝트별 선별 사용과 확장 | 프로젝트가 orcstack 플러그인을 고치지 않고 맞지 않는 skill·playbook을 끄거나, 특정 항목을 자기 규칙으로 확장·대체하거나, 프로젝트 전용 playbook을 더할 수 있다. orcstack을 갱신해도 그 설정이 유지된다 |

## §5 비목표

- pstack의 모든 기능을 복제하지 않는다. 제외 목록은 boilerplate-plan 3절.
- SDD·Spec Kit·Superpowers와 함께 쓰는 보완재가 되지 않는다.
- Cursor를 지원 대상으로 두지 않는다.
- upstream pi(oh-my-pi 이전 버전)를 지원하지 않는다.
- upstream skill 스크립트를 node로 옮기거나 fork하지 않는다.

## §6 지켜야 할 계약

| ID | 계약 | 실패 비용 |
|---|---|---|
| C1 | 배포본(`dist/`)에 Cursor·poteto 토큰이 없다(출처 고지 allowlist와, 다른 라우터로서 "pstack's `poteto-mode`"를 지칭하는 줄 제외) | 사용자가 없는 도구를 호출하거나 Cursor 전제를 따른다 |
| C2 | upstream 출처 고지(LICENSE, NOTICE, 매니페스트 문구)가 남는다 | MIT 위반 |
| C3 | 파생은 결정적이다. 같은 upstream 커밋과 설정이면 같은 `src/`가 나온다 | sync PR이 매번 노이즈로 가득 차 리뷰가 불가능해진다 |
| C4 | 의도적 분기는 모두 `sync/forks.json`에 이유와 함께 있다 | upstream 갱신 때 분기가 조용히 덮이거나 drift가 쌓인다 |
| C5 | orcstack-governed 저장소에 다른 프레임워크 산출물이 새로 생기지 않는다 | 진실의 원천이 둘이 된다 |
| C6 | `dist/`는 `src/` × `harness/`의 빌드 결과와 항상 같다 | 설치본이 소스와 다르게 동작한다 |
| C7 | 프로젝트의 확장·대체·비활성화 설정은 orcstack 갱신으로 덮이지 않고, 끈 항목은 라우팅되지 않는다 | 갱신할 때마다 프로젝트 맞춤이 사라지거나, 맞지 않는 playbook이 다시 실행된다 |

## §7 결정 기록

결정은 [`docs/adr/`](../adr/)에 있다. 현재 유효한 결정:

- [ADR-0001](../adr/0001-orcstack-governed.md): 이 저장소의 운영 규칙은 orcstack-governed
- [ADR-0002](../adr/0002-m0-decisions.md): M0 스파이크 결과에 따른 결정 D1–D10
- [ADR-0003](../adr/0003-neutral-capability-tokens.md): 정본은 `{{capability}}` 토큰, 배포본은 하네스별 렌더링

## §8 개인 프로젝트 정본과 독립 배포

이 절은 저장소 소유자의 2026-11-15 bootstrap 요청을 기록한다.

- orcstack은 개인 프로젝트에서 사용하고 주 개발 저장소로 유지한다. Datamaker 프로젝트는 dstack을 사용한다.
- dstack 0.1.1에서 가져온 구조와 네 하네스 지원, pstack MIT 고지를 보존한다. 기존 문서의 M0부터 M5까지는 참조본의 기록이며 orcstack에서 재실행한 증거가 아니다.
- 마스코트는 사용자가 제공한 `assets/side_cropped.png` 원본을 사용한다.
- 두 플러그인이 함께 설치되어 선택이 없으면 사용자에게 운영할 플러그인을 묻고 라우팅을 시작하지 않는다. 프로젝트 선택 파일과 환경 변수로 선택을 명시한다.
- orcstack 진입점은 `orc-mode`다. 공통 이름의 skill도 반드시 선택된 패키지 안에서 읽는다.
- 공유 변경은 orcstack에서 dstack 명칭으로 변환한 변경 묶음으로 전달한다. dstack에는 orcstack 이름, 링크, remote, 자동 수신 설정을 넣지 않는다. dstack의 회사 문서, 자산, 소유권 설정과 별도 수정은 보존한다.
- 내보내기는 대상 저장소를 수정하지 않는다. 출력 전체를 검사하며 검토와 적용은 별도 단계다.
