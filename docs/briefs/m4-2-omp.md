# Brief: oh-my-pi 배포본과 마켓플레이스 항목

- SSOT: §3, §4 F1
- 작업 항목: M4-2
- 날짜: 2026-11-06

## 무엇을, 왜

oh-my-pi(omp) 사용자가 이 저장소에서 orcstack을 설치하고 `orc-mode`로 라우팅되게 한다. omp는 Claude Code 마켓플레이스 형식을 그대로 읽는다([하네스 실측](../spikes/harness-mapping.md)). 그래서 루트 `.claude-plugin/marketplace.json`에 omp용 도구 이름으로 렌더링한 `orcstack-omp`(`./dist/omp`) 항목을 더한다. omp는 Claude 형식 훅을 실행하지 않으므로, 라우팅은 `AGENTS.md` 블록이 맡는다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | 마켓플레이스에 `orcstack`(`./dist/claude-code`)과 `orcstack-omp`(`./dist/omp`)가 있고, omp 배포본은 omp 도구 이름으로 렌더링돼 있다 | Claude용 도구 이름이 omp에 설치됨 | 🔒 unit(`tests/marketplaces.test.mjs`, red 먼저) |
| A2 | `omp plugin marketplace add <repo>` → `omp plugin install orcstack-omp@orcstack --scope=project`로 설치된다 | 설치 실패 | 📎 설치 기록(아래) |
| A3 | `AGENTS.md` 블록만으로 `orc-mode`에 진입한다 | 라우팅 없음 | 📎 세션 기록(아래) |
| A4 | 측정이 끝나면 사용자 설정이 원래대로다 | 사용자 전역 설정 변경 | 📎 백업과 diff |

## 설치·세션 기록 (2026-11-06, omp 18.15.0, 사용자 기본 모델)

- **준비:** `~/.omp/marketplaces.json`과 `~/.omp/plugins/`의 설정 파일 3개, 디렉터리 목록을 백업했다.
- **설치:** scratch 저장소에서 `marketplace add` 후 `install orcstack-omp@orcstack --scope=project`로 설치했다.
- **세션:** adopt-orcstack `scaffold`로 만든 저장소에 "장바구니 총액이 항상 1원 적게 나온다. 고쳐줘."를 `omp -p`로 맡겼다.
  - `skill://orc-mode`를 읽고 게이트(`adopt.mjs detect`)와 확장 해석(`extensions.mjs resolve`)을 실행했다.
  - `bug-fix` playbook을 열고 원인을 찾았다.
  - SSOT에 계약이 없어 소유자 승인을 요청하고 멈췄다.
- **복원:** `uninstall`, `marketplace remove` 뒤 백업과 diff했다. 차이는 없었다.

## 범위 밖

- omp 사용자 설정에 있는 다른 플러그인: 측정에 쓰지 않았다.
- `install --harness omp`(M3-10 2단계).

## 남은 위험

- Claude Code 사용자도 마켓플레이스 목록에서 `orcstack-omp`를 본다. 설명에 "Claude Code users install `orcstack` instead"를 적었다.
