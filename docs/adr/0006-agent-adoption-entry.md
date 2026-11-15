# ADR-0006: 에이전트용 전환 진입점은 `ADOPTING.md`와 `tools/orcstack.mjs`다

- 상태: Accepted
- 날짜: 2026-11-06
- 마일스톤: M3
- 근거: [작업 계획 M3-10](../work-plan.md), [synapse-backend 파일럿](../spikes/m3-7-pilot-synapse-backend.md)

## 맥락

지금까지 컷오버는 orcstack 플러그인을 설치한 세션에서 `/adopt-orcstack`을 부르는 방식이었다. 하지만 실제 도입은 다른 순서로 시작하는 경우가 많다. 에이전트에게 orcstack 저장소를 주고 "이 프로젝트를 정리해서 orcstack으로 옮겨라"라고 맡긴다. 이때 에이전트는 다음 둘을 알아야 한다.

- 무엇을 어떤 순서로 읽을지
- 어디서 멈추고 사람에게 물을지

파일럿에서 본 실패도 대부분 이 둘에서 나왔다.

- 기존 기록 체계를 모르고 새로 만들었다(P1).
- 다른 라우터를 놓쳤다(P2).
- 개인 문서를 커밋할 뻔했다(P3).
- 승인 대상인 라우팅 줄 교체의 경계가 흐렸다.

## 결정

1. **진입점은 orcstack 저장소 루트의 `ADOPTING.md` 하나다.** 에이전트용 문서이며, 사람용 README(M4-4)와 나눈다. 단계, 명령, 승인 지점만 적고, 절차 본문은 `adopt-orcstack` skill(`dist/<harness>/skills/adopt-orcstack/SKILL.md`)을 가리킨다. 본문을 두 곳에 쓰지 않는다.
2. **결정적인 단계는 `tools/orcstack.mjs`가 맡는다.** 대상 저장소는 `--target`으로 받는다. 이 CLI는 skill 스크립트를 다시 구현하지 않고 부른다.
   - `preflight`: git 상태, 하네스 흔적, 이미 orcstack-governed인지, 프레임워크 산출물(무시된 문서 포함), 기존 기록 체계를 보고한다. 이어서 **사람이 정할 것** 목록을 낸다.
   - `adopt <detect|records|freeze|disable|scaffold|guard>`: `adopt-orcstack` 스크립트를 대상에 실행한다.
   - `verify`: 컷오버 결과를 점검표로 판정한다.
3. **판단은 skill과 사람이 한다.** 의도 이전, 라우팅 줄 교체, 상충 해소, SSOT·ADR 승인이 여기에 든다. `preflight`가 낸 결정 목록은 컷오버 PR을 열기 전에 모두 답이 있어야 한다.
4. **하네스별 설치(`install`)는 2단계다.** M4-2·M4-3에서 oh-my-pi·opencode 설치 경로가 정해진 뒤에 더한다. 1단계에서는 `ADOPTING.md`가 하네스별 설치 명령을 안내한다.

## 버린 대안

- **README에 섞어 쓰기**: 사람과 에이전트에게 필요한 내용이 다르다. 사람에게는 무엇인지와 왜인지가, 에이전트에게는 순서와 멈출 곳이 필요하다. 섞으면 둘 다 길어진다.
- **`ADOPTING.md`에 절차를 모두 쓰기**: skill과 두 벌이 되어 어긋난다. 파일럿 결함을 고칠 때마다 두 곳을 고쳐야 한다.
- **CLI가 판단까지 하기**(예: SSOT 후보 자동 선택): 파일럿에서 SSOT 후보, 라우팅 교체, 마일스톤 경계는 모두 사람이 정할 일이었다.

## 결과

- 🔒 `tests/orcstack-cli.test.mjs`: `preflight` 결정 목록, `adopt` 위임, `verify` 판정.
- 📎 synapse-backend 복사본에서 플러그인 없이 `ADOPTING.md`만 주고 전환한 세션 기록.
- 하네스 설치 경로가 정해지면 `install`을 더하고 이 ADR의 4번을 갱신하는 새 ADR을 쓴다.

## 재검토 조건

- 에이전트가 `ADOPTING.md`만으로 skill을 찾지 못하거나 승인 지점을 건너뛰는 일이 두 번 이상 나오면, 진입점 구조를 다시 본다.
- `preflight`의 결정 목록에 없는 사람 결정이 파일럿에서 두 번 이상 나오면, 목록 규칙을 넓힌다.
