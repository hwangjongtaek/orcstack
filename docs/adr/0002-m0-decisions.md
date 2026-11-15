# ADR-0002: M0 스파이크 결과에 따른 결정

- 상태: Accepted
- 날짜: 2026-11-06
- 마일스톤: M1
- 근거: [`docs/spikes/`](../spikes/)

## 맥락

M0 스파이크는 upstream 파생 잔존, 혼용 프레임워크 감지 신호, 네 하네스의 라우팅을 실측했다. 계획 단계의 결정 사항(D1–D5)과 스파이크에서 새로 나온 결정 사항(D6–D10)을 실측 근거와 함께 기록한다.

## 결정

| # | 결정 | 근거 | 재검토 조건 |
|---|---|---|---|
| D1 | `hwangjongtaek/orcstack` private 저장소로 배포한다 | 네 하네스 모두 git URL 설치를 지원해 인증된 git 자격으로 설치된다 | 외부 공개 요구가 생기거나 M5 완료 시 |
| D2 | skill 본문은 영어, 사람용 문서는 한국어 | 파생 skill을 번역하면 sync마다 충돌한다. skill마다 언어가 다르면 한 세션 안에서 지시 언어가 섞인다 | dama 전용 skill의 사용자 피드백에서 언어 문제가 반복될 때 |
| D3 | 자동 라우팅 기본 on, `ORCSTACK_AUTO_ACTIVATE=0`으로 끈다. Claude Code는 SessionStart 훅, Codex는 `AGENTS.md` + 승인된 훅, oh-my-pi·opencode는 `AGENTS.md` | 훅은 Claude Code에서 바로, Codex에서는 신뢰 승인 후 동작했다. 세 하네스 모두 `AGENTS.md`만으로 라우팅됐다 | 하네스가 훅 지원을 바꿀 때 |
| D4 | 기본 모델은 세션 모델 상속 | 하네스마다 제공 모델이 다르다. upstream 기본 slug 33곳은 `model-default`로 치환된다 | 역할별 모델 차이가 품질 차이로 측정될 때 |
| D5 | orcstack 도구는 node ≥ 22·의존성 0, upstream skill 스크립트는 bun 그대로 | upstream `watch-pr`·`statechart`가 bun 전용이다. 옮기면 sync마다 fork가 생긴다 | upstream이 런타임을 바꿀 때 |
| D6 | upstream skill 스크립트는 fork하지 않고, denylist는 `.md`에만 적용한다 | `watch-pr`의 Bugbot 분기 22줄은 Bugbot이 없는 저장소에서 돌지 않는다 | 스크립트 동작이 orcstack 사용자에게 실제 문제를 일으킬 때 |
| D7 | `cursor-team-kit` 의존은 `surface-check` 능력으로 추상화하고, 기본값은 Feature Map + verify skill | orcstack에 없는 다른 Cursor 플러그인에 기댈 수 없다 | 하네스 공용 제품 표면 확인 도구가 생길 때 |
| D8 | `tmux-orchestrator`는 혼용 금지 대상이다 | SDD 문서를 만들고 `plans.md`를 작업 순서의 권위로 쓴다 | 입력이 orcstack work brief로 바뀔 때 |
| D9 | `tdd-workflow`는 켜 두고, 프로젝트 규칙으로 orcstack `tdd`를 우선한다 | 플러그인 단위로만 끌 수 있고, 같은 플러그인의 다른 skill은 도구 성격이다 | 두 skill이 같은 작업에서 충돌한 사례가 나올 때 |
| D10 | Pi 지원 대상은 oh-my-pi다 | 최초 요구사항이 "pi(oh my pi)"다. oh-my-pi는 Claude 마켓플레이스 형식을 읽는다 | upstream pi 사용자가 생길 때 |

## 버린 대안

- **공유 skill 디렉터리 하나로 네 하네스 지원**: `.agents/skills/`를 세 하네스가 읽지만, 도구 이름이 넷 다 다르고 todo·질문 도구 유무가 갈린다. 표기법과 함께 ADR-0003(M1-3)에서 최종 결정한다.
- **Codex 라우팅을 훅에만 의존**: 승인 전에는 훅이 조용히 꺼져 있어 라우팅이 실패한 줄도 모른다.

## 결과

- boilerplate-plan 9절과 이 ADR이 같은 내용을 담는다. 이후 바뀌면 이 ADR을 `Superseded`로 표시하고 새 ADR을 쓴다.
