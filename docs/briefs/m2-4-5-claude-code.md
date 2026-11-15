# Brief: Claude Code 배포물과 end-to-end (M2-4, M2-5)

- SSOT: §3, §4 F1, ADR-0002 D3
- 작업 항목: M2-4, M2-5
- 날짜: 2026-11-06

## 무엇을, 왜

Claude Code에서 orcstack을 설치해 쓸 수 있게 한다. 새 작업은 슬래시 명령 없이도 `orc-mode`를 거쳐 playbook으로 가야 한다(D3, 자동 라우팅 기본 on).

- `harness/hooks/hooks.json`: SessionStart(`startup|clear|compact`) 훅. `ORCSTACK_AUTO_ACTIVATE=0`이면 아무것도 출력하지 않는다. 같은 파일이 Codex 배포본에도 들어간다(Codex는 사용자가 신뢰를 승인한 뒤 동작).
- 루트 `.claude-plugin/marketplace.json`: 마켓플레이스 `orcstack`, 플러그인 `orcstack` → `./dist/claude-code`.
- `orc-mode`의 `disable-model-invocation`을 뺐다. 이 설정이 있으면 훅이 라우팅을 지시해도 모델이 skill을 부를 수 없다. upstream은 거의 모든 skill에 이 설정을 두고 `orc-mode`가 다른 skill을 경로로 읽는다. orcstack은 이 구조를 그대로 두고 진입점 하나만 연다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | 훅이 `orc-mode` 라우팅, 혼용 프레임워크 경고, 끄는 방법을 주입한다 | 훅 없이 설치만 됨 | 🔒 unit(`tests/hooks.test.mjs`) |
| A2 | `ORCSTACK_AUTO_ACTIVATE=0`이면 훅 출력이 없다 | 끌 수 없는 자동 라우팅 | 🔒 unit + 📎 e2e |
| A3 | 마켓플레이스 항목이 빌드된 플러그인과 훅을 가리킨다 | 없는 경로를 가리키는 마켓플레이스 | 🔒 unit |
| A4 | 슬래시 명령 없이 버그·기능·리팩터링 요청이 각각 맞는 playbook으로 간다 | 라우팅 실패 | 📎 e2e(아래) |
| A5 | 가벼운 질문에는 `orc-mode`를 부르지 않는다 | 모든 대화에 무거운 모드 | 📎 e2e(아래) |

## e2e 기록 (2026-11-06, Claude Code 2.1.318, sonnet, `--plugin-dir dist/claude-code`, 빈 저장소)

| 요청 | 훅 | 불린 skill | 연 playbook | 비용 |
|---|---|---|---|---|
| 로그인 500 에러 수정 | 주입됨 | `orcstack:orc-mode` | `bug-fix.md` | $0.115 |
| CSV 내보내기 버튼 추가 | 주입됨 | `orcstack:orc-mode` | `feature.md` | $0.116 |
| 결제 모듈 중복 정리(동작 유지) | 주입됨 | `orcstack:orc-mode` | `refactoring.md` | $0.117 |
| 로그인 500 에러, `ORCSTACK_AUTO_ACTIVATE=0` | 없음 | 없음 | 없음 | $0.066 |
| git rebase와 merge의 차이 | 주입됨 | 없음 | 없음 | $0.067 |

처음 실행에서는 세 요청 모두 `orc-mode` 호출이 `disable-model-invocation` 때문에 거부됐다. 이 설정을 뺀 뒤 위 결과가 나왔다.

## GitHub 마켓플레이스 설치 (머지 후, 2026-11-06)

사용자 설정을 건드리지 않도록 별도 `CLAUDE_CONFIG_DIR`에서 실행했다.

```
$ claude plugin marketplace add hwangjongtaek/orcstack
✔ Successfully added marketplace: orcstack (declared in user settings)
$ claude plugin install orcstack@orcstack
✔ Successfully installed plugin: orcstack@orcstack (scope: user)
$ claude plugin list
❯ orcstack@orcstack  Version: 0.0.0  Scope: user  Status: ✔ enabled
```

설치한 플러그인으로 세션을 열자 SessionStart 훅이 실행됐다. 별도 설정 디렉터리에는 로그인 정보가 없어 모델 호출은 `Not logged in`에서 멈췄다. 라우팅은 같은 `dist/claude-code`로 위 e2e에서 확인했다.

## 남은 위험

- 로그인된 환경에서 마켓플레이스 설치본으로 한 번 더 라우팅을 확인하는 일은 사용자 환경에서 한다. 저장소가 private이라 설치하는 사람의 GitHub 인증이 필요하다.
- 한 번 실행한 결과다. 같은 요청을 반복해 라우팅이 흔들리는지는 Tier 2 nightly 스모크(M5-3) 후보로 넘긴다.
