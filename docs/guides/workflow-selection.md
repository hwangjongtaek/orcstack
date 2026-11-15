# 프로젝트에서 사용할 플러그인 선택

개인 프로젝트는 orcstack, Datamaker 프로젝트는 dstack을 사용한다. 한 프로젝트의 작업에는 하나만 적용한다.

## 프로젝트 선택 기록

프로젝트 루트에 `.workflow-stack.json`을 둔다.

```json
{
  "stack": "orcstack"
}
```

dstack 프로젝트는 값을 `dstack`으로 바꾼다. `WORKFLOW_STACK` 환경 변수가 파일보다 우선한다. 선택 파일은 현재 디렉터리에서 git 루트까지 찾는다. 선택 파일이 없으면 `.orcstack/config.json` 또는 `.dstack/config.json` 하나가 있는 경우 해당 프로젝트의 선택으로 읽는다. 둘 다 있으면 선택을 요청한다.

둘 다 설치되어 선택이 없으면 orcstack의 SessionStart 훅이 사용자에게 선택을 묻도록 지시한다. Codex와 Claude 캐시, opencode와 공용 skill 경로에서 dstack 설치를 탐색한다. 캐시에 남은 비활성 설치도 질문을 유발할 수 있다. 명시적인 프로젝트 선택으로 이를 해소한다.

oh-my-pi와 opencode는 SessionStart 훅을 실행하지 않는다. 프로젝트의 `AGENTS.md`와 `orc-mode`의 선택 규칙을 사용한다. 프로젝트 도입 뒤에는 반드시 생성된 `AGENTS.md`를 유지한다.

## 두 훅의 동시 활성화 방지

기존 dstack 훅은 이 선택 파일을 읽지 않는다. orcstack 훅이 이미 주입된 dstack 지침을 지울 수도 없다. 확실히 하나만 활성화하려면 세션 시작 전에 실행기로 선택한다. 아래 명령은 orcstack 체크아웃에서 실행하는 예시다. 다른 프로젝트에서는 실행기의 절대 경로를 사용한다.

```sh
node tools/session.mjs --stack orcstack -- codex
node tools/session.mjs --stack dstack -- claude
```

실행기는 선택한 이름을 `WORKFLOW_STACK`에 넣고, 선택하지 않은 훅의 자동 활성화를 환경 변수로 끈다. 전역 설정은 수정하지 않는다. 실행기에서 `--stack`과 `WORKFLOW_STACK`이 모두 없으면 시작하지 않고 선택이 필요하다고 알린다.

직접 실행할 때는 같은 환경 변수를 사용한다.

```sh
WORKFLOW_STACK=orcstack DAMA_AUTO_ACTIVATE=0 codex
WORKFLOW_STACK=dstack ORCSTACK_AUTO_ACTIVATE=0 codex
```

Codex 플러그인 훅은 설치 뒤 신뢰 승인이 필요하다. 훅은 `CLAUDE_PLUGIN_ROOT`를 사용하며 Codex도 이 호환 변수를 제공한다. [공식 훅 문서](https://learn.chatgpt.com/docs/hooks#plugin-bundled-hooks)를 기준으로 작성했다.

## 같은 이름의 skill

orcstack 진입점은 `orc-mode`다. `how`, `adr`처럼 두 플러그인에 공통인 skill은 선택한 플러그인의 `skills/` 아래 절대 경로에서 읽는다. 이름만 보고 다른 플러그인의 skill을 선택하지 않는다.
