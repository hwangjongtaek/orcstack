<div align="center">

<img src="assets/side_cropped.png" alt="orcstack mascot" width="280">

</div>

# orcstack

**오크와 함께, 빠르게 만드는 것보다 제대로 전달하는 엔지니어링.**

orcstack은 개인 프로젝트에서 AI 코딩 에이전트(Claude Code, Codex, oh-my-pi, opencode)와 일하는 방식을 하나로 맞추는 플러그인이다.

- 에이전트는 작업을 받으면 `orc-mode`로 들어가 버그 수정, 기능 개발, 리팩터링 같은 유형에 맞는 playbook을 따른다.
- 변경마다 제품 의도(Planning SSOT)에서 출발하고, 증거를 남기고, 오래 갈 결정과 회귀 방지 장치를 저장소에 커밋한다.

이렇게 하면 에이전트가 무엇을 왜 바꿨는지 사람이 나중에 다시 찾을 수 있다.

> **상태:** 현재 릴리스는 `0.2.0`이며 upstream pstack `0.15.42`를 기준으로 한다. 이번 릴리스의 검증 범위는 [0.2.0 release brief](docs/briefs/release-0-2-0.md)에 기록한다. 설치에는 `hwangjongtaek/orcstack` 저장소 접근 권한이 필요하다. 바뀐 내용은 [CHANGELOG](CHANGELOG.md)에 있다.

## 개인 프로젝트와 회사 프로젝트

개인 프로젝트는 orcstack을 사용한다. Datamaker 프로젝트는 dstack을 유지한다. 두 도구가 함께 설치되면 프로젝트에서 하나를 선택한다. [선택 가이드](docs/guides/workflow-selection.md)에 프로젝트 파일과 세션 실행 방법이 있다.

```sh
node tools/session.mjs --stack orcstack -- codex
```

이 저장소는 `.workflow-stack.json`으로 orcstack을 선택한다. 공유 개선은 [독립 배포 가이드](docs/guides/downstream-updates.md)에 따라 dstack 이름으로 검토 가능한 변경 묶음으로 내보낸다.

원격 게시 전에는 CLI의 marketplace source로 이 체크아웃의 절대 경로를 사용한다. 아래 원격 설치 명령은 저장소를 게시한 뒤 사용할 수 있다.

## 무엇이 달라지나

| 지금까지 | orcstack에서 |
|---|---|
| 에이전트가 요청을 바로 구현한다 | `orc-mode`가 작업 유형을 가르고 playbook 단계를 할 일 목록으로 연다 |
| 의도가 대화와 개인 메모에 흩어진다 | 제품 의도는 SSOT, 변경은 brief, 오래 갈 결정은 ADR로 커밋한다 |
| "테스트 통과"가 완료 기준이다 | 버그는 같은 표면에서 재현해 red를 본 뒤 고친다. 회귀는 가장 낮은 안정 계층에 guard로 남긴다 |
| 다른 워크플로(SDD, Spec Kit, Superpowers)와 섞어 쓴다 | 저장소마다 운영 규칙은 하나다. 다른 라우터가 보이면 멈춘다 |

## 빠른 시작

프로젝트 하나를 orcstack으로 옮기는 가장 짧은 순서다. 각 단계의 자세한 설명은 아래 절과 [ADOPTING.md](ADOPTING.md)에 있다. 예시의 `~/work/my-project`는 전환할 프로젝트 경로다.

