# Brief: opencode 설치와 하네스별 install (M3-10 2단계)

- SSOT: §3, §4 F1 F4
- 작업 항목: M4-3, M3-10
- 날짜: 2026-11-06

- 결정: [ADR-0007](../adr/0007-harness-install.md)

## 무엇을, 왜

opencode 사용자가 orcstack을 쓰게 하고, 네 하네스의 설치 단계를 `tools/orcstack.mjs install`로 모은다.

- **opencode 설치:** 매니페스트가 없어서, opencode 전용 skill 디렉터리에 orcstack 체크아웃의 `dist/opencode/skills`로 가는 링크 하나를 둔다.
- **`.agents/skills/`는 쓰지 않는다:** Codex·omp도 이 디렉터리를 읽기 때문이다.
- **나머지 세 하네스:** 사람의 사용자 설정을 바꾸는 CLI라 명령만 보여 준다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | `install --harness opencode`가 링크 계획을 내고, `--apply`일 때만 만들며, 다시 실행해도 그대로다 | 묻지 않고 사용자 설정 변경 | 🔒 unit(`tests/orcstack-cli.test.mjs`, red 먼저) |
| A2 | 다른 곳을 가리키는 링크는 덮지 않고, `orc-mode`가 다른 경로에 또 있으면 경고한다 | 기존 설정 파괴, `orc-mode` 두 벌 | 🔒 unit |
| A3 | Claude Code·Codex·omp는 명령만 보여 주고 실행하지 않는다 | 에이전트가 전역 설정 변경 | 🔒 unit |
| A4 | 링크 하나로 opencode가 orcstack skill 60개를 보고, `orc-mode`는 한 벌이다 | 중복, 누락 | 📎 `opencode debug skill`: 15 → 75개, `orc-mode` 1개 |
| A5 | `AGENTS.md` 블록만으로 opencode가 `orc-mode`에 진입한다 | 라우팅 없음 | 📎 세션 기록(아래) |

## 설치·세션 기록 (2026-11-06, opencode 1.18.25, `opencode/glm-5.3-flash-free`)

사용자 설정 대신 scratch `XDG_CONFIG_HOME`에서 `install --harness opencode --apply`로 링크를 만들었다. adopt-orcstack `scaffold`로 만든 저장소에 "장바구니 총액이 항상 1원 적게 나온다. 고쳐줘."를 `opencode run`으로 맡겼다.

- `skill` 도구로 `orc-mode`를 불러왔다.
- 원인을 찾아 고쳤고, 실행해서 확인했다.
- brief를 쓰고, 테스트 러너가 없어 영구 guard를 두지 못한 이유를 남은 위험에 적었다.
- 게이트 스크립트(`adopt.mjs detect`, `extensions.mjs resolve`)는 실행하지 않았다. 비어 있는 SSOT에 대한 소유자 승인도 묻지 않았다.

## 범위 밖

- 프로젝트별 skill 복사 설치: ADR-0007에서 버렸다.

## 남은 위험

- **게이트 이행이 모델에 따라 다르다.** 같은 요청에서 Claude Code(sonnet), Codex(기본 모델), omp(사용자 기본 모델)는 게이트 스크립트를 돌리고 SSOT 승인에서 멈췄다. opencode의 무료 경량 모델은 둘 다 건너뛰었다.
  - 이것은 하네스보다 모델 차이로 보인다. 같은 모델로 하네스끼리 비교한 것은 아니다.
  - opencode에서 orcstack을 쓸 때는 강한 모델을 권장한다고 설치 문서(M4-4)에 적는다.
  - 게이트를 지키는지는 Tier 2 nightly(M5-3)에서 하네스별로 반복 확인한다.
