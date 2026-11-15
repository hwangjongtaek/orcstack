# ADR-0007: 하네스별 설치는 opencode만 직접 링크하고 나머지는 명령을 보여 준다

- 상태: Accepted
- 날짜: 2026-11-06
- 마일스톤: M4

오래 가거나 위험한 계약에만 쓴다. 테스트 파일마다 쓰지 않는다. 승인된 ADR은 덮어쓰지 않는다. 바뀌면 새 ADR을 쓰고 이 ADR의 상태를 `Superseded`로 바꾼다.

## 맥락

[ADR-0006](0006-agent-adoption-entry.md)은 하네스별 설치(`install`)를 2단계로 미뤘다. M4-2·M4-3에서 네 하네스의 설치 경로를 실측했다.

- Claude Code, Codex, omp는 자기 CLI로 마켓플레이스를 더하고 플러그인을 설치한다. 그 기록은 사람의 사용자 설정(`~/.claude`, `~/.codex`, `~/.omp`)에 남는다.
- opencode는 매니페스트가 없다. skill 디렉터리(`~/.config/opencode/skills/` 등)를 하위까지 읽는다.
- opencode는 `.agents/skills/`도 읽는다. 그런데 이 디렉터리는 Codex와 omp도 읽으므로, opencode 도구 이름으로 렌더링한 skill을 두면 다른 하네스가 다른 이름의 도구를 부르게 된다.

## 결정

1. `tools/orcstack.mjs install --harness <name>`은 기본으로 계획만 낸다.
2. **opencode**는 `--apply`일 때 링크 하나를 만든다: `${XDG_CONFIG_HOME:-~/.config}/opencode/skills/orcstack` → 이 체크아웃의 `dist/opencode/skills`. 갱신은 체크아웃의 `git pull`이다. 다른 곳을 가리키는 링크가 이미 있으면 바꾸지 않고 실패한다. `~/.agents/skills`나 `~/.claude/skills`에 `orc-mode`가 또 있으면 경고한다.
3. **Claude Code·Codex·omp**는 `--apply`여도 명령을 실행하지 않고 보여 준다. 사람의 사용자 설정을 바꾸는 일이라 사람이 실행한다.
4. 라우팅 경로는 하네스마다 결과에 함께 적는다: 훅(Claude Code), 신뢰 승인 뒤의 훅(Codex), `AGENTS.md` 블록(Codex·omp·opencode).

## 버린 대안

- **opencode를 `.agents/skills/`에 설치**: Codex·omp가 opencode용 skill을 읽는다.
- **프로젝트에 skill을 복사해 커밋**(`.opencode/skills/`): skill 60개가 저장소마다 사본으로 남고, orcstack을 갱신할 때마다 커밋이 생긴다.
- **모든 하네스 CLI를 `--apply`로 실행**: 에이전트가 사람의 전역 설정을 바꾸게 된다. `ADOPTING.md`의 금지 사항과 충돌한다.

## 결과

- 🔒 `tests/orcstack-cli.test.mjs`가 다음을 막는다.
  - opencode 링크를 `--apply` 없이 만드는 경우
  - 다른 곳을 가리키는 링크를 덮는 경우
  - 중복 `orc-mode`를 경고하지 않는 경우
  - 다른 하네스 명령을 실행하는 경우
- `ADOPTING.md` 설치 표가 이 명령을 가리킨다.

## 재검토 조건

- opencode가 플러그인 매니페스트나 마켓플레이스를 지원하면, 링크 대신 그 방식을 쓴다.
- 팀원 대부분이 orcstack 체크아웃 없이 opencode를 쓰면, 사용자 범위 복사 설치를 다시 본다.
