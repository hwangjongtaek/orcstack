# orcstack 활용하기

orcstack 도입을 마친 프로젝트에서 매일 일하는 팀원을 위한 가이드다. 설치와 도입은 [README 빠른 시작](../../README.md#빠른-시작)에 있다.

orcstack에서 사람이 할 일은 세 가지다.

- 요청한다.
- 에이전트가 물으면 결정한다.
- 결과와 증거를 확인한다.

작업 순서는 `orc-mode`가 정한다.

## 1. 기본 흐름: 그냥 요청한다

슬래시 명령 없이 평소처럼 말하면 된다. 코드나 문서를 바꾸는 요청이면 에이전트가 먼저 `orc-mode`를 불러온다.

```text
주문 목록 화면에 CSV 내보내기 버튼을 추가해줘.
```

에이전트는 이 순서로 움직인다.

1. **게이트:** 다른 워크플로가 섞여 있지 않은지 본다. 이어서 이 변경이 SSOT의 어느 절에서 나왔는지 찾고, brief를 찾거나 쓴다.
2. **프로젝트 확장:** `.orcstack/config.json`에서 이 프로젝트가 끄거나 바꾼 playbook과 skill을 읽는다.
3. **playbook:** 요청에 맞는 playbook을 열고 그 단계를 할 일 목록에 그대로 옮긴다. 여기까지 마쳐야 일을 시작한다.
4. **작업과 증거:** 단계대로 일하고, 무엇으로 확인했는지 남긴다.
5. **PR:** 마지막은 언제나 `opening-a-pr`이다.

질문만 하는 요청("rebase와 merge의 차이는?")은 `orc-mode`를 거치지 않는다. 바로 답한다.

라우팅은 하네스마다 다르게 켜진다.

| 하네스 | 무엇이 `orc-mode`로 보내나 |
|---|---|
| Claude Code | 세션 시작 훅과 `AGENTS.md`의 orcstack 블록 |
| Codex | `AGENTS.md` 블록. 훅은 사람이 TUI에서 신뢰를 승인한 뒤에만 돈다 |
| oh-my-pi, opencode | `AGENTS.md` 블록 |

## 2. 게이트가 멈출 때

게이트는 일부러 멈춘다. 멈춘 이유에 따라 사람이 할 일이 다르다.

| 에이전트가 하는 말 | 뜻 | 할 일 |
|---|---|---|
| 다른 라우터(Superpowers, Spec Kit, `sdd-helper`, pstack `poteto-mode`)가 보인다 | 작업 순서를 정하는 규칙이 둘이다 | 그 플러그인을 끈다. 아직 전환하지 않은 저장소면 `adopt-orcstack`을 실행한다 |
| 다른 프레임워크의 문서가 컷오버 뒤에 생겼다 | 누군가 옛 방식으로 문서를 만들었다 | `docs/archive/`로 옮길지 지울지 정한다. CI guard도 같은 이유로 실패한다 |
| SSOT에 없는 의도가 필요하다. SSOT 수정안을 승인해 달라 | 구현하려는 동작이 제품 의도에 적혀 있지 않다 | SSOT 소유자가 수정안을 승인하거나 고친다. 승인 전에는 구현하지 않는다 |
| brief가 없어서 쓰겠다 | 변경마다 brief가 있어야 한다 | 에이전트가 쓴 brief의 acceptance를 확인한다 |
| `.orcstack/config.json`에 오류가 있다 | 프로젝트 확장 설정이 잘못됐다 | 설정을 고친다. CI guard도 같은 오류로 실패한다 |

SSOT가 없는 저장소에서는 SSOT와 brief 확인을 건너뛴다. 대신 `adopt-orcstack`으로 SSOT를 만들 수 있다고 한 번 알린다. playbook은 그대로 따른다.

## 3. playbook: 작업 유형별 순서

요청의 성격으로 playbook이 정해진다. 자주 쓰는 것은 아래와 같다. 전체 목록은 `orc-mode` 본문의 Playbooks 절에 있다.

| playbook | 이런 요청 | 핵심 순서 |
|---|---|---|
| `bug-fix` | "로그인할 때 500 에러가 난다" | 같은 표면에서 재현해 red를 본다 → 원인을 고친다 → 같은 증거로 green을 본다 → 회귀 guard |
| `feature` | "CSV 내보내기 버튼을 추가해줘" | brief의 acceptance를 먼저 정한다 → 구조와 데이터 모양을 설계한다 → 구현을 맡기고 검토한다 → acceptance 확인 |
| `refactoring` | "중복된 금액 계산을 정리해줘. 동작은 그대로" | 동작을 고정하는 fence를 먼저 둔다 → 구조를 바꾼다 → fence가 그대로 통과 |
| `investigation` | "이 캐시는 왜 이렇게 만들었나" | 읽기만 한다. 근거와 함께 답한다 |
| `perf-issue` | "목록 API가 느리다" | 기준선을 잰다 → 병목을 찾는다 → 같은 조건에서 다시 잰다 |
| `prototype` | "레이아웃 두 가지를 그려 보고 고르자" | 버릴 코드로 빠르게 비교한다. 결정만 남긴다 |
| `multi-phase-plan` | 여러 PR로 나눠야 하는 일 | 단계마다 검증할 수 있는 단위로 쪼갠다 |
| `session-pickup` | "어제 하던 작업 이어서 해줘" | SSOT·brief·ADR을 먼저 읽고, 지난 대화 기록이나 push된 브랜치에서 멈춘 지점을 찾아 이어 간다 |
| `pause-safely` | "여기서 멈추고 나중에 이어 가자" | 안전한 지점에서 멈추고 `wip:` 커밋과 재개 메모를 남긴다 |
| `babysit` | "이 PR 머지 가능하게 만들어줘" | 충돌, 리뷰 스레드, CI를 해결한다 |

여러 날에 걸친 큰 작업이나, 맡겨 두고 나중에 확인할 작업은 맞는 playbook이 있어도 `figure-it-out` skill이 그 작업만의 playbook을 설계한다.

에이전트가 다른 playbook을 골랐다고 생각되면 그대로 말한다. 예: "이건 리팩터링이다. refactoring playbook으로 다시 해줘."

## 4. 기록: 무엇을 어디에 남기나

대화, 계획, 할 일 목록은 사라진다. 팀이 나중에 다시 찾아야 하는 것만 커밋한다.

| 기록 | 언제 | 누가 승인 |
|---|---|---|
| Planning SSOT | 제품 의도가 새로 생기거나 바뀔 때. 구현보다 먼저 고친다 | SSOT 소유자 |
| brief | 변경마다. 참조하는 SSOT 절과 acceptance를 적는다. acceptance마다 영구 guard인지 일회성 증거인지 적는다 | PR 리뷰 |
| ADR | 오래 가거나 되돌리기 비싼 결정. 승인된 ADR은 고치지 않고 새 ADR로 대체한다 | 결정 소유자 |

위치는 기본이 `docs/planning/SSOT.md`, `docs/briefs/`, `docs/adr/`이다. 프로젝트가 이미 쓰던 위치가 있으면 `.orcstack/config.json`의 `records`가 그곳을 가리킨다.

## 5. 검증: "테스트 통과"는 완료가 아니다

- **버그:** 사용자가 겪은 것과 같은 표면에서 실패를 먼저 본다. 고친 뒤 같은 증거가 통과하는지 본다.
- **기능:** brief의 acceptance가 먼저다. 누가 언제 쓰는지, 기대 결과와 금지 결과, 지켜야 할 불변식을 적고 시작한다.
- **리팩터링:** 바꾸기 전에 동작을 고정하는 fence를 둔다.
- **crank와 ratchet:** 설계를 밀어 보려고 먼저 쓴 테스트(crank)는 PR 전에 정리한다. 다음 테스트만 남긴다(ratchet).
  - acceptance를 지키는 테스트
  - 불변식을 지키는 테스트
  - 지난 버그의 재발을 막는 테스트

  에이전트는 무엇을 남기고 무엇을 지웠는지 보고한다.
- 회귀 guard는 가장 낮은 안정 계층에 둔다. 남기지 못하면 이유를 PR에 적는다.

## 6. skill: 직접 부를 때

대부분의 skill은 `orc-mode`가 playbook 안에서 부른다. 필요할 때 직접 불러도 된다.

| 하네스 | 부르는 법 |
|---|---|
| Claude Code | `/orcstack:<skill>`. 예: `/orcstack:work-brief` |
| Codex | `$<skill>` |
| oh-my-pi | `/skill:<skill>` |
| opencode | `skill` 도구, 또는 자연어 |

**orcstack 기록과 품질**

| skill | 언제 |
|---|---|
| `orc-help` | 어떤 skill이나 playbook을 써야 할지 모를 때. 질문과 함께 부른다 |
| `work-brief` | 변경의 brief를 쓰거나 검사할 때 |
| `adr` | 오래 갈 결정을 기록하거나 대체할 때 |
| `test-audit` | 테스트가 제값을 하는지 점검할 때. 지울 테스트를 찾는다 |
| `cold-start-review` | 경계나 구조를 바꾸는 PR을 머지하기 전. 맥락 없는 리뷰어가 저장소만 보고 이해할 수 있는지 본다 |
| `contract-inventory` | 릴리스나 큰 리팩터링 전. SSOT의 계약마다 guard와 증거가 있는지 본다 |
| `ci-tiers` | 저장소에 단계별 CI(Tier 0 구조, Tier 1 계약)가 없을 때 |

**이해하고 설명하기**

| skill | 언제 |
|---|---|
| `how` | "이건 어떻게 동작하나", "이 코드는 어디에 둬야 하나" |
| `why` | "왜 이렇게 만들었나". 근거를 찾아 답한다 |
| `teach` | 작업 결과를 사람이 이해하도록 풀어 설명할 때 |
| `recall` | 최근 작업 맥락을 복원할 때 |

**설계와 검토**

| skill | 언제 |
|---|---|
| `architect` | 코드보다 타입, 시그니처, 모듈 구조를 먼저 잡을 때 |
| `blast-radius` | 변경이 diff 밖에서 무엇을 깨뜨릴 수 있는지 볼 때 |
| `interrogate` | 코드나 계획을 적대적으로 검토할 때 |
| `figure-it-out` | 맞는 playbook이 없는 큰 작업 |
| `tdd` | 테스트부터 쓰자고 명시적으로 요청할 때 |

**글쓰기와 설정**

| skill | 언제 |
|---|---|
| `unslop` | 글에서 AI 티를 걷어낼 때 |
| `technical-writing` | 기술 문서를 쓰거나 검토할 때 |
| `setup-orcstack` | 역할별로 쓸 모델을 정할 때. 정하지 않으면 모든 역할이 세션 모델로 돈다 |

직접 부른 skill에는 프로젝트 확장이 적용되지 않는다. 프로젝트가 확장한 skill은 `orc-mode`를 거쳐야 확장 내용까지 따른다.

## 7. 프로젝트에 맞추기

orcstack 플러그인 파일은 고치지 않는다. 프로젝트의 차이는 `.orcstack/config.json`에 적는다. orcstack을 갱신해도 이 설정은 그대로 남는다.

```json
{
  "version": 1,
  "playbooks": {
    "visual-parity": "off",
    "bug-fix": { "extend": "playbooks/bug-fix.md" },
    "data-migration": { "add": "playbooks/data-migration.md", "when": "A schema or data migration across environments." }
  },
  "skills": {
    "tdd": { "extend": "skills/tdd.md" }
  }
}
```

- `"off"`: 이 프로젝트에서는 없는 것으로 친다.
- `extend`: orcstack 단계 뒤에 프로젝트 단계를 붙인다. 둘이 충돌하면 프로젝트 쪽을 따른다.
- `replace`: playbook만 해당한다. 프로젝트 파일을 대신 연다.
- `add`: 프로젝트 전용 playbook이다. `when`의 문장으로 요청과 맞춘다.
- `orc-mode`와 `adopt-orcstack`은 끄거나 확장할 수 없다. `opening-a-pr` playbook은 끌 수 없다. 다른 프레임워크와 섞지 않는다는 규칙을 지키는 부분이기 때문이다.

설정 파일 경로는 `.orcstack/` 안의 상대 경로다. 자세한 형식은 프로젝트의 `.orcstack/README.md`에 있다. CI의 guard가 이 설정을 검사한다.

## 8. 끄기와 갱신

- **자동 라우팅 끄기:** 환경 변수 `ORCSTACK_AUTO_ACTIVATE=0`. 훅이 `orc-mode`를 권하지 않는다. `AGENTS.md` 블록은 그대로 남는다.
- **플러그인 갱신:** 하네스별 명령은 [README](../../README.md#코딩-에이전트별-세팅)에 있다. 바뀐 내용은 [CHANGELOG](../../CHANGELOG.md)에서 본다.
- **대상 저장소 갱신:** 플러그인 갱신만으로는 저장소의 guard 파일이 바뀌지 않는다. orcstack 체크아웃에서 아래를 실행하고 바뀐 파일을 커밋한다.

  ```bash
  node tools/orcstack.mjs adopt guard --target <프로젝트 경로>
  ```

## 9. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 에이전트가 `orc-mode` 없이 바로 구현한다 | `AGENTS.md`에 orcstack 블록(`<!-- orcstack:begin -->`)이 있는지 본다. Codex는 훅 신뢰를 승인했는지 본다. 그래도 그러면 "orc-mode로 다시 해줘"라고 한다 |
| playbook 단계 없이 일을 시작했다 | 할 일 목록에 playbook 단계가 있는지 묻는다. 반복되면 orcstack 저장소에 알린다. 라우팅 통과율은 Tier 2가 매주 잰다 |
| CI의 `orcstack-guard`가 실패한다 | 로그 마지막 줄을 본다. 다른 프레임워크 문서가 생겼거나 `.orcstack/config.json`에 오류가 있다. 로컬에서 `node .orcstack/check-no-sdd.mjs`로 같은 결과를 본다 |
| 프로젝트 확장이 적용되지 않는다 | skill을 슬래시로 직접 불렀는지 본다. 확장은 `orc-mode`를 거칠 때만 적용된다 |
| 확장 이름 오류가 난다 | orcstack 갱신으로 playbook·skill 이름이 바뀌었을 수 있다. CHANGELOG를 보고 `adopt guard`를 다시 실행한다 |
| `docs/archive/`의 문서를 고치고 싶다 | 동결된 기록이라 고치지 않는다. 아직 유효한 의도는 SSOT로 옮긴다 |

orcstack 자체의 결함은 `hwangjongtaek/orcstack`에 이슈로 남긴다. 재현한 요청과 하네스, orcstack 버전(`VERSION`)을 함께 적는다.
