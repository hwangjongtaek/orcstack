# ADR-0003: 정본은 `{{capability}}` 토큰으로 쓰고, 하네스별로 렌더링한다

- 상태: Accepted
- 날짜: 2026-11-06
- 마일스톤: M1
- 근거: [derive 잔존](../spikes/derive-residue.md), [하네스 실측](../spikes/harness-mapping.md)

## 맥락

upstream skill 본문은 Cursor 도구 이름(`Task`, `AskQuestion`, `generalPurpose` 등)과 경로(`~/.cursor/…`)를 직접 쓴다. orcstack은 이를 네 하네스에 맞게 바꿔야 한다. M0 실측 결과:

- 기계적으로 바꿀 수 있는 곳이 148곳이다.
- 도구 이름이 네 하네스 모두 다르다. subagent 도구만 해도 `Agent` / `spawn_agent` / `task` / `task`다.
- 능력의 유무도 갈린다. todo 도구는 Claude Code와 Codex에 없다. 세션 훅은 oh-my-pi와 opencode에 없다.
- Codex, oh-my-pi, opencode는 `.agents/skills/`를 공통으로 읽는다. 공유 디렉터리 하나로 세 하네스를 지원할 수도 있다.

## 결정

1. **정본(`src/`)은 하네스 능력을 `{{capability}}` 토큰으로 쓴다.** 토큰 이름은 `tools/lib/capabilities.mjs`의 `CAPABILITIES` 목록이 정한다(현재 21개).
2. **하네스마다 `harness/<name>.json`이 모든 토큰의 렌더링을 정한다.** 각 항목은 `render`(본문에 들어갈 영어 구문)와 `native`(하네스 고유 기능인지, 대체 경로인지)를 가진다. 대체 경로는 건너뛰지 않고 실제로 할 일을 적는다(예: todo 도구가 없으면 "a checklist in your reply").
3. **배포본은 하네스별로 렌더링한다.** `.agents/skills/` 공유 디렉터리 하나로 세 하네스를 지원하지 않는다.
4. **빌드 후 남은 토큰은 실패다.** 렌더링 문자열 안에도 토큰을 쓸 수 없다.
5. **모델 시트는 하네스 홈 아래의 일반 파일(`orcstack-models.md`)이다.** 하네스가 자동으로 읽는 규칙 파일이 아니다. skill이 필요할 때 그 경로를 읽는다. 기본값은 세션 모델 상속(ADR-0002 D4)이다.

## 버린 대안

- **고정 영어 구문으로 정본을 쓰고 하네스 차이는 설명으로 처리**: 본문이 네 하네스를 모두 설명해야 한다. 그러면 에이전트가 자기 하네스가 아닌 도구를 호출할 위험이 생긴다. upstream이 Cursor 밖에서 런타임 adapter 문서를 읽히는 방식과 같은 문제다.
- **공유 `.agents/skills/` 하나**: 설치는 단순해진다. 하지만 도구 이름이 다르므로 결국 2의 문제로 돌아간다.
- **런타임 adapter 문서**: 세션마다 토큰을 쓰고, 에이전트가 번역을 빠뜨리거나 잘못 적용할 수 있다.

## 결과

- 🔒 `tests/harness-capabilities.test.mjs`가 다음을 막는다.
  - 하네스 표가 모든 능력을 정의하지 않는 경우
  - 렌더링에 토큰이 들어간 경우
  - substitution이 목록에 없는 토큰을 만드는 경우
- 능력이 늘면 `CAPABILITIES`와 네 하네스 표를 한 PR에서 함께 고친다.
- 렌더링 문구는 첫 판이다. 실제 문장에 넣었을 때 어색한 곳(예: `subagent_type: {{subagent-general}}`처럼 Cursor 인자 이름이 남는 문장)은 M2-2에서 해당 문장을 fork해 고친다.
- `harness/*.json`의 `measured`에 실측한 하네스 버전을 남긴다. 하네스 업데이트로 동작이 바뀌는지는 Tier 2 설치 스모크(M5-3)로 잡는다.

## 재검토 조건

- 네 하네스가 도구 이름을 공통 표준으로 맞추면, 공유 디렉터리 하나로 줄이는 것을 다시 본다.
- 렌더링 때문에 fork해야 하는 문장이 20곳을 넘으면, 토큰을 문장 단위로 바꾸는 방안을 다시 본다.
