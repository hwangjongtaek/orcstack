# Brief: Tier 2 nightly

- SSOT: §4 F1, §6 C5 C6
- 작업 항목: M5-3
- 날짜: 2026-11-06

## 무엇을, 왜

설치와 라우팅은 M2-5·M4에서 한 번씩 확인했을 뿐이다. 하네스 CLI는 거의 매일 바뀌고(Claude Code는 실측 2.1.318 다음 날 2.1.319), 모델이 라우팅 지시를 따르는지도 실행마다 다르다. 둘 다 PR 테스트로는 잡히지 않는다. philosophy §4의 Tier 2로 매일 밤, 수동 실행 때, `risk:high` 라벨이 붙은 PR에서 돌린다.

- **check:** `npm run check` 전체.
- **install-smoke (`tests/e2e/install-smoke.mjs`, 모델 호출 없음):**
  - 최신 Claude Code, Codex, oh-my-pi, opencode에 이 checkout을 README대로 설치한다. 하네스마다 버리는 설정 디렉터리(`CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `HOME`)를 쓴다.
  - 확인하는 것: 설치본이 `VERSION`을 보고하는지, `orc-mode`(Claude Code·Codex는 훅도)가 들어 있는지. opencode는 `opencode debug skill`이 `orc-mode`를 orcstack 링크에서 한 번만 보는지 확인한다.
  - CLI 버전이 `harness/*.json`의 `measured`와 다르면 drift로 보고만 한다. 새 하네스 릴리스는 다시 측정할 이유일 뿐, orcstack이 깨졌다는 뜻이 아니다.
- **model-e2e (Claude Code):** `tests/e2e/routing.mjs`(M2-5 기록을 반복: 버그·기능·리팩터링·질문·끄기), `gate.mjs`, `extensions.mjs --case extend|off`.
  - 자격 증명: API 키를 쓰기 어려워 구독 OAuth 토큰(`claude setup-token`)을 `CLAUDE_CODE_OAUTH_TOKEN` secret으로 쓴다(2026-11-06 등록). `ANTHROPIC_API_KEY`도 받는다. 둘 다 없으면 건너뛴다고 적고 통과한다.
  - 구독 사용량 한도를 나눠 쓰므로 매일이 아니라 **주 1회(월 04:00 KST)**, 수동 실행, `risk:high` PR에서만 돈다. 1회는 sonnet 세션 8개, API 환산 약 $1이다.
  - 로컬에서는 로그인된 Claude Code로 `npm run e2e:model`을 돌린다. 설치 스모크는 `npm run e2e:install`이다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | 워크플로가 매일 밤·수동·`risk:high` PR에서 돌고, 모든 push에서는 돌지 않는다. 쓰기 권한이 없다 | 비싼 검사가 모든 PR을 막음 | 🔒 contract `tests/tier2-workflow.test.mjs` |
| A2 | 설치 스모크가 네 하네스 모두에서 버전과 `orc-mode`를 확인하고, `--require`이면 CLI가 없을 때 실패한다 | 설치 방식 drift를 사용자가 먼저 발견 | 📎 로컬 실행 4/4 통과, CI 실행(PR에 `risk:high`) |
| A3 | 사용자의 하네스 설정을 건드리지 않는다 | 스모크가 개인 설정을 바꿈 | 📎 실행 전후 `~/.claude`·`~/.codex`·`~/.omp` 수정 시각이 같다 |
| A4 | model-e2e는 구독 토큰이나 API 키가 없으면 건너뛰고, 있으면 네 스크립트를 모두 돌린 뒤 하나라도 실패하면 실패한다. 예약 실행은 주 1회뿐이다 | 키 없는 저장소에서 매일 빨간 nightly, 구독 한도를 매일 소모 | 🔒 contract |
| A5 | 라우팅 스모크가 M2-5 표의 다섯 경우를 판정한다 | 사람이 다시 손으로 확인 | 📎 로컬 실행 기록(아래) |

## 첫 실행 기록 (2026-11-06, Claude Code 2.1.319, sonnet)

| 경우 | 결과 | 비고 |
|---|---|---|
| 버그 | 통과 | `orc-mode` → `bug-fix.md` |
| 기능 | **실패 (2/2)** | `orc-mode`와 게이트까지 간 뒤 playbook·SSOT 확인 없이 `orders.js`를 바로 고쳤다. M2-5에서는 `feature.md`로 갔다 |
| 리팩터링 | 통과 | `orc-mode` → `refactoring.md` |
| 질문 | 통과 | `orc-mode`를 부르지 않음 |
| 끄기 | 통과 | 훅 없음, `orc-mode`를 부르지 않음 |

처음 실행에서는 세 작업 요청 모두 playbook 전에 멈췄다. 원인은 스크립트였다. 허용 도구에 `Bash(node:*)`가 없어서 게이트 스크립트가 거부됐다. 허용 도구를 고친 뒤 위 결과가 나왔다.

## 범위 밖

- 기능 요청 라우팅 결함의 수정. 별도 작업으로 한다(work-plan M5-5).
- Codex·oh-my-pi·opencode의 유료 라우팅 e2e. 각 하네스의 API 키가 필요하다. 설치 스모크까지만 한다.
- 실제 Superpowers와 함께 띄우는 확인. 릴리스 변경 시와 분기마다 사람이 한다.
- `harness/*.json`의 `measured` 갱신. drift가 보고되면 다시 측정할 때 고친다.

## 남은 위험

- 라우팅 판정은 모델 실행 한 번이다. 같은 경우가 가끔 실패하면 nightly가 깜빡인다. 실패가 반복되면 프롬프트 결함으로 다루고, 한 번이면 기록만 한다.
- 구독 토큰은 개인 구독 한도를 쓰고 유효기간이 있다. 만료되면 `claude setup-token`으로 다시 발급해 같은 이름으로 등록한다. 개인 구독으로 조직 저장소 자동화를 돌리는 것이 계약·약관에 맞는지는 사람이 확인한다.
