# ADR-0001: 이 저장소의 운영 규칙은 orcstack-governed

- 상태: Accepted
- 날짜: 2026-11-06
- 마일스톤: M1

## 맥락

orcstack은 운영 규칙을 파는 제품이다. 만드는 저장소가 다른 운영 규칙으로 운영되면 제품의 가정을 스스로 검증하지 못한다. 이 저장소를 만든 사람의 환경에는 SDD 계열 플러그인(`sdd-helper`, `tmux-orchestrator`)이 유저 전역으로 켜져 있다.

## 결정

- 이 저장소의 운영 규칙은 **orcstack-governed** 하나다. orcstack이 아직 없는 동안(M0–M2)은 [`AGENTS.md`](../../AGENTS.md)의 규칙을 손으로 지킨다.
- SDD(`sdd-helper`), Spec Kit, Superpowers, `tmux-orchestrator`는 이 저장소에서 쓰지 않는다. 프로젝트 설정(`.claude/settings.json`)에서 `sdd-helper`와 `tmux-orchestrator`를 끈다.
- 신규 저장소라 동결할 이전 문서는 없다. 컷오버 대상이 아니라 처음부터 orcstack-governed로 시작한다.

## 버린 대안

- **SDD로 시작하고 orcstack이 완성되면 전환**: 전환 비용을 스스로 만든다. 또 orcstack의 규칙(SSOT, brief, guard)을 실제로 써 보는 기회를 잃는다.
- **운영 규칙 없이 시작**: 작업 계획만으로 진행하면 결정 기록이 계획 문서에 묻히고, 계획은 마일스톤마다 지워진다.

## 결과

- 변경마다 SSOT 절을 참조하는 brief를 쓴다. M0 스파이크 결과는 brief 없이 문서로 남겼고, M1부터 적용한다.
- 유저 전역 플러그인이 다시 켜져도 이 저장소에서는 꺼져 있다. 새 세션에서 두 플러그인의 skill이 목록에 없는지로 확인한다.

## 재검토 조건

- orcstack이 이 저장소 자신에 `adopt-orcstack`을 적용할 수 있게 되면(M3), 손으로 지키던 규칙을 orcstack skill로 대체하고 이 ADR을 갱신하는 새 ADR을 쓴다.