**1. 플러그인 설치.** Claude Code 기준이다. 다른 하네스는 [코딩 에이전트별 세팅](#코딩-에이전트별-세팅)을 본다.

```bash
claude plugin marketplace add hwangjongtaek/orcstack
claude plugin install orcstack@orcstack
```

**2. 점검 (권장).** orcstack 저장소를 받아 대상 프로젝트를 점검한다. 읽기만 하고 파일을 바꾸지 않는다. node 22 이상이 필요하다.

```bash
gh repo clone hwangjongtaek/orcstack && cd orcstack
node tools/orcstack.mjs preflight --target ~/work/my-project
```

결과의 `decisions`는 사람이 정할 질문이다. 전환 중에 에이전트가 같은 질문을 하니 답을 미리 준비해 둔다.

| 결정 | 묻는 것 |
|---|---|
| `dirty-tree` | 커밋하지 않은 변경을 먼저 커밋할지, 치워 둘지, 전환에 넣을지 |
| `milestone-boundary` | 어느 마일스톤 경계에서 전환할지. 기존 프레임워크로 진행 중인 작업이 있는지 |
| `ssot` | 어느 파일이 Planning SSOT인지 |
| `routing-lines` | 다른 라우터(pstack `poteto-mode` 등)를 가리키는 지시 줄을 orcstack 경로로 바꿔도 되는지 |
| `pi-harness` | pi 사용자가 oh-my-pi로 옮길지. orcstack은 upstream pi를 지원하지 않는다 |
| `ignored-docs` | git이 무시하는 로컬 SDD 문서 중 SSOT로 옮길 의도가 있는지. 이 문서들은 커밋하지 않는다 |

**3. 전환.** 대상 프로젝트에서 새 브랜치를 만들고 에이전트에게 시킨다.

```text
/orcstack:adopt-orcstack
```

- Codex에서는 `$adopt-orcstack`이다.
- 플러그인 없이 하려면 에이전트에게 orcstack 저장소를 주고 "ADOPTING.md를 따라 ~/work/my-project를 orcstack으로 전환해줘"라고 한다.
- 에이전트는 파일을 옮기기 전, SSOT에 의도를 넣기 전, 라우팅 줄을 바꾸기 전, push·PR 전에 멈추고 묻는다.

**4. 확인과 머지.**

```bash
node tools/orcstack.mjs verify --target ~/work/my-project
```

`"ok": true`가 나오면 컷오버 PR을 머지한다. `awaiting`에 남은 항목은 아직 승인하지 않은 결정이다. 그동안 대상 저장소의 CI guard는 실패한다.

**5. 팀 설치와 갱신.** 팀원은 1번 명령으로 각자 설치한다. 새 버전 적용과 대상 프로젝트 파일 반영은 [orcstack 업데이트](#orcstack-업데이트)를 따른다.

## 코딩 에이전트별 세팅

공통 준비: `hwangjongtaek/orcstack` 읽기 권한과, 그 계정으로 된 Git 로그인(`gh auth login` 또는 SSH 키)이 필요하다. 하네스가 비공개 저장소를 받아 올 때 이 로그인을 쓴다.

### orcstack 업데이트

먼저 사용하는 하네스의 설치본을 업데이트한다.

| 하네스 | 실행 위치 | 명령 | 마무리 |
|---|---|---|---|
| Claude Code | 어느 디렉터리에서나 | `claude plugin marketplace update orcstack`<br>`claude plugin update orcstack@orcstack` | 두 명령 뒤 Claude Code 재시작 |
| Codex | 어느 디렉터리에서나 | `codex plugin marketplace upgrade`<br>`codex plugin add orcstack@orcstack` | 설치본이 복사본이므로 두 번째 명령으로 다시 설치 |
| oh-my-pi | orcstack을 프로젝트 범위로 설치한 대상 프로젝트 디렉터리 | `omp plugin upgrade` | 없음 |
| opencode | 클론한 orcstack 저장소 | `git pull` | 기존 `~/.config/opencode/skills/orcstack` 링크는 같은 `dist/opencode/skills`를 가리키므로 다시 만들 필요 없음 |

그다음 최신 orcstack 저장소에서 대상 프로젝트 파일을 반영하고 커밋한다. 플러그인 설치본 업데이트만으로는 프로젝트에 커밋된 guard와 이름 목록이 바뀌지 않는다.

```bash
node tools/orcstack.mjs adopt guard --target ~/work/my-project
```

`setup-orcstack`은 역할별 모델 사용자 설정이며 플러그인 업데이트와 별개다.

### 역할별 모델 설정

`setup-orcstack`은 실행 중인 하네스가 선택할 수 있는 모델만 그 하네스의 사용자 파일에 기록한다. 한 파일을 다른 하네스로 복사하지 않는다.

| 하네스 | 호출 | 설정 파일 | 모델 확인 |
|---|---|---|---|
| Claude Code | `/orcstack:setup-orcstack` | `~/.claude/orcstack-models.md` | Claude Code 모델 카탈로그와 `Agent`가 받는 식별자 |
| Codex | `$setup-orcstack` | `~/.codex/orcstack-models.md` | `codex debug models`와 `spawn_agent`가 받는 식별자 |
| oh-my-pi | `/skill:setup-orcstack` | `~/.omp/agent/orcstack-models.md` | `omp models --json`과 `task`가 받는 식별자 |

설정은 `unlimited`, `large`, `medium`, `small` 추론 예산과 역할별 모델을 함께 저장한다. 다시 실행하면 현재 선택을 읽고 유효하지 않은 모델만 바꾼다.

### Claude Code

```bash
claude plugin marketplace add hwangjongtaek/orcstack
claude plugin install orcstack@orcstack
```

- **호출:** `/orcstack:orc-mode`. 보통은 부를 필요가 없다. 세션 시작 훅이 코드나 문서를 바꾸는 작업이면 `orc-mode`를 먼저 불러오라고 알린다.
- **끄기:** 환경 변수 `ORCSTACK_AUTO_ACTIVATE=0`.
- **제거:** `claude plugin uninstall orcstack@orcstack`.

### Codex

```bash
codex plugin marketplace add hwangjongtaek/orcstack
codex plugin add orcstack@orcstack
```

- **호출:** `$orc-mode`, 또는 자연어.
- **라우팅:** 프로젝트 `AGENTS.md`의 orcstack 블록이 기본 경로다. 블록은 아래 "프로젝트에 도입하기"에서 생긴다.
- **훅(선택):** Codex는 플러그인 훅을 사람이 한 번 신뢰해야 실행한다. **신뢰하기 전에는 아무 경고 없이 꺼져 있다.**
  1. 프로젝트에서 `codex`를 대화형으로 연다.
  2. "Hooks need review"가 뜨면 **Review hooks**를 고른다.
  3. `SessionStart`에서 출처가 `Plugin - orcstack@orcstack`인 훅을 확인하고 `t`로 신뢰한다.
  - orcstack이 훅을 바꾸는 릴리스를 내면 다시 신뢰해야 한다.
- **제거:** `codex plugin remove orcstack@orcstack`.

### oh-my-pi

프로젝트 디렉터리에서 실행한다.

```bash
omp plugin marketplace add hwangjongtaek/orcstack
omp plugin install orcstack-omp@orcstack --scope=project
```

- `orcstack-omp`는 omp 도구 이름으로 만든 빌드다. Claude Code용 `orcstack`을 설치하지 않는다.
- **호출:** `/skill:orc-mode`, 또는 자연어.
- **라우팅:** omp는 훅을 실행하지 않는다. 프로젝트 `AGENTS.md`의 orcstack 블록이 라우팅한다.
- **제거:** `omp plugin uninstall orcstack-omp@orcstack`.

### opencode

opencode에는 플러그인 마켓플레이스가 없다. orcstack 저장소를 받아 두고, opencode의 skill 디렉터리에서 그 빌드로 링크를 건다.

```bash
git clone git@github.com:hwangjongtaek/orcstack.git ~/src/orcstack
cd ~/src/orcstack
node tools/orcstack.mjs install --harness opencode           # 무엇을 할지 보여 준다
node tools/orcstack.mjs install --harness opencode --apply   # 링크를 만든다
```

- **링크:** `~/.config/opencode/skills/orcstack`가 `dist/opencode/skills`를 가리킨다. `~/.agents/skills`나 `~/.claude/skills`에 `orc-mode`가 또 있으면 경고한다. opencode가 그 디렉터리들도 읽어서 두 벌이 보이기 때문이다.
- **호출:** `skill` 도구, 또는 자연어.
- **라우팅:** opencode에는 훅이 없다. 프로젝트 `AGENTS.md`의 orcstack 블록이 라우팅한다.
- **모델:** 강한 모델을 권장한다. 무료 경량 모델은 게이트 단계를 건너뛴 기록이 있다.
- **제거:** 링크 `~/.config/opencode/skills/orcstack`를 지운다.

다른 하네스도 `node tools/orcstack.mjs install --harness <claude-code|codex|omp>`로 위 명령을 다시 볼 수 있다. 이 도구는 Claude Code·Codex·omp의 명령을 직접 실행하지 않는다. 사용자 설정을 바꾸는 명령이라 사람이 실행한다.

## 프로젝트에 도입하기

플러그인을 설치한 것만으로는 프로젝트가 orcstack-governed가 되지 않는다. 프로젝트마다 한 번 전환한다.

1. **전환.** 에이전트에게 `/adopt-orcstack`(Claude Code: `/orcstack:adopt-orcstack`)을 시킨다.
   - 기존 SDD·Spec Kit·Superpowers 문서를 `docs/archive/`에 동결하고, 제품 의도를 SSOT로 옮기고, 그 플러그인을 끈다.
   - 끝나면 컷오버 brief·ADR, `AGENTS.md`의 orcstack 블록, CI guard가 생긴다.
   - 플러그인 없이 진행하려면 에이전트에게 이 저장소와 [ADOPTING.md](ADOPTING.md)를 주면 된다.
2. **맞춤.** 맞지 않는 playbook이나 skill은 `.orcstack/config.json`에서 끄거나 확장한다. 이미 쓰는 SSOT·ADR·brief 위치는 같은 파일의 `records`에 적는다. orcstack 플러그인 파일은 고치지 않는다.
3. **CI.** `/ci-tiers`로 Tier 0(구조)·Tier 1(계약) 워크플로를 만들고, 로컬과 CI가 같은 명령 하나를 쓰게 한다.

`AGENTS.md`를 어떻게 쓰면 좋은지는 [AGENTS.md 가이드](docs/guides/agents-md.md)에 있다.

### 첫 작업

```text
로그인할 때 500 에러가 난다. 고쳐줘.
```

에이전트는 이 요청을 이렇게 처리한다.

1. `orc-mode`가 다른 워크플로가 섞여 있지 않은지 확인한다.
2. SSOT에서 이 변경이 어느 절에 해당하는지 찾고, brief를 쓰거나 찾는다.
3. Bug fix playbook을 연다. 같은 표면에서 실패를 재현해 red를 본 뒤 원인을 고치고, 같은 증거가 green이 되는지 확인한다.
4. 회귀 guard를 남기거나, 남기지 못하면 이유를 PR에 적는다.

SSOT에 없는 의도가 필요하면 구현 전에 SSOT 소유자의 승인을 묻는다.

게이트가 멈출 때 할 일, 작업 유형별 playbook, 직접 부를 만한 skill은 [orcstack 활용하기](docs/guides/using-orcstack.md)에 있다.

## 알려진 격차

| 하네스 | 격차 |
|---|---|
| Codex | 훅은 사람이 신뢰를 승인한 뒤에만 돈다. 승인 전에는 `AGENTS.md`만 라우팅한다 |
| oh-my-pi | 훅이 없다. 대화형이 아닌 실행(`-p`)에서는 질문 도구가 빠진다 |
| opencode | 마켓플레이스가 없어 저장소 클론과 링크로 설치한다. 질문 도구는 TUI에서만 있다 |
| 공통 | 슬래시로 직접 부른 skill에는 프로젝트 확장(`.orcstack/config.json`)이 적용되지 않는다. `orc-mode`를 거칠 때 적용된다 |

## 더 알아보기

- [orcstack 활용하기](docs/guides/using-orcstack.md): 도입 뒤 매일 쓰는 법. 요청, 게이트, playbook, 기록, skill, 프로젝트 맞춤, 문제 해결
- [운영 철학](docs/philosophy.md): 지식 보존, TDD 래칫, CI 정책
- [ADOPTING.md](ADOPTING.md): 에이전트가 프로젝트를 전환할 때 따르는 순서
- [AGENTS.md 가이드](docs/guides/agents-md.md): orcstack 프로젝트의 `AGENTS.md` 구조
- [하네스 실측 결과](docs/spikes/harness-mapping.md): 네 하네스의 도구·훅·설치 차이
- [upstream sync 운영](docs/guides/upstream-sync.md): 주간 sync PR을 받고 충돌을 푸는 법(orcstack 관리자용)
- [릴리스](docs/guides/release.md): 버전을 올리고 태그를 내는 절차(orcstack 관리자용)
- [Planning SSOT](docs/planning/SSOT.md), [ADR](docs/adr/), [작업 계획](docs/work-plan.md): orcstack 자체의 의도, 결정, 진행 상황

## 출처

운영 원칙의 배경은 [원본 위키 글](https://wiki.orchwang.dev/2026/11/03/tdd-ratchet-lightweight-ci-pstack.html)에서 볼 수 있다. orcstack 문서에서는 위키 원본 링크를 자유롭게 포함한다.

orcstack은 [Poteto Stack (pstack)](https://github.com/cursor/plugins/tree/main/pstack)을 orcstack에 맞게 옮긴 것이다. pstack은 Lauren Tan([@poteto](https://github.com/poteto))의 프로젝트이고 MIT 라이선스다. 작업 분류와 검증 중심 접근은 pstack에서 왔다. TDD 래칫, 비용을 고려한 CI, 지식 보존 원칙, 프로젝트 전환 도구는 orcstack이 더했다. 자세한 내용은 [LICENSE](LICENSE)와 [NOTICE.md](NOTICE.md)에 있다.
