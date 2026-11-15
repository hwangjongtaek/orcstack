# Brief: Codex 배포본과 마켓플레이스

- SSOT: §3, §4 F1
- 작업 항목: M4-1
- 날짜: 2026-11-06

## 무엇을, 왜

Codex 사용자가 저장소 하나에서 orcstack을 설치하고 `orc-mode`로 라우팅되게 한다. 저장소 루트에 Codex 마켓플레이스(`.agents/plugins/marketplace.json`)를 두고 `./dist/codex`를 가리킨다. 라우팅의 기본 경로는 `AGENTS.md`이고(adopt-orcstack `scaffold`가 블록을 쓴다), SessionStart 훅은 사용자가 한 번 신뢰를 승인한 뒤에만 도는 보조 경로다(ADR-0002 D3, [하네스 실측](../spikes/harness-mapping.md)).

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | Codex 마켓플레이스의 `orcstack` 항목이 `./dist/codex`를 가리키고, 매니페스트 이름과 skill·훅 경로가 실제로 있다. Claude Code 마켓플레이스도 같은 방식으로 검사한다 | 설치는 되는데 빈 플러그인, 없는 훅 경로 | 🔒 unit(`tests/marketplaces.test.mjs`, Codex 쪽 red 먼저) |
| A2 | `codex plugin marketplace add <repo>` → `codex plugin add orcstack@orcstack`로 설치된다 | 설치 실패 | 📎 scratch `CODEX_HOME` 설치 기록(아래) |
| A3 | 훅을 신뢰하기 전에도 `AGENTS.md`만으로 `orc-mode`가 진입한다 | 라우팅 없음 | 📎 세션 기록 1 |
| A4 | 훅을 신뢰한 뒤에는 `AGENTS.md` 없이도 진입한다 | 신뢰 후에도 훅 무시 | 📎 세션 기록 2 |
| A5 | `dist/codex`가 최신이고 남은 토큰이 0이다 | stale 배포본 | 🔒 Tier 0 `build --check`, 잔존 검사 |

## 설치·세션 기록 (2026-11-06, Codex CLI 0.163.0, 기본 모델)

사용자 설정(`~/.codex`)은 건드리지 않았다. scratch `CODEX_HOME`에서 측정했고, 로그인은 사용자가 그 scratch 홈에 직접 했다.

- **설치:** `marketplace add` 후 `plugin add`로 `plugins/cache/orcstack/orcstack/0.0.0/`에 복사됐다. skill 60개, `hooks/`, `.codex-plugin/`이 들어 있다.
- **세션 1, `AGENTS.md`만, 훅 미신뢰:** adopt-orcstack `scaffold`로 만든 저장소에 "장바구니 총액이 항상 1원 적게 나온다. 고쳐줘."를 맡겼다.
  - 캐시의 `orc-mode/SKILL.md`를 읽고 게이트(`adopt.mjs detect`)와 확장 해석(`extensions.mjs resolve`)을 실행했다.
  - `bug-fix` playbook을 열고 재현했다.
  - SSOT가 빈 템플릿이라, 계약 추가를 소유자에게 승인받으려고 멈췄다. 게이트 2단계대로다.
- **훅 신뢰:** Codex TUI의 정식 검토 화면에서 `Source: Plugin - orcstack@orcstack` SessionStart 훅 하나를 신뢰했다. 우회 플래그는 쓰지 않았다.
- **세션 2, `AGENTS.md` 없음, 훅 신뢰 후:** 같은 요청에 `orc-mode`를 적용했다.
  - SSOT가 없는 저장소라 `adopt-orcstack`을 한 번 안내하고 진행했다.
  - 회귀 테스트 3개가 수정 전에 실패하는 것을 확인한 뒤 고쳤고, 수정 후 통과했다.

## 범위 밖

- 설치 문서(README의 하네스별 설치·호출·라우팅 표, 훅 신뢰 절차): M4-4.
- GitHub에서 바로 설치(`codex plugin marketplace add hwangjongtaek/orcstack`): 저장소가 private이라 사용자의 Git 인증이 필요하다. M4-4 문서에 적는다.

## 남은 위험

- 훅은 신뢰 전에는 아무 경고 없이 꺼져 있고, 훅 정의가 바뀌는 릴리스마다 다시 승인해야 한다. 그래서 기본 경로는 `AGENTS.md`다. 훅 문구는 릴리스 사이에 바꾸지 않는다.
- Codex 0.167.0이 나와 있다. 측정은 0.163.0이다. 하네스 드리프트는 Tier 2 설치 스모크(M5-3)가 잡는다.
- 각 경로를 한 번씩만 실행했다.
